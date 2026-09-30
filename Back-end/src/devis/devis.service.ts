import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { ProformaService } from '../proforma/proforma.service';
import { snapshotProforma } from './devis-offer';
import { validerLignePrix } from '../pricing/pricing.util';
import {
  CreateDemandeDevisDto,
  RepondreDevisDto,
  ResolveDevisDto,
  ClarifierDevisDto,
  AffecterDevisDto,
  PreparerDevisDto,
} from './dto/devis.dto';

type Actor = { id: string; role: string };
const productSelect = {
  id: true,
  nomProduit: true,
  marque: true,
  code: true,
  codeFamille: true,
  quantiteStock: true,
  prixDetail: true,
  imageUrl: true,
} as const;
const readSelect = {
  id: true,
  nomClient: true,
  telephone: true,
  modeReception: true,
  destination: true,
  notes: true,
  statut: true,
  reponseClient: true,
  commande: { select: { id: true, numeroSuivi: true, statut: true } },
  numeroCommande: true,
  acceptedVersion: true,
  acceptedAt: true,
  offre: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  lignes: {
    orderBy: { ordre: 'asc' as const },
    select: {
      id: true,
      reference: true,
      quantite: true,
      produitId: true,
      nomProduit: true,
      ordre: true,
    },
  },
} as const;

@Injectable()
export class DevisService {
  constructor(
    private readonly db: DatabaseService,
    private readonly proformas: ProformaService,
  ) {}

  private validateLines(dto: ResolveDevisDto) {
    if (
      !Array.isArray(dto.lignes) ||
      dto.lignes.length < 1 ||
      dto.lignes.length > 50 ||
      dto.lignes.some(
        (line) =>
          !line.reference?.trim() ||
          line.reference.trim().length > 100 ||
          !Number.isSafeInteger(line.quantite) ||
          line.quantite < 1 ||
          line.quantite > 100000,
      )
    ) {
      throw new BadRequestException(
        'Indiquez de 1 à 50 références avec des quantités entières de 1 à 100000.',
      );
    }
  }

  private clientView(row: any) {
    const result = Object.fromEntries(
      Object.keys(readSelect).map((key) => [key, row[key]]),
    );
    const expiration = row.offre?.dateExpiration;
    if (
      row.statut === 'ENVOYEE' &&
      expiration &&
      new Date(expiration).getTime() <= Date.now()
    )
      result.statut = 'EXPIREE';
    return result;
  }

