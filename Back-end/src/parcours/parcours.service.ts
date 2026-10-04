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

const dayMs = 86400000;
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
        keys !== 'appareil,evenement,id,jour,langue,reception' ||
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
      const { id, jour: date, ...dimensions } = e;
      return {
        id: id.toLowerCase(),
        dimensions,
        observationDay,
        empreinte: createHash('sha256')
          .update(
            JSON.stringify([
              date,
              e.evenement,
              e.langue,
              e.appareil,
              e.reception,
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
          const cell = increments.get(sortKey);
          if (cell) cell.count++;
          else increments.set(sortKey, { key, count: 1 });
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
  async report(from: string, to: string, now = new Date()) {
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
          retoursIncompatibilite: { disponible: false, nombre: null },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
