import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { ParcoursBatchDto, PARCOURS_EVENTS } from './parcours.dto';
import { acquisitionChannel, ACQUISITION_CHANNELS } from './acquisition';

const dayMs = 86400000;
const extendedEvents = ['CONSEIL_OUVERT', 'DEVIS_COMMENCE'];
const zoneOffset = 3600000;
const day = (now: Date) =>
  new Date(
    new Date(now.getTime() + zoneOffset).toISOString().slice(0, 10) +
      'T00:00:00Z',
  );
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
export function period(from: string, to: string, now = new Date()) {
  for (const input of [from, to]) {
    if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input))
      throw new BadRequestException('Dates attendues au format AAAA-MM-JJ.');
    const parsed = new Date(input + 'T00:00:00Z');
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.getUTCFullYear() < 1 ||
      dateOnly(parsed) !== input
    )
      throw new BadRequestException('Date invalide.');
  }
  const startDay = new Date(from + 'T00:00:00Z'),
    endDay = new Date(to + 'T00:00:00Z');
  if (
    endDay < startDay ||
    endDay > day(now) ||
    endDay.getTime() - startDay.getTime() >= 90 * dayMs
  )
    throw new BadRequestException('Période de 1 à 90 jours, sans date future.');
  return {
    startDay,
    endDay,
    start: new Date(startDay.getTime() - zoneOffset),
    end: new Date(endDay.getTime() + dayMs - zoneOffset),
  };
}

