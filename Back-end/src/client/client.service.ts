import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { normalizeCameroonPhone } from './client-phone.util';

@Injectable()
export class ClientService {
  constructor(private readonly db: DatabaseService) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async create(createClientDto: CreateClientDto) {
    return await this.db.client.create({
      data: {
        ...createClientDto,
        telephoneNormalise: normalizeCameroonPhone(createClientDto.telephone),
      },
    });
  }

  async findAll() {
    return await this.db.client.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        email: true,
        adresse: true,
        typeClient: true,
        emailVerifie: true,
        createdAt: true,
        version: true,
        _count: { select: { commandes: true, ventes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async search(query: string, limit = 8) {
    const q = query.trim();
    if (!q) return [];
    const phone = normalizeCameroonPhone(q);

    return this.db.client.findMany({
      where: {
        OR: [
          { nom: { contains: q, mode: 'insensitive' } },
          { prenom: { contains: q, mode: 'insensitive' } },
          ...(phone ? [{ telephoneNormalise: { contains: phone } }] : []),
        ],
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        typeClient: true,
        limiteCredit: true,
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      take: limit,
    });
  }

  async findOne(id: string) {
    const client = await this.db.client.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        email: true,
        adresse: true,
        typeClient: true,
        emailVerifie: true,
        createdAt: true,
        version: true,
        commandes: {
          select: {
            id: true,
            numeroSuivi: true,
            montantTotal: true,
            statut: true,
            dateCommande: true,
            modeReception: true,
          },
          orderBy: { dateCommande: 'desc' },
          take: 10,
        },
        _count: { select: { commandes: true, ventes: true } },
      },
    });
    if (!client) {
      throw new NotFoundException(`Client avec l'id ${id} non trouvé`);
    }
    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    await this.findOne(id);
    return await this.db.client.update({
      where: { id },
      data: {
        ...updateClientDto,
        ...(updateClientDto.telephone !== undefined
          ? { telephoneNormalise: normalizeCameroonPhone(updateClientDto.telephone) }
          : {}),
        version: { increment: 1 },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.db.client.delete({
      where: { id },
    });
  }

  // ── Crédit clients ─────────────────────────────────────────────────────

  /** Encours (dette en cours) d'un client : total dû, nb de ventes, plus ancienne. */
  async getEncours(id: string) {
    const ventes = await this.db.vente.findMany({
      where: { clientId: id, statutPaiement: { in: ['NON_PAYE', 'PARTIEL'] } },
      select: { montantTotal: true, montantPaye: true, dateVente: true },
    });
    let totalDu = 0;
    let nbVentes = 0;
    let plusAncienne: Date | null = null;
    for (const v of ventes) {
      const reste = this.toNumber(v.montantTotal) - this.toNumber(v.montantPaye);
      if (reste <= 0) continue;
      totalDu += reste;
      nbVentes += 1;
      if (!plusAncienne || v.dateVente < plusAncienne) plusAncienne = v.dateVente;
    }
    return { clientId: id, totalDu, nbVentes, plusAncienne };
  }

  async previewCredit(id: string, montant: number, acompte = 0) {
    const client = await this.db.client.findUnique({
      where: { id },
      select: { id: true, limiteCredit: true },
    });
    if (!client) throw new NotFoundException(`Client avec l'id ${id} non trouvé`);
    const encours = await this.getEncours(id);
    const nouveauCredit = Math.max(0, this.toNumber(montant) - Math.max(0, this.toNumber(acompte)));
    const limiteCredit = this.toNumber(client.limiteCredit);
    const nouveauSoldeDu = encours.totalDu + nouveauCredit;
    return {
      clientId: id,
      encoursActuel: encours.totalDu,
      nouveauCredit,
      nouveauSoldeDu,
      limiteCredit,
      autorise: nouveauSoldeDu <= limiteCredit,
      disponible: Math.max(0, limiteCredit - encours.totalDu),
    };
  }

  /** Liste des clients ayant un encours > 0 (triée par montant dû décroissant). */
  async listCredits() {
    const ventes = await this.db.vente.findMany({
      where: {
        statutPaiement: { in: ['NON_PAYE', 'PARTIEL'] },
        clientId: { not: null },
      },
      select: {
        clientId: true,
        montantTotal: true,
        montantPaye: true,
        dateVente: true,
        client: { select: { id: true, nom: true, prenom: true, telephone: true } },
        lignesVente: { select: { quantite: true } },
        reglements: {
          where: { annulee: false },
          select: { dateReglement: true },
          orderBy: { dateReglement: 'desc' },
          take: 1,
        },
      },
      orderBy: { dateVente: 'asc' },
    });

    const map = new Map<string, any>();
    for (const v of ventes) {
      const reste = this.toNumber(v.montantTotal) - this.toNumber(v.montantPaye);
      if (reste <= 0 || !v.clientId) continue;
      const nbArticles = v.lignesVente.reduce((acc, l) => acc + l.quantite, 0);
      const dernierReglement = v.reglements[0]?.dateReglement ?? null;
      const existing = map.get(v.clientId);
      if (existing) {
        existing.totalDu += reste;
        existing.nbVentes += 1;
        existing.nbArticles += nbArticles;
        if (v.dateVente < existing.depuis) existing.depuis = v.dateVente;
        if (
          dernierReglement &&
          (!existing.dernierReglement || dernierReglement > existing.dernierReglement)
        ) {
          existing.dernierReglement = dernierReglement;
        }
      } else {
        map.set(v.clientId, {
          client: v.client,
          totalDu: reste,
          nbVentes: 1,
          nbArticles,
          depuis: v.dateVente,
          dernierReglement,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalDu - a.totalDu);
  }

  /** Détail crédit d'un client : ventes non soldées (avec articles) + règlements + encours. */
  async getCredits(id: string) {
    const client = await this.findOne(id);
    const ventes = await this.db.vente.findMany({
      where: { clientId: id, statutPaiement: { in: ['NON_PAYE', 'PARTIEL'] } },
      include: {
        lignesVente: { include: { produit: { select: { nomProduit: true, marque: true } } } },
        reglements: { orderBy: { dateReglement: 'desc' } },
      },
      orderBy: { dateVente: 'asc' },
    });

    const ventesAvecReste = ventes.map((v) => ({
      ...v,
      resteAPayer: this.toNumber(v.montantTotal) - this.toNumber(v.montantPaye),
    }));

    const encours = await this.getEncours(id);
    return { client, encours, ventes: ventesAvecReste };
  }
}
