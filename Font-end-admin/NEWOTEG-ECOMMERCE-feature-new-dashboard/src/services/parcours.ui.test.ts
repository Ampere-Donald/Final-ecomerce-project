import { describe, expect, it, vi } from 'vitest';
vi.mock('./api', () => ({ default: { get: vi.fn() } }));
import {
  comparablePeriods,
  defaultPeriod,
  doualaToday,
  observationTotals,
  parseReport,
  type Period,
} from './parcours';

const period = { debut: '2026-09-01', fin: '2026-09-07' };
export function fixture(range: Period = period, created = 4) {
  return {
    ...range,
    actif: false,
    fuseau: 'Africa/Douala',
    jourEnCours: false,
    observations: [
      {
        jour: range.debut,
        evenement: 'FICHE_OUVERTE',
        langue: 'fr',
        appareil: 'mobile',
        reception: 'GENERAL',
        nombre: 9,
      },
    ],
    activite: {
      commandesSansProvenance: 2,
      commandesEnregistrees: created,
      devisDemandes: 1,
      livraisonsPeriode: 0,
      retraitsPeriode: 2,
    },
    cohorte: {
      commandesEnregistrees: created,
      livrees: 0,
      retirees: created ? 2 : 0,
      tauxReception: created ? 2 / created : null,
    },
    retoursIncompatibilite: { disponible: false, nombre: null },
  };
}
describe('périodes de mesure', () => {
  it('utilise les jours terminés à Douala à la frontière UTC et compare une durée inclusive', () => {
    const now = new Date('2026-10-03T23:30:00Z');
    expect(doualaToday(now)).toBe('2026-10-04');
    expect(defaultPeriod(now)).toEqual({
      debut: '2026-09-27',
      fin: '2026-10-03',
    });
    expect(comparablePeriods(defaultPeriod(now), now)).toEqual({
      selected: defaultPeriod(now),
      previous: { debut: '2026-09-20', fin: '2026-09-26' },
      days: 7,
    });
    expect(comparablePeriods({ debut: '2024-03-01', fin: '2024-03-01' }, now).previous).toEqual({
      debut: '2024-02-29',
      fin: '2024-02-29',
    });
  });
  it('refuse les dates normalisées, futures, inversées ou trop longues et accepte 90 jours', () => {
    const now = new Date('2026-10-04T10:00:00Z');
    for (const value of [
      { debut: '2026-02-30', fin: '2026-03-01' },
      { debut: '2026-10-04', fin: '2026-10-05' },
      { debut: '2026-09-02', fin: '2026-09-01' },
      { debut: '2026-06-01', fin: '2026-08-30' },
      { debut: '0001-01-01', fin: '0001-01-01' },
    ])
      expect(() => comparablePeriods(value, now)).toThrow();
    expect(comparablePeriods({ debut: '2026-06-01', fin: '2026-08-29' }, now).days).toBe(90);
  });
});
describe('rapport fermé et cohérent', () => {
  it('sépare signalements, dossiers et quantités confirmées sans texte ni fausse égalité entre périodes', () => {
    const base = fixture();
    const retours = {
      disponible: true,
      nombre: 2,
      articles: 5,
      signalements: 1,
    };
    expect(
      parseReport({ ...base, retoursIncompatibilite: retours }, period).retoursIncompatibilite,
    ).toEqual(retours);
    for (const value of [
      { ...retours, articles: 1 },
      { ...retours, nombre: 0 },
      { ...retours, nombre: -1 },
      { ...retours, articles: 1.5 },
      { ...retours, description: 'Texte privé' },
      { ...retours, signalements: NaN },
    ])
      expect(() => parseReport({ ...base, retoursIncompatibilite: value }, period)).toThrow();
  });
  it('sépare absence de registre, absence de commandes et compteurs historiques désactivés', () => {
    const report = parseReport(fixture(period, 0), period);
    expect(report.cohorte.tauxReception).toBeNull();
    expect(report.retoursIncompatibilite.nombre).toBeNull();
    expect(report.actif).toBe(false);
    expect(observationTotals(report).FICHE_OUVERTE).toBe(9);
    expect(observationTotals(report).FRAIS_VUS).toBe(0);
  });
  it('rejette coordonnées supplémentaires, mauvaise période, compteurs et cohorte incohérents', () => {
    const base = fixture();
    for (const value of [
      { ...base, email: 'fixture@example.invalid' },
      { ...base, fin: '2026-09-08' },
      { ...base, activite: { ...base.activite, devisDemandes: -1 } },
      { ...base, activite: { ...base.activite, commandesEnregistrees: 5 } },
      { ...base, cohorte: { ...base.cohorte, tauxReception: 0.75 } },
      { ...base, cohorte: { ...base.cohorte, livrees: 5 } },
      { ...base, retoursIncompatibilite: { disponible: false, nombre: 0 } },
    ])
      expect(() => parseReport(value, period)).toThrow();
  });
  it('rejette dimensions ouvertes, doublons, jours hors période et totaux imprécis', () => {
    const base = fixture(),
      cell = base.observations[0];
    for (const cells of [
      [{ ...cell, recherche: 'private' }],
      [{ ...cell, evenement: 'VENTE' }],
      [{ ...cell, reception: 'RETRAIT' }],
      [{ ...cell, evenement: 'FRAIS_VUS' }],
      [{ ...cell, jour: '2026-09-08' }],
      [{ ...cell, nombre: 0 }],
      [cell, cell],
      [
        { ...cell, nombre: Number.MAX_SAFE_INTEGER },
        { ...cell, langue: 'en', nombre: 1 },
      ],
    ])
      expect(() => parseReport({ ...base, observations: cells }, period)).toThrow();
  });
});