  async resolve(dto: ResolveDevisDto) {
    this.validateLines(dto);
    const rows: any[] = new Array(dto.lignes.length);
    let index = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, dto.lignes.length) }, async () => {
        while (index < dto.lignes.length) {
          const i = index++;
          const line = dto.lignes[i];
          const reference = line.reference.trim();
          const exact = await this.db.produit.findMany({
            where: {
              estActif: true,
              OR: [
                { code: { equals: reference, mode: 'insensitive' } },
                { nomProduit: { equals: reference, mode: 'insensitive' } },
              ],
            },
            select: productSelect,
            take: 8,
            orderBy: [{ nomProduit: 'asc' }, { id: 'asc' }],
          });
          const candidates = exact.length
            ? exact
            : await this.db.produit.findMany({
                where: {
                  estActif: true,
                  OR: [
                    { code: { contains: reference, mode: 'insensitive' } },
                    {
                      nomProduit: { contains: reference, mode: 'insensitive' },
                    },
                  ],
                },
                select: productSelect,
                take: 8,
                orderBy: [{ nomProduit: 'asc' }, { id: 'asc' }],
              });
          rows[i] = {
            reference,
            quantite: line.quantite,
            match:
              exact.length === 1
                ? 'exact'
                : candidates.length
                  ? 'ambiguous'
                  : 'unknown',
            candidates,
          };
        }
      }),
    );
    return { lignes: rows };
  }

  async create(clientId: string, dto: CreateDemandeDevisDto) {
    this.validateLines(dto);
    const input = {
      clientId,
      telephone: dto.telephone.trim(),
      modeReception: dto.modeReception,
      destination:
        dto.modeReception === 'LIVRAISON'
          ? dto.destination?.trim() || null
          : null,
      notes: dto.notes?.trim() || null,
      lignes: dto.lignes.map((line) => ({
        reference: line.reference.trim(),
        quantite: line.quantite,
        produitId: line.produitId || null,
      })),
    };
    if (input.modeReception === 'LIVRAISON' && !input.destination)
      throw new BadRequestException('Indiquez la destination de livraison.');
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    const replay = (row: any) => {
      if (row.clientId !== clientId || row.fingerprint !== fingerprint)
        throw new ConflictException(
          'Cette tentative est incompatible. Reprenez la demande initiale.',
        );
      return this.clientView(row);
    };
    try {
      return await this.db.$transaction(
        async (tx) => {
          const existing = await tx.demandeDevis.findUnique({
            where: { requestId: dto.requestId },
            include: { lignes: { orderBy: { ordre: 'asc' } } },
          });
          if (existing) return replay(existing);
          const client = await tx.client.findUnique({
            where: { id: clientId },
            select: { nom: true, prenom: true },
          });
          if (!client)
            throw new NotFoundException('Compte client introuvable.');
          const ids = [
            ...new Set(
              input.lignes
                .map((line) => line.produitId)
                .filter((id): id is string => Boolean(id)),
            ),
          ];
          const products = await tx.produit.findMany({
            where: { id: { in: ids }, estActif: true },
            select: { id: true, nomProduit: true },
          });
          if (products.length !== ids.length)
            throw new ConflictException(
              'Une référence sélectionnée a quitté le catalogue. Vérifiez votre liste.',
            );
          const byId = new Map(
            products.map((product) => [product.id, product.nomProduit]),
          );
          const row = await tx.demandeDevis.create({
            data: {
              requestId: dto.requestId,
              fingerprint,
              clientId,
              nomClient: [client.nom, client.prenom]
                .filter(Boolean)
                .join(' ')
                .slice(0, 150),
              telephone: input.telephone,
              modeReception: input.modeReception,
              destination: input.destination,
              notes: input.notes,
              lignes: {
                create: input.lignes.map((line, ordre) => ({
                  ...line,
                  ordre,
                  nomProduit: line.produitId ? byId.get(line.produitId) : null,
                })),
              },
              historique: {
                create: {
                  acteurId: clientId,
                  acteurType: 'CLIENT',
                  statut: 'RECUE',
                  details: { action: 'CREATION' },
                },
              },
            },
            select: readSelect,
          });
          return this.clientView(row);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existing = await this.db.demandeDevis.findUnique({
          where: { requestId: dto.requestId },
          include: { lignes: { orderBy: { ordre: 'asc' } } },
        });
        if (existing) return replay(existing);
      }
      if (error.code === 'P2034')
        throw new ConflictException(
          'La demande a changé pendant l’enregistrement. Reprenez la même tentative.',
        );
      throw error;
    }
  }

  async findMine(clientId: string) {
    const rows = await this.db.demandeDevis.findMany({
      where: { clientId },
      select: readSelect,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.clientView(row));
  }

  async findMineOne(clientId: string, id: string) {
    const row = await this.db.demandeDevis.findFirst({
      where: { id, clientId },
      select: readSelect,
    });
    if (!row) throw new NotFoundException('Demande de devis introuvable.');
    return this.clientView(row);
  }

  async findForAdmin(actor: Actor) {
    const rows = await this.db.demandeDevis.findMany({
      where:
        actor.role === 'VENDEUR'
          ? { OR: [{ responsableId: actor.id }, { responsableId: null }] }
          : {},
      select: {
        ...readSelect,
        clientId: true,
        proformaId: true,
        responsable: { select: { id: true, nom: true } },
        historique: {
          orderBy: { createdAt: 'asc' },
          select: {
            acteurId: true,
            acteurType: true,
            statut: true,
            details: true,
            createdAt: true,
          },
        },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      ...this.clientView(row),
      clientId: row.clientId,
      proformaId: row.proformaId,
      responsable: row.responsable,
      historique: row.historique,
    }));
  }

  async findResponsables() {
    return this.db.adminUser.findMany({
      where: {
        isActive: true,
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'VENDEUR'] },
      },
      select: { id: true, nom: true, role: true },
      orderBy: [{ nom: 'asc' }, { id: 'asc' }],
    });
  }

  async prepare(actor: Actor, id: string, dto: PreparerDevisDto) {
    if (!['SUPER_ADMIN', 'ADMIN', 'VENDEUR'].includes(actor.role))
      throw new ForbiddenException('Accès refusé.');
    try {
      return await this.db.$transaction(
        async (tx) => {
          // Serialize creation and make the durable event the recovery receipt.
          await tx.$queryRaw`SELECT id FROM demande_devis WHERE id = ${id} FOR UPDATE`;
          const current = await tx.demandeDevis.findUnique({
            where: { id },
            include: { lignes: { orderBy: { ordre: 'asc' } } },
          });
          if (!current) throw new NotFoundException('Demande introuvable.');
          if (current.responsableId !== actor.id)
            throw new ForbiddenException(
              'Affectez-vous la demande avant de préparer sa proforma.',
            );
          if (current.version !== dto.version)
            throw new ConflictException('La demande a changé. Actualisez-la.');
          if (!['RECUE', 'A_PRECISER'].includes(current.statut))
            throw new ConflictException(
              'Une proposition est déjà publiée ou cette demande est terminée.',
            );
          const receipt = await tx.demandeDevisEvent.findFirst({
            where: {
              demandeId: id,
              details: { path: ['preparationVersion'], equals: dto.version },
            },
            orderBy: { createdAt: 'desc' },
          });
          if (receipt) {
            const details = receipt.details as any;
            const existing = await tx.proforma.findUnique({
              where: { id: details.proformaId },
              include: { lignes: true },
            });
            if (
              !existing ||
              existing.vendeurId !== actor.id ||
              existing.clientId !== current.clientId ||
              existing.statut !== 'EN_COURS' ||
              existing.dateExpiration.getTime() <= Date.now()
            )
              throw new ConflictException(
                'La proforma préparée n’est plus disponible. Vérifiez son historique avant de poursuivre.',
              );
            return { proforma: existing, reprise: true };
          }
          if (
            !current.lignes.length ||
            current.lignes.some((line) => !line.produitId)
          )
            throw new BadRequestException(
              'Clarifiez les références inconnues avant de préparer la proforma.',
            );
          const ids = current.lignes.map((line) => line.produitId!);
          if (new Set(ids).size !== ids.length)
            throw new BadRequestException(
              'Regroupez les références répétées avant la préparation.',
            );
          const products = await tx.produit.findMany({
            where: { id: { in: ids }, estActif: true },
            select: { id: true, prixDetail: true },
          });
          const prices = new Map(
            products.map((product) => [product.id, product.prixDetail]),
          );
          if (
            products.length !== ids.length ||
            products.some(
              (product) =>
                product.prixDetail == null ||
                !Number.isFinite(Number(product.prixDetail)) ||
                Number(product.prixDetail) <= 0,
            )
          )
            throw new BadRequestException(
              'Une référence ou son prix catalogue n’est plus disponible.',
            );
          await tx.demandeDevis.updateMany({
            where: {
              id,
              version: dto.version,
              responsableId: actor.id,
              statut: current.statut,
            },
            data: { updatedAt: new Date() },
          });
          const proforma = await this.proformas.create(
            actor.id,
            {
              clientId: current.clientId,
              clientNom: current.nomClient,
              notes:
                current.modeReception === 'LIVRAISON'
                  ? 'Livraison demandée. Frais et délai à confirmer. Disponibilité à vérifier avant acceptation.'
                  : 'Retrait à Akwa. Disponibilité à vérifier avant acceptation.',
              lignes: current.lignes.map((line) => ({
                produitId: line.produitId!,
                quantite: line.quantite,
                prixUnitaire: Number(prices.get(line.produitId!)),
              })),
            },
            tx,
          );
          await tx.demandeDevisEvent.create({
            data: {
              demandeId: id,
              acteurId: actor.id,
              acteurType: 'ADMIN',
              statut: current.statut,
              details: {
                action: 'PROFORMA_PREPAREE',
                preparationVersion: dto.version,
                proformaId: proforma.id,
              },
            },
          });
          return { proforma, reprise: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: any) {
      if (
        error.code === 'P2034' ||
        (error.code === 'P2010' &&
          (error.meta?.code === '40001' ||
            error.meta?.driverAdapterError?.cause?.originalCode === '40001'))
      )
        throw new ConflictException(
          'La demande a changé. Actualisez-la puis reprenez la préparation.',
        );
      throw error;
    }
  }

  async assign(actor: Actor, id: string, dto: AffecterDevisDto) {
    try {
      return await this.db.$transaction(
        async (tx) => {
          const current = await tx.demandeDevis.findUnique({ where: { id } });
          if (!current)
            throw new NotFoundException('Demande de devis introuvable.');
          if (current.version !== dto.version)
            throw new ConflictException('La demande a changé. Actualisez-la.');
          if (['ACCEPTEE', 'REFUSEE'].includes(current.statut))
            throw new ConflictException('Cette demande est terminée.');
          if (actor.role === 'VENDEUR') {
            if (dto.responsableId !== actor.id || current.responsableId)
              throw new ForbiddenException(
                'Seule une demande libre peut être prise par ce vendeur.',
              );
          } else if (!['SUPER_ADMIN', 'ADMIN'].includes(actor.role)) {
            throw new ForbiddenException('Accès refusé.');
          }
          if (dto.responsableId) {
            const responsible = await tx.adminUser.findUnique({
              where: { id: dto.responsableId },
              select: { id: true, isActive: true, role: true },
            });
            if (
              !responsible?.isActive ||
              !['SUPER_ADMIN', 'ADMIN', 'VENDEUR'].includes(responsible.role)
            )
              throw new BadRequestException(
                'Choisissez un responsable actif autorisé à traiter les devis.',
              );
          }
          if (current.responsableId === dto.responsableId)
            throw new ConflictException(
              'Cette affectation est déjà enregistrée.',
            );
          const updated = await tx.demandeDevis.updateMany({
            where: {
              id,
              version: dto.version,
              responsableId: current.responsableId,
              statut: current.statut,
            },
            data: {
              responsableId: dto.responsableId,
              // A sent offer is authorized for its exact commercial version.
              // Reassignment must not invalidate that authorization.
              ...(current.statut === 'ENVOYEE'
                ? {}
                : { version: { increment: 1 } }),
            },
          });
          if (updated.count !== 1)
            throw new ConflictException('La demande a changé. Actualisez-la.');
          await tx.demandeDevisEvent.create({
            data: {
              demandeId: id,
              acteurId: actor.id,
              acteurType: 'ADMIN',
              statut: current.statut,
              details: {
                action: 'AFFECTATION',
                ancienResponsableId: current.responsableId,
                nouveauResponsableId: dto.responsableId,
                versionPrecedente: dto.version,
              },
            },
          });
          return tx.demandeDevis.findUniqueOrThrow({
            where: { id },
            select: {
              id: true,
              version: true,
              responsable: { select: { id: true, nom: true } },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: any) {
      if (error.code === 'P2034')
        throw new ConflictException('La demande a changé. Actualisez-la.');
      throw error;
    }
  }

  async clarify(clientId: string, id: string, dto: ClarifierDevisDto) {
    this.validateLines(dto);
    const input = {
      telephone: dto.telephone.trim(),
      modeReception: dto.modeReception,
      destination:
        dto.modeReception === 'LIVRAISON'
          ? dto.destination?.trim() || null
          : null,
      notes: dto.notes?.trim() || null,
      lignes: dto.lignes.map((line) => ({
        reference: line.reference.trim(),
        quantite: line.quantite,
        produitId: line.produitId || null,
      })),
    };
    if (input.modeReception === 'LIVRAISON' && !input.destination)
      throw new BadRequestException('Indiquez la destination de livraison.');
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ clientId, version: dto.version, ...input }))
      .digest('hex');
    try {
      return await this.db.$transaction(
        async (tx) => {
          const current = await tx.demandeDevis.findFirst({
            where: { id, clientId },
            include: { lignes: { orderBy: { ordre: 'asc' } } },
          });
          if (!current)
            throw new NotFoundException('Demande de devis introuvable.');
          const replay = await tx.demandeDevisEvent.findFirst({
            where: {
              demandeId: id,
              acteurId: clientId,
              acteurType: 'CLIENT',
              details: { path: ['requestId'], equals: dto.requestId },
            },
          });
          if (replay) {
            if ((replay.details as any)?.fingerprint !== fingerprint)
              throw new ConflictException(
                'Cette tentative est incompatible. Reprenez la précision initiale.',
              );
            return this.clientView(
              await tx.demandeDevis.findUniqueOrThrow({
                where: { id },
                select: readSelect,
              }),
            );
          }
          if (
            current.statut !== 'A_PRECISER' ||
            current.version !== dto.version
          )
            throw new ConflictException(
              'La demande a changé ou ne peut plus être précisée. Actualisez-la.',
            );
          const ids = [
            ...new Set(
              input.lignes
                .map((line) => line.produitId)
                .filter((value): value is string => Boolean(value)),
            ),
          ];
          const products = await tx.produit.findMany({
            where: { id: { in: ids }, estActif: true },
            select: { id: true, nomProduit: true },
          });
          if (products.length !== ids.length)
            throw new ConflictException(
              'Une référence sélectionnée a quitté le catalogue. Vérifiez votre liste.',
            );
          const byId = new Map(
            products.map((product) => [product.id, product.nomProduit]),
          );
          const updated = await tx.demandeDevis.updateMany({
            where: { id, clientId, version: dto.version, statut: 'A_PRECISER' },
            data: {
              telephone: input.telephone,
              modeReception: input.modeReception,
              destination: input.destination,
              notes: input.notes,
              statut: 'RECUE',
              offre: Prisma.DbNull,
              proformaId: null,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1)
            throw new ConflictException('La demande a changé. Actualisez-la.');
          await tx.demandeDevisLigne.deleteMany({ where: { demandeId: id } });
          await tx.demandeDevisLigne.createMany({
            data: input.lignes.map((line, ordre) => ({
              ...line,
              demandeId: id,
              ordre,
              nomProduit: line.produitId ? byId.get(line.produitId) : null,
            })),
          });
          await tx.demandeDevisEvent.create({
            data: {
              demandeId: id,
              acteurId: clientId,
              acteurType: 'CLIENT',
              statut: 'RECUE',
              details: {
                action: 'CLARIFICATION',
                requestId: dto.requestId,
                fingerprint,
                versionPrecedente: dto.version,
                lignesPrecedentes: current.lignes.map((line) => ({
                  reference: line.reference,
                  quantite: line.quantite,
                  produitId: line.produitId,
                  nomProduit: line.nomProduit,
                })),
                lignesTransmises: input.lignes,
              },
            },
          });
          return this.clientView(
            await tx.demandeDevis.findUniqueOrThrow({
              where: { id },
              select: readSelect,
            }),
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: any) {
      if (error.code === 'P2034')
        throw new ConflictException(
          'La demande a changé pendant l’enregistrement. Reprenez la même tentative.',
        );
      throw error;
    }
  }

  async respond(actor: Actor, id: string, dto: RepondreDevisDto) {
    // Keep administrative proforma access under its existing role and ownership rules.
    if (dto.statut === 'ENVOYEE')
      await this.proformas.findOne(dto.proformaId!, actor);
    try {
      return await this.db.$transaction(
        async (tx) => {
          const current = await tx.demandeDevis.findUnique({ where: { id } });
          if (!current)
            throw new NotFoundException('Demande de devis introuvable.');
          if (actor.role === 'VENDEUR' && current.responsableId !== actor.id)
            throw new ForbiddenException(
              'Prenez d’abord cette demande avant d’y répondre.',
            );
          if (current.version !== dto.version)
            throw new ConflictException(
              'Cette demande a été modifiée. Actualisez-la.',
            );
          if (!current.responsableId)
            throw new ConflictException(
              'Affectez la demande avant de répondre au client.',
            );
          if (['ACCEPTEE', 'REFUSEE'].includes(current.statut))
            throw new ConflictException('Cette demande est terminée.');
          let offre: Prisma.InputJsonValue | undefined;
          let autorisationPrix: Prisma.InputJsonValue | undefined;
          if (dto.statut === 'ENVOYEE') {
            const proforma = await tx.proforma.findUnique({
              where: { id: dto.proformaId },
              include: { lignes: true },
            });
            if (
              !proforma ||
              proforma.clientId !== current.clientId ||
              proforma.statut !== 'EN_COURS' ||
              proforma.dateExpiration.getTime() <= Date.now()
            ) {
              throw new BadRequestException(
                'La proforma doit appartenir à ce client, être en cours et ne pas être expirée.',
              );
            }
            if (actor.role === 'VENDEUR' && proforma.vendeurId !== actor.id)
              throw new ForbiddenException('Accès refusé à cette proforma.');
            const snapshot = snapshotProforma(proforma);
            const ids = snapshot.lignes.map((line) => line.produitId);
            const products = await tx.produit.findMany({
              where: { id: { in: ids }, estActif: true },
              select: {
                id: true,
                nomProduit: true,
                quantiteStock: true,
                prixDetail: true,
                prixGros: true,
                prixDemiGros: true,
                cmupActuel: true,
              },
            });
            if (products.length !== ids.length)
              throw new ConflictException(
                'Une référence du devis a quitté le catalogue.',
              );
            const issuer = await tx.adminUser.findUnique({
              where: { id: actor.id },
              select: {
                role: true,
                isActive: true,
                peutVendreSousDemiGros: true,
              },
            });
            if (
              !issuer?.isActive ||
              !['SUPER_ADMIN', 'ADMIN', 'VENDEUR'].includes(issuer.role)
            )
              throw new ForbiddenException(
                'Ce compte ne peut plus autoriser une proposition.',
              );
            const byId = new Map(
              products.map((product) => [product.id, product]),
            );
            autorisationPrix = {
              acteurId: actor.id,
              role: issuer.role,
              peutVendreSousDemiGros: issuer.peutVendreSousDemiGros,
              lignes: snapshot.lignes.map((line) => {
                const product = byId.get(line.produitId)!;
                return {
                  produitId: line.produitId,
                  ...validerLignePrix({
                    produit: {
                      nomProduit: product.nomProduit,
                      prixGros: product.prixGros,
                      prixDemiGros: product.prixDemiGros,
                      prixDetail: product.prixDetail,
                      cmupActuel: Number(product.cmupActuel),
                    },
                    prix: line.prixUnitaire,
                    role: issuer.role,
                    peutVendreSousDemiGros: issuer.peutVendreSousDemiGros,
                    motif: dto.motifRemise,
                  }),
                };
              }),
            };
            offre = {
              ...snapshot,
              lignes: snapshot.lignes.map((line) => ({
                ...line,
                quantiteDisponible: byId.get(line.produitId)!.quantiteStock,
              })),
            };
          }
          const changed = await tx.demandeDevis.updateMany({
            where: {
              id,
              version: dto.version,
              responsableId: current.responsableId,
            },
            data: {
              statut: dto.statut,
              reponseClient: dto.message.trim(),
              proformaId: dto.statut === 'ENVOYEE' ? dto.proformaId : null,
              offre: offre || Prisma.DbNull,
              version: { increment: 1 },
            },
          });
          if (changed.count !== 1)
            throw new ConflictException(
              'Cette demande a été modifiée. Actualisez-la.',
            );
          await tx.demandeDevisEvent.create({
            data: {
              demandeId: id,
              acteurId: actor.id,
              acteurType: 'ADMIN',
              statut: dto.statut,
              details: {
                message: dto.message.trim(),
                ...(offre
                  ? {
                      offre,
                      action: 'OFFRE_AUTORISEE',
                      versionOffre: dto.version + 1,
                      autorisationPrix: autorisationPrix!,
                    }
                  : {}),
              },
            },
          });
          const updated = await tx.demandeDevis.findUniqueOrThrow({
            where: { id },
            select: readSelect,
          });
          return this.clientView(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: any) {
      if (error.code === 'P2002')
        throw new ConflictException(
          'Cette proforma est déjà liée à une autre demande.',
        );
      if (error.code === 'P2034')
        throw new ConflictException(
          'Cette demande a été modifiée. Actualisez-la.',
        );
      throw error;
    }
  }
}