@Injectable()
export class ParcoursService {
  private readonly logger = new Logger('Parcours');
  private maintenanceRunning = false;
  constructor(private readonly db: DatabaseService) {}
  enabled() {
    return process.env.PARCOURS_METRICS_ENABLED === 'true';
  }
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async maintenance() {
    if (!this.enabled() || this.maintenanceRunning) return;
    this.maintenanceRunning = true;
    try {
      await this.cleanup();
    } catch {
      this.logger.warn(
        'Entretien des reçus de mesure indisponible. Aucun contenu client journalisé.',
      );
    } finally {
      this.maintenanceRunning = false;
    }
  }
  async cleanup(now = new Date()) {
    const today = day(now);
    const result = await this.db.$executeRaw`
      DELETE FROM parcours_recu WHERE id IN (
        SELECT id FROM parcours_recu WHERE expiration < ${today}::date
        ORDER BY expiration, id FOR UPDATE SKIP LOCKED LIMIT 2000
      )`;
    return { supprimes: result };
  }
  async ingest(dto: ParcoursBatchDto, now = new Date()) {
    if (!this.enabled()) return { actif: false, enregistre: false };
    const today = day(now);
    // Guard internal callers too, without persisting an arbitrary JSON payload.
    if (
      !dto ||
      Object.keys(dto).join(',') !== 'evenements' ||
      !Array.isArray(dto.evenements) ||
      !dto.evenements.length ||
      dto.evenements.length > 20
    )
      throw new BadRequestException('Lot invalide.');
    const entries = dto.evenements.map((e) => {
      if (!e || typeof e !== 'object' || Array.isArray(e))
        throw new BadRequestException('Observation invalide.');
      const keys = Object.keys(e).sort().join(',');
      if (
        !['appareil,evenement,id,jour,langue,reception', 'appareil,canalEntree,evenement,id,jour,langue,reception'].includes(keys) ||
        !PARCOURS_EVENTS.includes(e.evenement) ||
        !['fr', 'en'].includes(e.langue) ||
        !['mobile', 'tablette', 'ordinateur'].includes(e.appareil) ||
        ![
          'GENERAL',
          'RETRAIT',
          'LIVRAISON_A_CONFIRMER',
          'LIVRAISON_CALCULEE',
        ].includes(e.reception) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          e.id,
        ) ||
        (['FRAIS_VUS', 'SORTIE_APRES_FRAIS'].includes(e.evenement)
          ? e.reception === 'GENERAL'
          : e.reception !== 'GENERAL')
      )
        throw new BadRequestException('Observation invalide.');
      const observationDay = period(e.jour, e.jour, now).startDay;
      if (observationDay.getTime() < today.getTime() - dayMs)
        throw new BadRequestException('Observation expirée.');
      const canalEntree = acquisitionChannel(e.canalEntree);
      const { id, jour: date, canalEntree: _channel, ...dimensions } = e;
      void _channel;
      return {
        id: id.toLowerCase(),
        dimensions,
        canalEntree,
        observationDay,
        empreinte: createHash('sha256')
          .update(
            JSON.stringify([
              date,
              e.evenement,
              e.langue,
              e.appareil,
              e.reception,
              ...(canalEntree ? [canalEntree] : []),
            ]),
          )
          .digest('hex'),
      };
    });
    try {
      await this.db.$transaction(async (tx) => {
        const increments = new Map<
          string,
          {
            key: {
              jour: Date;
              evenement: string;
              langue: string;
              appareil: string;
              reception: string;
            };
            count: number;
          }
        >();
        const sourceIncrements = new Map<string, { key: { jour: Date; evenement: string; langue: string; appareil: string; reception: string; canalEntree: string }; count: number }>();
        // Stable lock order for simultaneous overlapping batches.
        for (const e of entries.sort((a, b) => a.id.localeCompare(b.id))) {
          const inserted = await tx.parcoursRecu.createMany({
            data: [
              {
                id: e.id,
                empreinte: e.empreinte,
                expiration: new Date(today.getTime() + 8 * dayMs),
              },
            ],
            skipDuplicates: true,
          });
          if (!inserted.count) {
            const replay = await tx.parcoursRecu.findUnique({
              where: { id: e.id },
              select: { empreinte: true },
            });
            if (replay?.empreinte !== e.empreinte)
              throw new ConflictException(
                'Observation déjà utilisée avec d’autres dimensions.',
              );
            continue;
          }
          const key = { jour: e.observationDay, ...e.dimensions };
          const sortKey = [
            dateOnly(key.jour),
            key.evenement,
            key.langue,
            key.appareil,
            key.reception,
          ].join(':');
          if (!extendedEvents.includes(key.evenement)) {
            const cell = increments.get(sortKey);
            if (cell) cell.count++;
            else increments.set(sortKey, { key, count: 1 });
          }
          if (e.canalEntree || extendedEvents.includes(key.evenement)) {
            const channel = e.canalEntree || 'NON_RENSEIGNEE';
            const sourceKey = sortKey + ':' + channel;
            const sourceCell = sourceIncrements.get(sourceKey);
            if (sourceCell) sourceCell.count++;
            else sourceIncrements.set(sourceKey, { key: { ...key, canalEntree: channel }, count: 1 });
          }
        }
        // Receipts first, then aggregate cells in a stable order across batches.
        for (const [, { key, count }] of [...increments].sort(([a], [b]) =>
          a.localeCompare(b),
        )) {
          await tx.parcoursJour.upsert({
            where: { jour_evenement_langue_appareil_reception: key },
            create: { ...key, nombre: count },
            update: { nombre: { increment: count } },
          });
        }
        for (const [, { key, count }] of [...sourceIncrements].sort(([a], [b]) => a.localeCompare(b))) {
          await tx.parcoursAcquisitionJour.upsert({
            where: { jour_evenement_langue_appareil_reception_canalEntree: key },
            create: { ...key, nombre: count }, update: { nombre: { increment: count } },
          });
        }
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      // Never log decoder/database payloads through the global exception filter.
      throw new ServiceUnavailableException(
        'Mesure indisponible. Les achats restent utilisables.',
      );
    }
    return { actif: true, enregistre: true };
  }
  async acquisitionReport(from: string, to: string, now = new Date()) {
    const p = period(from, to, now), range = { gte: p.start, lt: p.end };
    const web: Prisma.CommandeWhereInput = { OR: [{ requests: { some: {} } }, { demandeDevis: { isNot: null } }] };
    return this.db.$transaction(async tx => {
      const observations = await tx.parcoursAcquisitionJour.findMany({
        where: { jour: { gte: p.startDay, lte: p.endDay } },
        orderBy: [{ jour: 'asc' }, { evenement: 'asc' }, { langue: 'asc' }, { appareil: 'asc' }, { reception: 'asc' }, { canalEntree: 'asc' }],
      });
      const commandes = await tx.commande.groupBy({ by: ['canalEntree'], where: { ...web, dateCommande: range }, _count: { _all: true } });
      const recues = await tx.commande.groupBy({ by: ['canalEntree'], where: { ...web, dateCommande: range, statut: 'LIVREE', dateLivraison: { not: null } }, _count: { _all: true } });
      const devis = await tx.demandeDevis.groupBy({ by: ['canalEntree'], where: { createdAt: range }, _count: { _all: true } });
      const count = (rows: { canalEntree: string | null; _count: { _all: number } }[], channel: string | null) => rows.find(row => row.canalEntree === channel)?._count._all ?? 0;
      return { debut: from, fin: to, fuseau: 'Africa/Douala',
        observations: observations.map(row => ({ ...row, jour: dateOnly(row.jour) })),
        canaux: [...ACQUISITION_CHANNELS, null].map(canalEntree => ({ canalEntree,
          devisDemandes: count(devis, canalEntree), commandesEnregistrees: count(commandes, canalEntree), commandesRecues: count(recues, canalEntree),
        })),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async report(from: string, to: string, now = new Date(), extended = false) {
    const p = period(from, to, now),
      range = { gte: p.start, lt: p.end },
      web: Prisma.CommandeWhereInput = {
        OR: [{ requests: { some: {} } }, { demandeDevis: { isNot: null } }],
      };
    // Business figures read their authoritative records, never a browser claim.
    return this.db.$transaction(
      async (tx) => {
        const observations = await tx.parcoursJour.findMany({
          where: { jour: { gte: p.startDay, lte: p.endDay } },
          orderBy: [
            { jour: 'asc' },
            { evenement: 'asc' },
            { langue: 'asc' },
            { appareil: 'asc' },
            { reception: 'asc' },
          ],
        });
        if (extended) {
          const added = await tx.parcoursAcquisitionJour.groupBy({
            by: ['jour', 'evenement', 'langue', 'appareil', 'reception'],
            where: { jour: { gte: p.startDay, lte: p.endDay }, evenement: { in: extendedEvents } },
            _sum: { nombre: true },
          });
          observations.push(...added.map(({ _sum, ...row }) => ({ ...row, nombre: _sum.nombre ?? 0 })));
          observations.sort((a, b) => a.jour.getTime() - b.jour.getTime() || [a.evenement, a.langue, a.appareil, a.reception].join(':').localeCompare([b.evenement, b.langue, b.appareil, b.reception].join(':')));
        }
        const commandesEnregistrees = await tx.commande.count({
          where: { ...web, dateCommande: range },
        });
        const cohort = {
          ...web,
          dateCommande: range,
          statut: 'LIVREE' as const,
          dateLivraison: { not: null },
        };
        const cohortLivrees = await tx.commande.count({
          where: { ...cohort, modeReception: 'LIVRAISON' },
        });
        const cohortRetirees = await tx.commande.count({
          where: { ...cohort, modeReception: 'RETRAIT_MAGASIN' },
        });
        const livraisonsPeriode = await tx.commande.count({
          where: {
            ...web,
            statut: 'LIVREE',
            dateLivraison: range,
            modeReception: 'LIVRAISON',
          },
        });
        const retraitsPeriode = await tx.commande.count({
          where: {
            ...web,
            statut: 'LIVREE',
            dateLivraison: range,
            modeReception: 'RETRAIT_MAGASIN',
          },
        });
        const devisDemandes = await tx.demandeDevis.count({
          where: { createdAt: range },
        });
        const commandesSansProvenance = await tx.commande.count({
          where: { NOT: web, dateCommande: range },
        });
        const retours = await tx.dossierIncompatibilite.aggregate({
          where: {
            statut: 'RETOUR_CONFIRME',
            retourConfirmeAt: range,
            ligne: { commande: web },
          },
          _count: { _all: true },
          _sum: { retourQuantite: true },
        });
        const signalementsIncompatibilite =
          await tx.dossierIncompatibilite.count({
            where: { createdAt: range, ligne: { commande: web } },
          });
        return {
          actif: this.enabled(),
          debut: from,
          fin: to,
          fuseau: 'Africa/Douala',
          jourEnCours: to === dateOnly(day(now)),
          observations: observations.map((o) => ({
            ...o,
            jour: dateOnly(o.jour),
          })),
          activite: {
            commandesSansProvenance,
            commandesEnregistrees,
            devisDemandes,
            livraisonsPeriode,
            retraitsPeriode,
          },
          cohorte: {
            commandesEnregistrees,
            livrees: cohortLivrees,
            retirees: cohortRetirees,
            tauxReception: commandesEnregistrees
              ? (cohortLivrees + cohortRetirees) / commandesEnregistrees
              : null,
          },
          retoursIncompatibilite: {
            disponible: true,
            nombre: retours._count._all,
            articles: retours._sum.retourQuantite ?? 0,
            signalements: signalementsIncompatibilite,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
