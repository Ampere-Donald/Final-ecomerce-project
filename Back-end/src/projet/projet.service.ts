import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActionProjet, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import {
  CreateProjetDto,
  UpdateProjetDto,
  PublierProjetDto,
  RetirerProjetDto,
} from './dto/projet.dto';
import {
  hash,
  projectProductSelect,
  projectUrl,
  publicProject,
  technicalFingerprint,
  adminProject,
} from './projet-data';
import { addSellableStock } from '../ticket-vente/ticket-stock.util';

type Actor = { id: string; role: string };
const include = {
  lignes: {
    orderBy: { ordre: 'asc' as const },
    include: { produit: { select: projectProductSelect } },
  },
};
const adminInclude = {
  ...include,
  historique: { orderBy: { createdAt: 'desc' as const }, take: 50 },
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProjetService {
  constructor(private readonly db: DatabaseService) {}

  private async actor(
    actor: Actor,
    db: Prisma.TransactionClient | DatabaseService = this.db,
  ) {
    const account = await db.adminUser.findUnique({
      where: { id: actor?.id || '' },
      select: { role: true, isActive: true, mustChangeCredential: true },
    });
    if (
      !account?.isActive ||
      account.mustChangeCredential ||
      !['ADMIN', 'SUPER_ADMIN'].includes(account.role) ||
      account.role !== actor.role
    )
      throw new ForbiddenException(
        'La gestion des projets exige un administrateur actif.',
      );
  }

  private visible(now: Date) {
    return {
      statut: 'PUBLIE' as const,
      valideAt: { not: null },
      validationVersion: { not: null },
      AND: [
        {
          OR: [{ debutPublication: null }, { debutPublication: { lte: now } }],
        },
        { OR: [{ finPublication: null }, { finPublication: { gt: now } }] },
      ],
    };
  }
  private async publicViews(tx: Prisma.TransactionClient, rows: any[]) {
    const products = [
      ...new Map(
        rows
          .flatMap((row) => row.lignes)
          .filter((line) => line.produit?.estActif)
          .map((line) => [line.produit.id, line.produit]),
      ).values(),
    ] as any[];
    const stock = await addSellableStock(tx as any, products);
    const byId = new Map(
      stock.map((product) => [product.id, product.quantiteDisponibleVente]),
    );
    return rows.map((row) =>
      publicProject({
        ...row,
        lignes: row.lignes.map((line: any) => ({
          ...line,
          produit: line.produit
            ? { ...line.produit, quantiteStock: byId.get(line.produit.id) ?? 0 }
            : null,
        })),
      }),
    );
  }
  async findPublic(pageText = '1', limitText = '12') {
    const page = Number(pageText),
      limit = Number(limitText);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 24
    )
      throw new BadRequestException('Pagination invalide.');
    return this.db.$transaction(
      async (tx) => {
        const where = this.visible(new Date());
        const rows = await tx.projet.findMany({
          where,
          include,
          orderBy: [{ ordre: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
          take: limit,
          skip: (page - 1) * limit,
        });
        const total = await tx.projet.count({ where });
        return {
          data: await this.publicViews(
            tx,
            rows.filter((row) => row.validationVersion === row.version),
          ),
          meta: {
            total,
            page,
            lastPage: Math.max(1, Math.ceil(total / limit)),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async findPublicOne(slug: string) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100)
      throw new NotFoundException('Projet introuvable.');
    return this.db.$transaction(
      async (tx) => {
        const row = await tx.projet.findFirst({
          where: { ...this.visible(new Date()), slug },
          include,
        });
        if (!row || row.validationVersion !== row.version)
          throw new NotFoundException('Projet introuvable.');
        return (await this.publicViews(tx, [row]))[0];
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async findAdmin(actor: Actor) {
    await this.actor(actor);
    const rows = await this.db.projet.findMany({
      orderBy: [{ ordre: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
      include,
    });
    return rows.map(adminProject);
  }
  async findAdminOne(actor: Actor, id: string) {
    await this.actor(actor);
    const row = await this.db.projet.findUnique({
      where: { id },
      include: adminInclude,
    });
    if (!row) throw new NotFoundException('Projet introuvable.');
    return adminProject(row);
  }

  private clean(dto: CreateProjetDto) {
    if (
      !Array.isArray(dto.lignes) ||
      dto.lignes.length > 30 ||
      !Array.isArray(dto.documents) ||
      dto.documents.length > 8
    )
      throw new BadRequestException('Limite de 30 lignes et 8 documents.');
    const ids = dto.lignes.map((line) => line.produitId).filter(Boolean);
    if (
      new Set(ids).size !== ids.length ||
      dto.lignes.some(
        (line) =>
          !Number.isSafeInteger(line.quantite) ||
          line.quantite < 1 ||
          line.quantite > 10000 ||
          typeof line.necessaire !== 'boolean' ||
          !line.role?.trim(),
      )
    )
      throw new BadRequestException(
        'Références uniques, rôles et quantités entières requis.',
      );
    const debutPublication = dto.debutPublication
      ? new Date(dto.debutPublication)
      : null;
    const finPublication = dto.finPublication
      ? new Date(dto.finPublication)
      : null;
    if (
      (debutPublication && !Number.isFinite(debutPublication.getTime())) ||
      (finPublication && !Number.isFinite(finPublication.getTime())) ||
      (debutPublication && finPublication && finPublication <= debutPublication)
    )
      throw new BadRequestException(
        'La fin de publication doit suivre son début.',
      );
    return {
      slug: dto.slug,
      titre: dto.titre.trim(),
      titreEn: dto.titreEn?.trim() || null,
      resume: dto.resume.trim(),
      resumeEn: dto.resumeEn?.trim() || null,
      objectif: dto.objectif.trim(),
      prerequis: dto.prerequis.trim(),
      contraintes: dto.contraintes.trim(),
      niveau: dto.niveau,
      imageUrl: dto.imageUrl ? projectUrl(dto.imageUrl, true) : null,
      ordre: dto.ordre,
      debutPublication,
      finPublication,
      documents: dto.documents.map((document) => ({
        titre: document.titre.trim(),
        url: projectUrl(document.url),
      })),
    };
  }
  private async lines(dto: CreateProjetDto, tx: Prisma.TransactionClient) {
    const ids = dto.lignes
      .map((line) => line.produitId)
      .filter((id): id is string => Boolean(id));
    const products = await tx.produit.findMany({
      where: { id: { in: ids }, estActif: true },
      select: projectProductSelect,
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    return dto.lignes.map((line, ordre) => {
      const product = line.produitId ? byId.get(line.produitId) : null;
      if (line.produitId && !product)
        throw new BadRequestException(
          'Une référence choisie est introuvable ou inactive.',
        );
      if (
        product &&
        line.referenceSouhaitee &&
        line.referenceSouhaitee.trim() !== product.code
      )
        throw new BadRequestException(
          'La référence demandée ne correspond pas au produit choisi.',
        );
      return {
        produitId: product?.id || null,
        produitIdSource: product?.id || null,
        reference: product?.code || line.referenceSouhaitee?.trim() || null,
        nomProduit: product?.nomProduit || line.role.trim(),
        role: line.role.trim(),
        quantite: line.quantite,
        necessaire: line.necessaire,
        ordre,
      };
    });
  }

  private async replay(
    db: Prisma.TransactionClient | DatabaseService,
    actor: Actor,
    requestId: string,
    fingerprint: string,
    action: ActionProjet,
    id?: string,
  ) {
    const receipt = await db.projetEvent.findUnique({ where: { requestId } });
    if (!receipt) return null;
    if (
      receipt.acteurId !== actor.id ||
      receipt.empreinte !== fingerprint ||
      receipt.action !== action ||
      (id && receipt.projetId !== id)
    )
      throw new ConflictException(
        'Cette tentative a déjà été utilisée pour une autre opération.',
      );
    const row = await db.projet.findUnique({
      where: { id: receipt.projetId },
      include: adminInclude,
    });
    if (!row)
      throw new ConflictException(
        'Le projet de cette tentative n’existe plus.',
      );
    return {
      projet: adminProject(row),
      operation: {
        requestId,
        versionAppliquee: receipt.versionAppliquee,
        rejoue: true,
      },
    };
  }

  private async mutate(
    actor: Actor,
    action: ActionProjet,
    dto:
      | CreateProjetDto
      | UpdateProjetDto
      | PublierProjetDto
      | RetirerProjetDto,
    id?: string,
  ) {
    await this.actor(actor);
    if (!uuid.test(dto.requestId))
      throw new BadRequestException(
        'Une identité de tentative valide est requise.',
      );
    const fingerprint = hash({ action, id: id || null, dto });
    const previous = await this.replay(
      this.db,
      actor,
      dto.requestId,
      fingerprint,
      action,
      id,
    );
    if (previous) return previous;
    try {
      return await this.db.$transaction(
        async (tx) => {
          await this.actor(actor, tx);
          const receipt = await this.replay(
            tx,
            actor,
            dto.requestId,
            fingerprint,
            action,
            id,
          );
          if (receipt) return receipt;
          let row: any;
          const isEditing = action === 'CREATION' || action === 'MODIFICATION';
          const clean = isEditing ? this.clean(dto as CreateProjetDto) : null;
          const newLines = isEditing
            ? await this.lines(dto as CreateProjetDto, tx)
            : [];
          if (action === 'CREATION') {
            row = await tx.projet.create({
              data: {
                ...clean!,
                documents: clean!.documents,
                lignes: { create: newLines },
              },
              include,
            });
          } else {
            const current = await tx.projet.findUnique({
              where: { id },
              include,
            });
            if (!current) throw new NotFoundException('Projet introuvable.');
            const version = (dto as UpdateProjetDto).version;
            if (!Number.isSafeInteger(version) || version !== current.version)
              throw new ConflictException(
                'Le projet a changé. Relisez la version courante.',
              );
            let changes: Prisma.ProjetUpdateManyMutationInput;
            if (action === 'MODIFICATION') {
              if (clean!.slug !== current.slug)
                throw new BadRequestException(
                  'Le lien du projet est conservé après création.',
                );
              changes = {
                ...clean!,
                documents: clean!.documents,
                statut: 'BROUILLON',
                validationVersion: null,
                valideAt: null,
                valideParId: null,
                noteValidation: null,
              };
            } else if (action === 'PUBLICATION') {
              const publication = dto as PublierProjetDto;
              if (
                current.statut !== 'BROUILLON' ||
                publication.referencesVerifiees !== true ||
                publication.materielEtQuantitesVerifies !== true ||
                publication.contraintesEtDocumentsVerifies !== true ||
                !publication.noteValidation?.trim() ||
                publication.noteValidation.trim().length < 10
              )
                throw new BadRequestException(
                  'Confirmez la vérification technique du brouillon avant publication.',
                );
              if (
                !current.resume ||
                !current.objectif ||
                !current.prerequis ||
                !current.contraintes ||
                !(current.documents as any[])?.length ||
                !current.lignes.length ||
                !current.lignes.some((line) => line.necessaire) ||
                (current.finPublication && current.finPublication <= new Date())
              )
                throw new BadRequestException(
                  'Objectif, prérequis, contraintes, documentation et matériel requis doivent être renseignés.',
                );
              if (
                current.lignes.some(
                  (line) =>
                    !line.produit?.estActif ||
                    !line.produit.code ||
                    line.produit.code !== line.reference ||
                    line.produit.id !== line.produitIdSource,
                )
              )
                throw new BadRequestException(
                  'Chaque référence doit être choisie, active et correspondre à la liste relue.',
                );
              const reviewed = publication.verifications;
              if (
                !Array.isArray(reviewed) ||
                reviewed.length !== current.lignes.length ||
                new Set(reviewed.map((line) => line.ligneId)).size !==
                  reviewed.length ||
                current.lignes.some(
                  (line) =>
                    !reviewed.some(
                      (check) =>
                        check.ligneId === line.id &&
                        check.empreinteTechnique ===
                          technicalFingerprint(line.produit),
                    ),
                )
              )
                throw new ConflictException(
                  'Les caractéristiques ont changé depuis votre relecture. Vérifiez chaque pièce à nouveau.',
                );
              for (const line of current.lignes)
                await tx.projetLigne.update({
                  where: { id: line.id },
                  data: {
                    empreinteTechnique: technicalFingerprint(line.produit),
                  },
                });
              changes = {
                statut: 'PUBLIE',
                validationVersion: version + 1,
                valideAt: new Date(),
                valideParId: actor.id,
                noteValidation: publication.noteValidation.trim(),
              };
            } else {
              const withdrawal = dto as RetirerProjetDto;
              if (
                !withdrawal.motif?.trim() ||
                withdrawal.motif.trim().length < 3
              )
                throw new BadRequestException('Indiquez le motif du retrait.');
              changes = {
                statut: 'BROUILLON',
                validationVersion: null,
                valideAt: null,
                valideParId: null,
                noteValidation: null,
              };
              await tx.projetLigne.updateMany({
                where: { projetId: id },
                data: { empreinteTechnique: null },
              });
            }
            const updated = await tx.projet.updateMany({
              where: { id, version },
              data: {
                ...changes,
                version: { increment: 1 },
                updatedAt: new Date(),
              },
            });
            if (updated.count !== 1)
              throw new ConflictException(
                'Le projet a été modifié simultanément.',
              );
            if (action === 'MODIFICATION') {
              await tx.projetLigne.deleteMany({ where: { projetId: id } });
              if (newLines.length)
                await tx.projetLigne.createMany({
                  data: newLines.map((line) => ({ ...line, projetId: id! })),
                });
            }
            row = await tx.projet.findUniqueOrThrow({ where: { id }, include });
          }
          await tx.projetEvent.create({
            data: {
              projetId: row.id,
              requestId: dto.requestId,
              acteurId: actor.id,
              action,
              versionAppliquee: row.version,
              empreinte: fingerprint,
              details: JSON.parse(
                JSON.stringify(
                  isEditing
                    ? { ...clean, lignes: newLines }
                    : action === 'PUBLICATION'
                      ? {
                          noteValidation: (
                            dto as PublierProjetDto
                          ).noteValidation.trim(),
                          referencesVerifiees: true,
                          materielEtQuantitesVerifies: true,
                          contraintesEtDocumentsVerifies: true,
                          verifications: (dto as PublierProjetDto)
                            .verifications,
                        }
                      : { motif: (dto as RetirerProjetDto).motif.trim() },
                ),
              ),
            },
          });
          return {
            projet: adminProject(
              await tx.projet.findUniqueOrThrow({
                where: { id: row.id },
                include: adminInclude,
              }),
            ),
            operation: {
              requestId: dto.requestId,
              versionAppliquee: row.version,
              rejoue: false,
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: any) {
      if (['P2002', 'P2034', 'P2010'].includes(error?.code)) {
        const receipt = await this.replay(
          this.db,
          actor,
          dto.requestId,
          fingerprint,
          action,
          id,
        );
        if (receipt) return receipt;
        if (error.code === 'P2002')
          throw new ConflictException(
            'Le lien du projet ou cette tentative existe déjà.',
          );
        if (
          error.code === 'P2034' ||
          error.meta?.code === '40001' ||
          error.meta?.driverAdapterError?.cause?.originalCode === '40001'
        )
          throw new ConflictException(
            'Une autre modification est intervenue. Relisez puis réessayez.',
          );
      }
      throw error;
    }
  }
  create(actor: Actor, dto: CreateProjetDto) {
    return this.mutate(actor, 'CREATION', dto);
  }
  update(actor: Actor, id: string, dto: UpdateProjetDto) {
    return this.mutate(actor, 'MODIFICATION', dto, id);
  }
  publish(actor: Actor, id: string, dto: PublierProjetDto) {
    return this.mutate(actor, 'PUBLICATION', dto, id);
  }
  withdraw(actor: Actor, id: string, dto: RetirerProjetDto) {
    return this.mutate(actor, 'RETRAIT', dto, id);
  }
}
