export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'VENDEUR' | 'MANAGER';

const isAdmin = (role?: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role || '');
const isManager = (role?: string) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role || '');
const isSuper = (role?: string) => role === 'SUPER_ADMIN';
const isCaissier = (role?: string) => role === 'CAISSIER';
const isVendeur = (role?: string) => role === 'VENDEUR';

export const can = {
  // ── Pilotage ────────────────────────────────────────────────
  accessDashboard: (r?: string) => isAdmin(r),
  accessAnalyses: (r?: string) => isAdmin(r),
  accessNotificationsPage: (r?: string) => isAdmin(r),

  // ── Finance ─────────────────────────────────────────────────
  accessCaisseGlobale: (r?: string) => isAdmin(r),
  accessCaisseJour: (r?: string) => isAdmin(r) || isCaissier(r),
  accessCoffres: (r?: string) => isAdmin(r),
  accessEcheances: (r?: string) => isAdmin(r),
  deleteEcheance: (r?: string) => isSuper(r),
  annulerTransaction: (r?: string) => isSuper(r),

  // alias rétrocompat (utilisé par l'ancien Sidebar)
  accessCaisse: (r?: string) => isAdmin(r) || isCaissier(r),

  // ── Boutique (POS local) ────────────────────────────────────
  accessPOSVendeur: (r?: string) => isAdmin(r) || isVendeur(r),
  accessMesTickets: (r?: string) => isAdmin(r) || isVendeur(r),
  accessFileCaissier: (r?: string) => isAdmin(r) || isCaissier(r),
  accessTicketsJour: (r?: string) => isAdmin(r),
  creerProforma: (r?: string) => isAdmin(r) || isVendeur(r),
  voirProformas: (r?: string) => isAdmin(r) || isVendeur(r) || isCaissier(r),

  // ── E-commerce ──────────────────────────────────────────────
  accessCommandesEnLigne: (r?: string) => isAdmin(r) || isVendeur(r),
  accessPromotions: (r?: string) => isAdmin(r),

  // ── Catalogue ───────────────────────────────────────────────
  voirProduits: (_r?: string) => true,
  voirPrixAchat: (r?: string) => isAdmin(r),
  modifierProduits: (r?: string) => isAdmin(r),
  supprimerProduits: (r?: string) => isSuper(r),
  accessStock: (r?: string) => isAdmin(r),
  accessAchats: (r?: string) => isAdmin(r),
  accessCmup: (r?: string) => isAdmin(r),
  accessScanCode: (r?: string) => !isCaissier(r),
  validerAchat: (r?: string) => isManager(r),

  // ── Relation ────────────────────────────────────────────────
  accessClients: (r?: string) => isAdmin(r) || isVendeur(r),
  accessCredits: (r?: string) => isAdmin(r) || isCaissier(r),
  enregistrerReglement: (r?: string) => isAdmin(r) || isCaissier(r),
  accessFournisseurs: (r?: string) => isAdmin(r),
  accessEmployes: (r?: string) => isSuper(r),

  // ── Système ─────────────────────────────────────────────────
  accessParametres: (r?: string) => isSuper(r),
  accessRoles: (r?: string) => isSuper(r),
  accessAccounts: (r?: string) => isSuper(r),

  // ── Bons de vente + Primes ──────────────────────────────────
  creerBon: (r?: string) => isVendeur(r),
  validerBon: (r?: string) => isCaissier(r) || isSuper(r),
  voirPrimes: (r?: string) => isAdmin(r),
  validerPrime: (r?: string) => isSuper(r),
  voirFactures: (r?: string) => isAdmin(r) || isCaissier(r),
  voirMarges: (r?: string) => isAdmin(r),
  voirSoldeGlobal: (r?: string) => isAdmin(r),

  // ── Divers (rétrocompat / utils) ────────────────────────────
  deleteEntities: (r?: string) => isAdmin(r),
  exportCsv: (r?: string) => isAdmin(r),
};
