import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { calculerPaie, MontantLigne, PaieRates } from './paie-calcul';
import { CreateSalarieDto } from './dto/create-salarie.dto';
import { UpdateSalarieDto } from './dto/update-salarie.dto';
import { UpdateParametrePaieDto } from './dto/update-parametre-paie.dto';
import {
  CreateBulletinDto,
  PreviewBulletinDto,
} from './dto/create-bulletin.dto';
import { PayerBulletinDto, UpdateBulletinDto } from './dto/update-bulletin.dto';

const PARAMETRE_ID = 'default';

@Injectable()
export class PaieService {
  constructor(private readonly db: DatabaseService) {}

  private readonly bulletinInclude = {
    lignes: { orderBy: { ordre: 'asc' as const } },
    salarie: true,
  };

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private nomComplet(salarie: { nom: string; prenom?: string | null }): string {
    return [salarie.nom, salarie.prenom].filter(Boolean).join(' ').trim();
  }

  // ── Paramètres employeur ───────────────────────────────────────────────
  async getParametres() {
    return this.db.parametrePaie.upsert({
      where: { id: PARAMETRE_ID },
      update: {},
      create: { id: PARAMETRE_ID },
    });
  }

  async updateParametres(dto: UpdateParametrePaieDto) {
    return this.db.parametrePaie.upsert({
      where: { id: PARAMETRE_ID },
      update: { ...dto },
      create: { id: PARAMETRE_ID, ...dto },
    });
  }

  private async getRates(): Promise<PaieRates> {
    const p = await this.getParametres();
    return {
      tauxCnps: this.toNumber(p.tauxCnps),
      plafondCnps: this.toNumber(p.plafondCnps),
      tauxCfc: this.toNumber(p.tauxCfc),
      tauxCac: this.toNumber(p.tauxCac),
      abattementIrppAnnuel: this.toNumber(p.abattementIrppAnnuel),
      tauxFraisProIrpp: this.toNumber(p.tauxFraisProIrpp),
    };
  }

  // ── Salariés ───────────────────────────────────────────────────────────
  async listSalaries() {
    return this.db.salarie.findMany({
      orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
      include: { adminUser: { select: { id: true, nom: true, role: true } } },
    });
  }

  async getSalarie(id: string) {
    const salarie = await this.db.salarie.findUnique({
      where: { id },
      include: { adminUser: { select: { id: true, nom: true, role: true } } },
    });
    if (!salarie) throw new NotFoundException('Salarié introuvable');
    return salarie;
  }

  async createSalarie(dto: CreateSalarieDto) {
    const matricule = dto.matricule?.trim() || (await this.genererMatricule());
    if (dto.matricule?.trim()) {
      const exists = await this.db.salarie.findUnique({ where: { matricule } });
      if (exists)
        throw new BadRequestException(
          `Le matricule ${matricule} est déjà utilisé.`,
        );
    }
    return this.db.salarie.create({
      data: {
        ...this.buildSalarieData(dto),
        matricule,
      } as Prisma.SalarieUncheckedCreateInput,
      include: { adminUser: { select: { id: true, nom: true, role: true } } },
    });
  }

  async updateSalarie(id: string, dto: UpdateSalarieDto) {
    await this.getSalarie(id);
    if (dto.matricule?.trim()) {
      const exists = await this.db.salarie.findUnique({
        where: { matricule: dto.matricule.trim() },
      });
      if (exists && exists.id !== id)
        throw new BadRequestException(
          `Le matricule ${dto.matricule.trim()} est déjà utilisé.`,
        );
    }
    return this.db.salarie.update({
      where: { id },
      data: this.buildSalarieData(dto),
      include: { adminUser: { select: { id: true, nom: true, role: true } } },
    });
  }

  async toggleSalarieActif(id: string) {
    const salarie = await this.getSalarie(id);
    return this.db.salarie.update({
      where: { id },
      data: { actif: !salarie.actif },
      include: { adminUser: { select: { id: true, nom: true, role: true } } },
    });
  }

