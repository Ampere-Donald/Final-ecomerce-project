import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MethodePaiement } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateProformaDto, LigneProformaDto } from './dto/create-proforma.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';

const PROFORMA_VALIDITY_DAYS = 30;
const TICKET_VALIDITY_MS = 15 * 60 * 1000;

type Actor = { id: string; role: string };

@Injectable()
export class ProformaService {
  constructor(private readonly db: DatabaseService) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private canManageAll(role: string) {
    return ['SUPER_ADMIN', 'ADMIN'].includes(role);
  }

  private canReadAll(role: string) {
    return ['SUPER_ADMIN', 'ADMIN', 'CAISSIER'].includes(role);
  }

  private include() {
    return {
      lignes: true,
      client: true,
      vendeur: { select: { id: true, nom: true, username: true, role: true } },
    };
  }

  private async generateNumero(): Promise<string> {
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    const count = await this.db.proforma.count({
      where: { dateCreation: { gte: start, lt: end } },
    });
    return `FP-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async generateNumeroTicket(): Promise<string> {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const countToday = await this.db.ticketVente.count({
      where: { createdAt: { gte: startOfDay, lt: endOfDay } },
    });
    return `T-${datePart}-${String(countToday + 1).padStart(4, '0')}`;
  }

  private dateExpiration() {
    const d = new Date();
    d.setDate(d.getDate() + PROFORMA_VALIDITY_DAYS);
    return d;
  }

  private async buildLignes(lignes: LigneProformaDto[]) {
    const produitIds = lignes.map((l) => l.produitId);
    const produits = await this.db.produit.findMany({
      where: { id: { in: produitIds } },
      select: { id: true, nomProduit: true },
    });
    if (produits.length !== produitIds.length) {
      throw new NotFoundException('Au moins un produit est introuvable.');
    }

    const produitsById = new Map(produits.map((p) => [p.id, p]));
    let montantTotal = 0;
    const lignesData = lignes.map((l) => {
      const produit = produitsById.get(l.produitId)!;
      const prixUnitaire = this.toNumber(l.prixUnitaire);
      const sousTotal = prixUnitaire * l.quantite;
      montantTotal += sousTotal;
      return {
        produitId: produit.id,
        nomProduit: produit.nomProduit,
        quantite: l.quantite,
        prixUnitaire,
        sousTotal,
      };
    });

    return { lignesData, montantTotal };
  }

  async create(vendeurId: string, dto: CreateProformaDto) {
    const { lignesData, montantTotal } = await this.buildLignes(dto.lignes);
    return this.db.proforma.create({
      data: {
        numero: await this.generateNumero(),
        vendeurId,
        clientId: dto.clientId ?? null,
        clientNom: dto.clientNom?.trim() || null,
        clientNiu: dto.clientNiu?.trim() || null,
        clientRccm: dto.clientRccm?.trim() || null,
        notes: dto.notes?.trim() || null,
        dateExpiration: this.dateExpiration(),
        montantTotal,
        lignes: { create: lignesData },
      },
      include: this.include(),
    });
  }

  async findAll(actor: Actor, filters: { statut?: string; periode?: string }) {
    const where: any = {};
    if (!this.canReadAll(actor.role)) where.vendeurId = actor.id;
    if (filters.statut) where.statut = filters.statut;
    if (filters.periode) {
      const [year, month] = filters.periode.split('-').map(Number);
      if (year && month) {
        where.dateCreation = {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        };
      }
    }
    return this.db.proforma.findMany({
      where,
      include: this.include(),
      orderBy: { dateCreation: 'desc' },
    });
  }

  async findOne(id: string, actor: Actor) {
    const proforma = await this.db.proforma.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!proforma) throw new NotFoundException('Proforma introuvable.');
    if (!this.canReadAll(actor.role) && proforma.vendeurId !== actor.id) {
      throw new ForbiddenException('Acces refuse a cette proforma.');
    }
    return proforma;
  }

  async update(id: string, actor: Actor, dto: UpdateProformaDto) {
    const current = await this.findOne(id, actor);
    if (current.statut !== 'EN_COURS') {
      throw new BadRequestException('Seule une proforma en cours est modifiable.');
    }

    const data: any = {
      clientId: dto.clientId ?? current.clientId,
      clientNom: dto.clientNom !== undefined ? dto.clientNom?.trim() || null : current.clientNom,
      clientNiu: dto.clientNiu !== undefined ? dto.clientNiu?.trim() || null : current.clientNiu,
      clientRccm: dto.clientRccm !== undefined ? dto.clientRccm?.trim() || null : current.clientRccm,
      notes: dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
    };

    if (dto.lignes) {
      const { lignesData, montantTotal } = await this.buildLignes(dto.lignes);
      data.montantTotal = montantTotal;
      return this.db.$transaction(async (tx: any) => {
        await tx.proformaLigne.deleteMany({ where: { proformaId: id } });
        return tx.proforma.update({
          where: { id },
          data: { ...data, lignes: { create: lignesData } },
          include: this.include(),
        });
      });
    }

    return this.db.proforma.update({
      where: { id },
      data,
      include: this.include(),
    });
  }

  async transformer(id: string, actor: Actor, methodePaiement: MethodePaiement) {
    const proforma = await this.findOne(id, actor);
    if (proforma.statut === 'TRANSFORMEE') {
      throw new BadRequestException('Cette proforma a deja ete transformee.');
    }
    if (proforma.dateExpiration < new Date()) {
      throw new BadRequestException('Cette proforma a expire.');
    }

    const produitIds = proforma.lignes
      .map((l) => l.produitId)
      .filter((value): value is string => Boolean(value));
    const produits = await this.db.produit.findMany({
      where: { id: { in: produitIds } },
      select: { id: true, quantiteStock: true, nomProduit: true },
    });
    const produitsById = new Map(produits.map((p) => [p.id, p]));

    for (const ligne of proforma.lignes) {
      if (!ligne.produitId) {
        throw new BadRequestException(`Produit non lie pour ${ligne.nomProduit}.`);
      }
      const produit = produitsById.get(ligne.produitId);
      if (!produit || produit.quantiteStock < ligne.quantite) {
        throw new BadRequestException(
          `Stock insuffisant pour ${ligne.nomProduit} (disponible : ${produit?.quantiteStock ?? 0}).`,
        );
      }
    }

    return this.db.$transaction(async (tx: any) => {
      const ticket = await tx.ticketVente.create({
        data: {
          numeroTicket: await this.generateNumeroTicket(),
          vendeurId: proforma.vendeurId,
          clientId: proforma.clientId,
          nomClient: proforma.clientNom,
          montantTotal: proforma.montantTotal,
          methodePaiement,
          expiresAt: new Date(Date.now() + TICKET_VALIDITY_MS),
          lignes: {
            create: proforma.lignes.map((l) => ({
              produitId: l.produitId!,
              nomProduit: l.nomProduit,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              sousTotal: l.sousTotal,
            })),
          },
        },
        include: { lignes: true },
      });

      const updated = await tx.proforma.update({
        where: { id },
        data: { statut: 'TRANSFORMEE' },
        include: this.include(),
      });

      return { proforma: updated, ticket };
    });
  }

  async remove(id: string) {
    await this.db.proforma.delete({ where: { id } });
    return { deleted: true };
  }

  @Cron('0 2 * * *', { timeZone: 'Africa/Douala' })
  async deleteExpired() {
    return this.db.proforma.deleteMany({
      where: {
        dateExpiration: { lt: new Date() },
        statut: { not: 'TRANSFORMEE' },
      },
    });
  }
}
