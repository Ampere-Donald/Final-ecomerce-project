export type StatutBulletin = 'BROUILLON' | 'VALIDE' | 'PAYE' | 'ANNULE';
export type TypeContrat = 'CDI' | 'CDD' | 'STAGE' | 'INTERIM' | 'TACHERON';
export type ModePaiement = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'MOBILE_MONEY' | 'CREDIT';

export interface PrimeDefaut {
  libelle: string;
  montant: number | string;
}

export interface Salarie {
  id: string;
  matricule: string;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  numeroCnps?: string | null;
  niu?: string | null;
  poste: string;
  categorie?: string | null;
  echelon?: string | null;
  dateEmbauche: string;
  typeContrat: TypeContrat;
  dateFinContrat?: string | null;
  salaireBase: number | string;
  primesParDefaut?: PrimeDefaut[] | null;
  modePaiement: ModePaiement;
  banque?: string | null;
  compteBancaire?: string | null;
  actif: boolean;
  adminUserId?: string | null;
  adminUser?: { id: string; nom: string; role: string } | null;
}

export interface BulletinLigne {
  id?: string;
  type: 'GAIN' | 'RETENUE';
  libelle: string;
  base?: number | string | null;
  taux?: number | string | null;
  montant: number | string;
  ordre: number;
  systeme: boolean;
}

export interface Bulletin {
  id: string;
  numero: string;
  salarieId: string;
  periode: string;
  joursTravailles: number;
  salarieNom: string;
  matricule?: string | null;
  numeroCnps?: string | null;
  poste?: string | null;
  categorie?: string | null;
  dateEmbauche?: string | null;
  brutTotal: number | string;
  cnps: number | string;
  irpp: number | string;
  cac: number | string;
  cfc: number | string;
  autresRetenues: number | string;
  totalRetenues: number | string;
  netAPayer: number | string;
  modePaiement?: ModePaiement | null;
  statut: StatutBulletin;
  datePaiement?: string | null;
  valideAt?: string | null;
  createdAt: string;
  lignes?: BulletinLigne[];
  salarie?: Partial<Salarie>;
}

export interface ParametresEmployeur {
  id: string;
  raisonSociale?: string | null;
  adresse?: string | null;
  ville?: string | null;
  niu?: string | null;
  rccm?: string | null;
  cnpsEmployeur?: string | null;
  secteurActivite?: string | null;
  telephone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  signataireNom?: string | null;
  signataireQualite?: string | null;
  tauxCnps?: number | string;
  plafondCnps?: number | string;
  tauxCfc?: number | string;
  tauxCac?: number | string;
  abattementIrppAnnuel?: number | string;
  tauxFraisProIrpp?: number | string;
}

export const STATUT_META: Record<StatutBulletin, { label: string; color: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700' },
  VALIDE: { label: 'Validé', color: 'bg-blue-100 text-blue-800' },
  PAYE: { label: 'Payé', color: 'bg-emerald-100 text-emerald-800' },
  ANNULE: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
};

export const TYPE_CONTRAT_OPTIONS: { value: TypeContrat; label: string }[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'INTERIM', label: 'Intérim' },
  { value: 'TACHERON', label: 'Tâcheron' },
];

export const MODE_PAIEMENT_OPTIONS: { value: ModePaiement; label: string }[] = [
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARTE', label: 'Carte' },
];

/** `2026-06` -> `Juin 2026`. */
export const formatPeriode = (periode: string): string => {
  const [y, m] = (periode || '').split('-').map(Number);
  if (!y || !m) return periode;
  const mois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  return `${mois[m - 1] ?? ''} ${y}`.trim();
};

/** Période courante au format `YYYY-MM`. */
export const periodeCourante = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