  private buildSalarieData(dto: Partial<CreateSalarieDto>) {
    const data: Record<string, unknown> = {};
    const copy: (keyof CreateSalarieDto)[] = [
      'nom',
      'prenom',
      'telephone',
      'email',
      'adresse',
      'lieuNaissance',
      'numeroCnps',
      'niu',
      'poste',
      'categorie',
      'echelon',
      'typeContrat',
      'modePaiement',
      'banque',
      'compteBancaire',
      'actif',
    ];
    for (const k of copy) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.salaireBase !== undefined) data.salaireBase = dto.salaireBase;
    if (dto.primesParDefaut !== undefined)
      data.primesParDefaut = dto.primesParDefaut;
    if (dto.dateEmbauche !== undefined)
      data.dateEmbauche = new Date(dto.dateEmbauche);
    if (dto.dateNaissance !== undefined)
      data.dateNaissance = dto.dateNaissance ? new Date(dto.dateNaissance) : null;
    if (dto.dateFinContrat !== undefined)
      data.dateFinContrat = dto.dateFinContrat
        ? new Date(dto.dateFinContrat)
        : null;
    if (dto.adminUserId !== undefined)
      data.adminUserId = dto.adminUserId || null;
    return data;
  }

  private async genererMatricule(): Promise<string> {
    let n = (await this.db.salarie.count()) + 1;
    for (let i = 0; i < 50; i++) {
      const matricule = `SAL-${String(n).padStart(4, '0')}`;
      const exists = await this.db.salarie.findUnique({ where: { matricule } });
      if (!exists) return matricule;
      n++;
    }
    return `SAL-${Date.now()}`;
  }

  // ── Bulletins ──────────────────────────────────────────────────────────
  private buildGains(
    salarie: { salaireBase: unknown; primesParDefaut: unknown },
    gainsDto?: MontantLigne[],
  ): MontantLigne[] {
    if (gainsDto && gainsDto.length)
      return gainsDto.map((g) => ({
        libelle: g.libelle,
        montant: this.toNumber(g.montant),
      }));
    const primes = Array.isArray(salarie.primesParDefaut)
      ? (salarie.primesParDefaut as MontantLigne[])
      : [];
    return [
      { libelle: 'Salaire de base', montant: this.toNumber(salarie.salaireBase) },
      ...primes.map((p) => ({
        libelle: String(p.libelle),
        montant: this.toNumber(p.montant),
      })),
    ];
  }

  private mapMontants(lignes?: MontantLigne[]): MontantLigne[] {
    return (lignes || []).map((l) => ({
      libelle: l.libelle,
      montant: this.toNumber(l.montant),
    }));
  }

  async previewBulletin(dto: PreviewBulletinDto) {
    const salarie = await this.getSalarie(dto.salarieId);
    const rates = await this.getRates();
    const result = calculerPaie({
      gains: this.buildGains(salarie, dto.gains),
      retenuesManuelles: this.mapMontants(dto.retenuesManuelles),
      rates,
    });
    return { salarie, result };
  }

  private async genererNumero(periode: string): Promise<string> {
    const count = await this.db.bulletinPaie.count({ where: { periode } });
    return `BP-${periode}-${String(count + 1).padStart(4, '0')}`;
  }

  async createBulletin(dto: CreateBulletinDto, actorId?: string) {
    const salarie = await this.getSalarie(dto.salarieId);
    const existing = await this.db.bulletinPaie.findUnique({
      where: {
        salarieId_periode: { salarieId: dto.salarieId, periode: dto.periode },
      },
    });
    if (existing)
      throw new BadRequestException(
        `Un bulletin existe déjà pour ${salarie.nom} sur la période ${dto.periode}.`,
      );

    const rates = await this.getRates();
    const result = calculerPaie({
      gains: this.buildGains(salarie, dto.gains),
      retenuesManuelles: this.mapMontants(dto.retenuesManuelles),
      rates,
    });
    const numero = await this.genererNumero(dto.periode);

    return this.db.bulletinPaie.create({
      data: {
        numero,
        salarieId: salarie.id,
        periode: dto.periode,
        joursTravailles: dto.joursTravailles ?? 30,
        salarieNom: this.nomComplet(salarie),
        matricule: salarie.matricule,
        numeroCnps: salarie.numeroCnps,
        poste: salarie.poste,
        categorie: salarie.categorie,
        dateEmbauche: salarie.dateEmbauche,
        brutTotal: result.brutTotal,
        cnps: result.cnps,
        irpp: result.irpp,
        cac: result.cac,
        cfc: result.cfc,
        autresRetenues: result.autresRetenues,
        totalRetenues: result.totalRetenues,
        netAPayer: result.netAPayer,
        modePaiement: dto.modePaiement ?? salarie.modePaiement,
        statut: 'BROUILLON',
        createdById: actorId,
        lignes: { create: this.mapLignes(result.lignes) },
      },
      include: this.bulletinInclude,
    });
  }

  private mapLignes(
    lignes: ReturnType<typeof calculerPaie>['lignes'],
  ) {
    return lignes.map((l) => ({
      type: l.type,
      libelle: l.libelle,
      base: l.base,
      taux: l.taux,
      montant: l.montant,
      ordre: l.ordre,
      systeme: l.systeme,
    }));
  }

  async listBulletins(filters: {
    periode?: string;
    salarieId?: string;
    statut?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.periode) where.periode = filters.periode;
    if (filters.salarieId) where.salarieId = filters.salarieId;
    if (filters.statut) where.statut = filters.statut;
    return this.db.bulletinPaie.findMany({
      where,
      include: {
        salarie: {
          select: { id: true, nom: true, prenom: true, matricule: true, poste: true },
        },
      },
      orderBy: [{ periode: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getBulletin(id: string) {
    const bulletin = await this.db.bulletinPaie.findUnique({
      where: { id },
      include: this.bulletinInclude,
    });
    if (!bulletin) throw new NotFoundException('Bulletin introuvable');
    return bulletin;
  }

  async updateBulletin(id: string, dto: UpdateBulletinDto) {
    const bulletin = await this.getBulletin(id);
    if (bulletin.statut !== 'BROUILLON')
      throw new BadRequestException(
        'Seul un bulletin au statut Brouillon peut être modifié.',
      );

    const rates = await this.getRates();
    const currentGains = bulletin.lignes
      .filter((l) => l.type === 'GAIN')
      .map((l) => ({ libelle: l.libelle, montant: this.toNumber(l.montant) }));
    const currentManuelles = bulletin.lignes
      .filter((l) => l.type === 'RETENUE' && !l.systeme)
      .map((l) => ({ libelle: l.libelle, montant: this.toNumber(l.montant) }));

    const result = calculerPaie({
      gains: dto.gains ? this.mapMontants(dto.gains) : currentGains,
      retenuesManuelles: dto.retenuesManuelles
        ? this.mapMontants(dto.retenuesManuelles)
        : currentManuelles,
      rates,
    });

    return this.db.bulletinPaie.update({
      where: { id },
      data: {
        joursTravailles: dto.joursTravailles ?? bulletin.joursTravailles,
        modePaiement: dto.modePaiement ?? bulletin.modePaiement,
        brutTotal: result.brutTotal,
        cnps: result.cnps,
        irpp: result.irpp,
        cac: result.cac,
        cfc: result.cfc,
        autresRetenues: result.autresRetenues,
        totalRetenues: result.totalRetenues,
        netAPayer: result.netAPayer,
        lignes: { deleteMany: {}, create: this.mapLignes(result.lignes) },
      },
      include: this.bulletinInclude,
    });
  }

  async validerBulletin(id: string, actorId?: string) {
    const bulletin = await this.getBulletin(id);
    if (bulletin.statut !== 'BROUILLON')
      throw new BadRequestException(
        'Seul un bulletin au statut Brouillon peut être validé.',
      );
    return this.db.bulletinPaie.update({
      where: { id },
      data: { statut: 'VALIDE', valideParId: actorId, valideAt: new Date() },
      include: this.bulletinInclude,
    });
  }

  async payerBulletin(id: string, dto: PayerBulletinDto) {
    const bulletin = await this.getBulletin(id);
    if (bulletin.statut !== 'VALIDE')
      throw new BadRequestException(
        'Le bulletin doit être validé avant d’être marqué payé.',
      );
    return this.db.bulletinPaie.update({
      where: { id },
      data: {
        statut: 'PAYE',
        datePaiement: dto.datePaiement ? new Date(dto.datePaiement) : new Date(),
        modePaiement: dto.modePaiement ?? bulletin.modePaiement,
      },
      include: this.bulletinInclude,
    });
  }

  async annulerBulletin(id: string) {
    const bulletin = await this.getBulletin(id);
    if (bulletin.statut === 'PAYE')
      throw new BadRequestException(
        'Un bulletin payé ne peut pas être annulé.',
      );
    if (bulletin.statut === 'ANNULE')
      throw new BadRequestException('Ce bulletin est déjà annulé.');
    return this.db.bulletinPaie.update({
      where: { id },
      data: { statut: 'ANNULE' },
      include: this.bulletinInclude,
    });
  }

  async removeBulletin(id: string) {
    const bulletin = await this.getBulletin(id);
    if (bulletin.statut !== 'BROUILLON')
      throw new BadRequestException(
        'Seul un bulletin au statut Brouillon peut être supprimé.',
      );
    await this.db.bulletinPaie.delete({ where: { id } });
    return { id, deleted: true };
  }
}
