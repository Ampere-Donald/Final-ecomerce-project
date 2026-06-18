/**
 * Moteur de calcul de paie — Cameroun (version « légale simplifiée »).
 *
 * À partir des gains imposables (salaire de base + primes), calcule les
 * retenues salariales standard et le net à payer :
 *   - CNPS / PVID : taux salarié plafonné (assiette plafonnée à plafondCnps).
 *   - IRPP        : barème progressif annuel après abattement frais pro (30 %),
 *                   déduction CNPS et abattement forfaitaire, ramené au mois.
 *   - CAC         : centimes additionnels communaux = % de l'IRPP.
 *   - CFC         : Crédit Foncier salarié = % du brut.
 *
 * Les taux/plafonds proviennent de la table ParametrePaie (ajustables).
 * Le barème IRPP est encodé ici (change rarement). Méthode recoupée avec les
 * simulateurs lefisk.cm et afrotools.com (juin 2026).
 *
 * Module PUR (aucune dépendance Nest/Prisma) → testable unitairement.
 */

export interface PaieRates {
  tauxCnps: number; // % salarié (def. 4.2)
  plafondCnps: number; // FCFA/mois (def. 750000)
  tauxCfc: number; // % du brut (def. 1)
  tauxCac: number; // % de l'IRPP (def. 10)
  abattementIrppAnnuel: number; // FCFA/an (def. 500000)
  tauxFraisProIrpp: number; // % (def. 30)
}

export interface MontantLigne {
  libelle: string;
  montant: number;
}

export type TypeLigne = 'GAIN' | 'RETENUE';

export interface LigneCalcul {
  type: TypeLigne;
  libelle: string;
  base: number | null;
  taux: number | null;
  montant: number;
  ordre: number;
  systeme: boolean;
}

export interface CalculInput {
  gains: MontantLigne[]; // gains imposables (1re ligne = salaire de base par convention)
  retenuesManuelles?: MontantLigne[]; // acomptes, RAV, TDL… saisies à la main
  rates: PaieRates;
}

export interface CalculResult {
  brutTotal: number;
  cnps: number;
  irpp: number;
  cac: number;
  cfc: number;
  autresRetenues: number;
  totalRetenues: number;
  netAPayer: number;
  lignes: LigneCalcul[];
}

/** Barème IRPP annuel progressif (revenu net imposable). */
const TRANCHES_IRPP: { plafond: number; taux: number }[] = [
  { plafond: 2_000_000, taux: 0.1 },
  { plafond: 3_000_000, taux: 0.15 },
  { plafond: 5_000_000, taux: 0.25 },
  { plafond: Infinity, taux: 0.35 },
];

const round = (n: number): number => Math.max(0, Math.round(n || 0));

/** IRPP annuel par tranches sur le revenu net imposable annuel. */
export function calculIrppAnnuel(revenuNetAnnuel: number): number {
  let reste = Math.max(0, revenuNetAnnuel);
  let bas = 0;
  let impot = 0;
  for (const t of TRANCHES_IRPP) {
    if (reste <= 0) break;
    const largeur = t.plafond - bas;
    const part = Math.min(reste, largeur);
    impot += part * t.taux;
    reste -= part;
    bas = t.plafond;
  }
  return impot;
}

export function calculerPaie(input: CalculInput): CalculResult {
  const { rates } = input;
  const gains = (input.gains || []).filter((g) => g && Number.isFinite(g.montant));
  const retenuesManuelles = (input.retenuesManuelles || []).filter(
    (r) => r && Number.isFinite(r.montant),
  );

  const brutTotal = round(gains.reduce((s, g) => s + (g.montant || 0), 0));

  // CNPS / PVID — assiette plafonnée
  const assietteCnps = Math.min(brutTotal, rates.plafondCnps);
  const cnps = round((rates.tauxCnps / 100) * assietteCnps);

  // IRPP — base annuelle après frais pro, CNPS et abattement forfaitaire
  const brutAnnuel = brutTotal * 12;
  const revenuNetAnnuel =
    brutAnnuel * (1 - rates.tauxFraisProIrpp / 100) -
    cnps * 12 -
    rates.abattementIrppAnnuel;
  const irpp = round(calculIrppAnnuel(revenuNetAnnuel) / 12);

  // CAC (% IRPP) et CFC (% brut)
  const cac = round((rates.tauxCac / 100) * irpp);
  const cfc = round((rates.tauxCfc / 100) * brutTotal);

  const autresRetenues = round(
    retenuesManuelles.reduce((s, r) => s + (r.montant || 0), 0),
  );

  const totalRetenues = cnps + irpp + cac + cfc + autresRetenues;
  const netAPayer = brutTotal - totalRetenues;

  // Lignes détaillées (gains puis retenues)
  const lignes: LigneCalcul[] = [];
  let ordre = 0;
  for (const g of gains) {
    lignes.push({
      type: 'GAIN',
      libelle: g.libelle,
      base: null,
      taux: null,
      montant: round(g.montant),
      ordre: ordre++,
      systeme: ordre === 1, // 1re ligne = salaire de base (système)
    });
  }
  lignes.push({
    type: 'RETENUE',
    libelle: 'CNPS (PVID)',
    base: assietteCnps,
    taux: rates.tauxCnps,
    montant: cnps,
    ordre: ordre++,
    systeme: true,
  });
  lignes.push({
    type: 'RETENUE',
    libelle: 'IRPP',
    base: null,
    taux: null,
    montant: irpp,
    ordre: ordre++,
    systeme: true,
  });
  lignes.push({
    type: 'RETENUE',
    libelle: 'CAC (10 % IRPP)',
    base: irpp,
    taux: rates.tauxCac,
    montant: cac,
    ordre: ordre++,
    systeme: true,
  });
  lignes.push({
    type: 'RETENUE',
    libelle: 'Crédit Foncier (CFC)',
    base: brutTotal,
    taux: rates.tauxCfc,
    montant: cfc,
    ordre: ordre++,
    systeme: true,
  });
  for (const r of retenuesManuelles) {
    lignes.push({
      type: 'RETENUE',
      libelle: r.libelle,
      base: null,
      taux: null,
      montant: round(r.montant),
      ordre: ordre++,
      systeme: false,
    });
  }

  return {
    brutTotal,
    cnps,
    irpp,
    cac,
    cfc,
    autresRetenues,
    totalRetenues,
    netAPayer,
    lignes,
  };
}

export const DEFAULT_RATES: PaieRates = {
  tauxCnps: 4.2,
  plafondCnps: 750000,
  tauxCfc: 1,
  tauxCac: 10,
  abattementIrppAnnuel: 500000,
  tauxFraisProIrpp: 30,
};
