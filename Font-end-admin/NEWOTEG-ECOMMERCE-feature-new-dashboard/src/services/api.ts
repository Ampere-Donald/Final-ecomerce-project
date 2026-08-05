import axios from 'axios';
import { createClientId } from '../utils/clientId';
import { clearAdminSession, getAdminToken } from './adminSession';

// En production, VITE_API_URL pointe vers le backend (ex: https://api.newoteg.com)
// En dev local, le proxy Vite redirige /api vers localhost:3000
// On s'assure que le préfixe /api est toujours présent
const rawUrl = import.meta.env.VITE_API_URL || '/api';
const BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Auth interceptors ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = createClientId('web');
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearAdminSession();
      if (typeof caches !== 'undefined') {
        caches.delete('newoteg-offline-data-v1').catch(() => {});
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(err);
  },
);

const DB_SCHEMA_ERROR_CODES = new Set(['P2021', 'P2022']);

export const getApiErrorMessage = (err: any, fallback: string): string => {
  const data = err?.response?.data;
  const reference = data?.requestId ? ` Référence : ${data.requestId}` : '';

  if (DB_SCHEMA_ERROR_CODES.has(data?.code)) {
    return "Base de données non synchronisée : les tables ou colonnes nécessaires n'existent pas encore. Appliquez la migration Prisma avant de tester ce module.";
  }

  if (Array.isArray(data?.message)) {
    return data.message.join(' ') + reference;
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message + reference;
  }

  return fallback + reference;
};

export const getLoginErrorMessage = (
  err: any,
  invalidCredentialsFallback: string,
): string => {
  if (!err?.response) {
    if (err?.code === 'AUTH_TIMEOUT') {
      return 'Le serveur met trop de temps à répondre. Vérifiez la connexion Internet puis réessayez. Code : AUTH_TIMEOUT.';
    }
    if (err?.code === 'AUTH_SEND_BLOCKED') {
      return "Le navigateur de cet appareil bloque l'envoi de la connexion. Code : AUTH_SEND_BLOCKED.";
    }
    return "Impossible de joindre le serveur depuis cet appareil. Vérifiez Internet puis ouvrez https://admin.newoteg.com. Code : AUTH_NETWORK.";
  }

  return getApiErrorMessage(err, invalidCredentialsFallback);
};

type AuthTransportError = Error & {
  code?: string;
  response?: {
    status: number;
    data: any;
  };
};

function createAuthTransportError(
  message: string,
  code: string,
  status?: number,
  data?: any,
): AuthTransportError {
  const error = new Error(message) as AuthTransportError;
  error.code = code;
  if (typeof status === 'number') {
    error.response = { status, data };
  }
  return error;
}

// Le trajet de connexion reste volontairement indépendant d'Axios, des
// intercepteurs et du stockage local. Cela permet aux anciennes tablettes
// Android de recevoir la réponse du serveur avant toute initialisation locale.
function postAuth<T>(path: string, body: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${BASE_URL}${path}`, true);
    request.timeout = 30000;
    request.setRequestHeader('Accept', 'application/json');
    request.setRequestHeader('Content-Type', 'application/json');

    request.onload = () => {
      let data: any = null;
      try {
        data = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        data = { message: request.responseText };
      }

      if (request.status >= 200 && request.status < 300) {
        resolve(data as T);
        return;
      }

      reject(
        createAuthTransportError(
          `Connexion refusée (${request.status}).`,
          'AUTH_HTTP',
          request.status,
          data,
        ),
      );
    };
    request.onerror = () =>
      reject(createAuthTransportError('Connexion réseau interrompue.', 'AUTH_NETWORK'));
    request.ontimeout = () =>
      reject(createAuthTransportError('Délai de connexion dépassé.', 'AUTH_TIMEOUT'));
    request.onabort = () =>
      reject(createAuthTransportError('Connexion annulée.', 'AUTH_NETWORK'));

    try {
      request.send(JSON.stringify(body));
    } catch {
      reject(
        createAuthTransportError(
          "Le navigateur a bloqué l'envoi de la connexion.",
          'AUTH_SEND_BLOCKED',
        ),
      );
    }
  });
}

// ── Admin Auth API ───────────────────────────────────────────────────────
export const adminAuthApi = {
  login: (username: string, motDePasse: string) =>
    postAuth<any>('/admin-auth/login', { username, motDePasse }),
  loginPin: (username: string, pin: string) =>
    postAuth<any>('/admin-auth/login-pin', { username, pin }),
  getMe: () => api.get('/admin-auth/me').then(res => res.data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.patch('/admin-auth/change-password', { oldPassword, newPassword }).then(res => res.data),
};

// Normalise toute réponse en tableau (gère { data: [...] } et [...] )
const toArray = (res: any): any[] => {
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
};

// Produits
export const produitApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    codeFamille?: string;
    code?: string;
    sort?: string;
    inStock?: boolean;
    salesSearch?: boolean;
  }, config?: { signal?: AbortSignal }) => api.get('/produits', { params, signal: config?.signal }).then(res => res.data),
  getAll: () => api.get('/produits', { params: { limit: 500 } }).then(toArray),
  getOne: (id: string) => api.get(`/produits/${id}`).then(res => res.data),
  create: (data: any) => {
    if (data instanceof FormData) {
      return api.post('/produits', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(res => res.data);
    }
    return api.post('/produits', data).then(res => res.data);
  },
  update: (id: string, data: any) => {
    if (data instanceof FormData) {
      return api.patch(`/produits/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(res => res.data);
    }
    return api.patch(`/produits/${id}`, data).then(res => res.data);
  },
  delete: (id: string) => api.delete(`/produits/${id}`).then(res => res.data),
  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/produits/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
  importZip: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/produits/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min for large ZIPs
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then(res => res.data);
  },
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/produits/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
  getImportStatus: () => api.get('/produits/import/status').then(res => res.data),
  getLowStock: () => api.get('/produits/low-stock').then(toArray),
  findByCode: (codeFamille: string, code: string) =>
    api.get(`/produits/scan/${encodeURIComponent(codeFamille)}/${encodeURIComponent(code)}`).then(res => res.data),
  traduire: (id: string) => api.post(`/produits/${id}/traduire`, {}).then(res => res.data),
  // Douchette USB/Bluetooth : conserver exactement l'ancienne route.
  findByRawScan: (raw: string) =>
    api.get(`/produits/scan-raw/${encodeURIComponent(raw.trim())}`).then(res => res.data),
};

// Bons de commande fournisseur (bilingue, suggestion auto, conversion en achat)
export const commandeFournisseurApi = {
  create: (data: { fournisseurId: string; devise?: string; tauxVersFcfa?: number; notes?: string; lignes: { produitId: string; quantite: number; rate?: number; prixNegocie?: number }[] }) =>
    api.post('/commandes-fournisseur', data).then(r => r.data),
  getAll: () => api.get('/commandes-fournisseur').then(r => r.data),
  getOne: (id: string) => api.get(`/commandes-fournisseur/${id}`).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/commandes-fournisseur/${id}`, data).then(r => r.data),
  suggestions: (params: { categorieId?: string; codeFamille?: string }) =>
    api.get('/commandes-fournisseur/suggestions', { params }).then(r => r.data),
  envoyer: (id: string) => api.post(`/commandes-fournisseur/${id}/envoyer`, {}).then(r => r.data),
  convertirAchat: (id: string) => api.post(`/commandes-fournisseur/${id}/convertir-achat`, {}).then(r => r.data),
  annuler: (id: string) => api.post(`/commandes-fournisseur/${id}/annuler`, {}).then(r => r.data),
};

// Catégories
export const categorieApi = {
  getAll: () => api.get('/categories').then(toArray),
  getOne: (id: string) => api.get(`/categories/${id}`).then(res => res.data),
  create: (data: any) => api.post('/categories', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/categories/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/categories/${id}`).then(res => res.data),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/categories/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
};

// Mouvements de stock
export const mouvementStockApi = {
  getAll: () => api.get('/mouvements-stock').then(toArray),
  create: (data: any) => api.post('/mouvements-stock', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/mouvements-stock/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/mouvements-stock/${id}`).then(res => res.data),
};

// Ventes
export const venteApi = {
  getAll: () => api.get('/ventes').then(toArray),
  getOne: (id: string) => api.get(`/ventes/${id}`).then(res => res.data),
  create: (data: any) => api.post('/ventes', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/ventes/${id}`, data).then(res => res.data),
  cancel: (id: string, motif: string) => api.delete(`/ventes/${id}`, { data: { motif } }).then(res => res.data),
  refund: (id: string, motif: string) => api.post(`/ventes/${id}/rembourser`, { motif }).then(res => res.data),
};

// Achats
export const achatApi = {
  getAll: () => api.get('/achats').then(toArray),
  getOne: (id: string) => api.get(`/achats/${id}`).then(res => res.data),
  create: (data: any) => api.post('/achats', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/achats/${id}`, data).then(res => res.data),
  valider: (id: string) => api.post(`/achats/${id}/valider`, {}).then(res => res.data),
  annuler: (id: string, motifAnnulation?: string) =>
    api.post(`/achats/${id}/annuler`, { motifAnnulation }).then(res => res.data),
  delete: (id: string) => api.delete(`/achats/${id}`).then(res => res.data),
  calculerLot: (id: string, data: any) => api.post(`/achats/${id}/calculer`, data).then(res => res.data),
  validerLot: (id: string, data: any) => api.post(`/achats/${id}/valider-lot`, data).then(res => res.data),
};

// Taux de change
export const tauxChangeApi = {
  getLatest: (devise: string) =>
    api.get('/taux-change/latest', { params: { devise } }).then(res => res.data),
  saveManual: (devise: string, tauxVersFcfa: number, source?: string) =>
    api.post('/taux-change/manual', { devise, tauxVersFcfa, source }).then(res => res.data),
  getHistory: (devise: string, limit = 50) =>
    api.get('/taux-change/history', { params: { devise, limit } }).then(res => res.data),
};

// CMUP
export const cmupApi = {
  preview: (data: { devise: string; tauxVersFcfa: number; lignes: { produitId: string; quantite: number; prixUnitaireDevise: number }[] }) =>
    api.post('/cmup/preview', data).then(res => res.data),
  getAll: () => api.get('/cmup').then(toArray),
  historique: (produitId: string) =>
    api.get(`/cmup/produits/${produitId}/historique`).then(res => res.data),
};

// Clients
export const clientApi = {
  getAll: () => api.get('/clients').then(toArray),
  search: (query: string, limit = 8) =>
    api.get('/clients/search', { params: { q: query, limit } }).then(toArray),
  getOne: (id: string) => api.get(`/clients/${id}`).then(res => res.data),
  create: (data: any) => api.post('/clients', data).then(res => res.data),
  // Crédit clients
  getCredits: () => api.get('/clients/credits').then(toArray),
  getEncours: (id: string) => api.get(`/clients/${id}/encours`).then(res => res.data),
  previewCredit: (id: string, montant: number, acompte = 0) =>
    api.get(`/clients/${id}/credit-preview`, { params: { montant, acompte } }).then(res => res.data),
  getClientCredits: (id: string) => api.get(`/clients/${id}/credits`).then(res => res.data),
};

// Règlements (encaissements partiels sur ventes à crédit)
export const reglementApi = {
  create: (data: { venteId: string; montant: number; methodePaiement: string; note?: string }) =>
    api.post('/reglements', data).then(res => res.data),
  annuler: (id: string, motif: string) =>
    api.delete(`/reglements/${id}`, { data: { motif } }).then(res => res.data),
  byVente: (venteId: string) =>
    api.get('/reglements', { params: { venteId } }).then(res => res.data),
};

// Fournisseurs
export const fournisseurApi = {
  getAll: () => api.get('/fournisseurs').then(toArray),
  create: (data: any) => api.post('/fournisseurs', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/fournisseurs/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/fournisseurs/${id}`).then(res => res.data),
};

// Caisse
export const caisseApi = {
  getAll: () => api.get('/caisse').then(toArray),
  create: (data: any) => api.post('/caisse', data).then(res => res.data),
  transferer: (data: any) => api.post('/caisse/transferer', data).then(res => res.data),
  annuler: (id: string, motifAnnulation: string) =>
    api.post(`/caisse/${id}/annuler`, { motifAnnulation }).then(res => res.data),
  soldeGlobal: () => api.get('/caisse/solde-global').then(res => res.data),
};

// Coffres virtuels
export const coffreApi = {
  getAll: () => api.get('/coffres').then(res => res.data),
  getOne: (id: string) => api.get(`/coffres/${id}`).then(res => res.data),
  create: (data: any) => api.post('/coffres', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/coffres/${id}`, data).then(res => res.data),
  sortie: (id: string, data: any) => api.post(`/coffres/${id}/sortie`, data).then(res => res.data),
  cloturer: (id: string, force = false) => api.post(`/coffres/${id}/cloturer`, { force }).then(res => res.data),
};

// Caisse du jour (session caissier)
export const caisseJourApi = {
  aujourdhui: () => api.get('/caisse-jour/aujourdhui').then(res => res.data),
  historique: (from?: string, to?: string) =>
    api.get('/caisse-jour', { params: { from, to } }).then(res => res.data),
  statsCaissier: (id: string, periode: string) =>
    api.get(`/caisse-jour/caissier/${id}`, { params: { periode } }).then(res => res.data),
  getOne: (id: string) => api.get(`/caisse-jour/${id}`).then(res => res.data),
  fermer: (id: string, data?: { note?: string; coffreId?: string }) =>
    api.post(`/caisse-jour/${id}/fermer`, data || {}).then(res => res.data),
  rouvrir: (id: string) =>
    api.post(`/caisse-jour/${id}/rouvrir`).then(res => res.data),
  addOperation: (
    id: string,
    data: { typeOperation: 'ENTREE' | 'SORTIE'; montant: number; motif: string },
  ) => api.post(`/caisse-jour/${id}/operation`, data).then(res => res.data),
};

// Tickets de vente (vendeur → caissier)
export const ticketApi = {
  verifierStock: (lignes: { produitId: string; quantite: number }[]) =>
    api.post('/tickets/verifier-stock', { lignes }).then(res => res.data),
  create: (data: {
    clientId?: string;
    nomClient?: string;
    telephoneClient?: string;
    noteCaissier?: string;
    lignes: { produitId: string; quantite: number; prixUnitaire?: number; motifRemise?: string }[];
  }) => api.post('/tickets', data).then(res => res.data),
  enAttente: () => api.get('/tickets/en-attente').then(res => res.data),
  mesTickets: () => api.get('/tickets/mes-tickets').then(res => res.data),
  jour: () => api.get('/tickets/jour').then(res => res.data),
  getOne: (id: string) => api.get(`/tickets/${id}`).then(res => res.data),
  encaisser: (
    id: string,
    methodePaiement: 'ESPECES' | 'CARTE' | 'VIREMENT' | 'MOBILE_MONEY' | 'MTN_MOBILE_MONEY' | 'ORANGE_MOBILE_MONEY' | 'CREDIT',
    opts?: { clientId?: string; montantPaye?: number },
  ) =>
    api
      .post(`/tickets/${id}/encaisser`, { methodePaiement, ...opts })
      .then(res => res.data),
  annuler: (id: string, motif?: string) =>
    api.post(`/tickets/${id}/annuler`, { motif }).then(res => res.data),
};

// Échéances + moteur d'alertes
export const echeanceApi = {
  getAll: () => api.get('/echeances').then(res => res.data),
  getAVenir: (jours?: number) =>
    api.get('/echeances/a-venir', { params: jours ? { jours } : {} }).then(res => res.data),
  getOne: (id: string) => api.get(`/echeances/${id}`).then(res => res.data),
  create: (data: any) => api.post('/echeances', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/echeances/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/echeances/${id}`).then(res => res.data),
  declencher: (id: string) => api.post(`/echeances/${id}/declencher`, {}).then(res => res.data),
};

// Commandes (e-commerce orders)
export const commandeApi = {
  getAll: () => api.get('/commandes').then(toArray),
  getOne: (id: string) => api.get(`/commandes/${id}`).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/commandes/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/commandes/${id}`).then(res => res.data),
  cleanupHistory: (params: { before?: string; statut?: string }) =>
    api.delete('/commandes/historique/cleanup', { params }).then(res => res.data),
  processPickup: (id: string, data: { paiementSurPlace: boolean; methodePaiement?: string }) =>
    api.patch(`/commandes/${id}/pickup`, data).then(res => res.data),
};

// Notifications
export const notificationApi = {
  getAll: () => api.get('/notifications').then(toArray),
  getAllPaginated: (params: { page?: number; limit?: number; type?: string; actorName?: string; search?: string; lue?: string }) =>
    api.get('/notifications/all', { params }).then(res => res.data),
  unreadCount: () => api.get('/notifications/unread-count').then(res => res.data),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`).then(res => res.data),
  markAsUnread: (id: string) => api.patch(`/notifications/${id}/unread`).then(res => res.data),
  markAllAsRead: () => api.patch('/notifications/read-all').then(res => res.data),
};

// Admin Account Management (SUPER_ADMIN only)
export const adminAccountApi = {
  getAll: () => api.get('/admin-auth/admins').then(res => res.data),
  create: (data: { email?: string; username?: string; motDePasse?: string; pin?: string; nom: string; role: string; photoUrl?: string }) =>
    api.post('/admin-auth/admins', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/admin-auth/admins/${id}`, data).then(res => res.data),
  resetPassword: (id: string, newPassword: string) =>
    api.patch(`/admin-auth/admins/${id}/reset-password`, { newPassword }).then(res => res.data),
  toggleActive: (id: string) =>
    api.patch(`/admin-auth/admins/${id}/toggle-active`).then(res => res.data),
  getActivity: (id: string, limit = 50) =>
    api.get(`/admin-auth/admins/${id}/activity`, { params: { limit } }).then(res => res.data),
  getRoleHistory: (id: string) =>
    api.get(`/admin-auth/admins/${id}/role-history`).then(res => res.data),
  delete: (id: string) => api.delete(`/admin-auth/admins/${id}`).then(res => res.data),
};

// Search
export const searchApi = {
  search: (q: string) => api.get('/search', { params: { q } }).then(res => res.data),
};

// Équivalences (IA Gemini)
export const equivalenceApi = {
  suggest: (data: { query?: string; produitId?: string; source?: 'pos' | 'ecommerce'; vendeurId?: string }) =>
    api.post('/equivalence/suggest', data).then(res => res.data),
  stats: () => api.get('/equivalence/stats').then(res => res.data),
  health: () => api.get('/equivalence/health').then(res => res.data),
};

// Roles
export const roleApi = {
  getAll: () => api.get('/roles').then(toArray),
  create: (data: any) => api.post('/roles', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/roles/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/roles/${id}`).then(res => res.data),
};

// Attributs
export const attributApi = {
  getAll: () => api.get('/attributs').then(toArray),
  create: (data: any) => api.post('/attributs', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/attributs/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/attributs/${id}`).then(res => res.data),
};

// Valeurs d'attributs
export const valeurAttributApi = {
  getAll: () => api.get('/valeur-attributs').then(toArray),
  create: (data: any) => api.post('/valeur-attributs', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/valeur-attributs/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/valeur-attributs/${id}`).then(res => res.data),
};

export const bonVenteApi = {
  create: (data: any) => api.post('/bons', data).then(r => r.data),
  mesBons: () => api.get('/bons/mes-bons').then(r => r.data),
  annuler: (id: string) => api.post(`/bons/${id}/annuler`).then(r => r.data),
  monScore: () => api.get('/primes/mon-score').then(r => r.data),
  pending: () => api.get('/bons/pending').then(r => r.data),
  valider: (id: string, body: {
    methodePaiement: string;
    clientId?: string | null;
    montantPaye?: number;
    montantRecu?: number;
    documentType?: 'TICKET_CAISSE' | 'FACTURE' | 'BON_VENTE';
    referencePaiement?: string;
    dateEcheance?: string;
    idempotencyKey?: string;
  }) => api.post(`/bons/${id}/valider`, body).then(r => r.data),
};

export const factureApi = {
  getAll: (params?: any) => api.get('/factures', { params }).then(r => r.data),
  getOne: (id: string) => api.get(`/factures/${id}`).then(r => r.data),
  print: (id: string) => api.post(`/factures/${id}/print`).then(r => r.data),
};

export const diagnosticApi = {
  record: (data: {
    action: 'SYNC_FAILURE' | 'FRONTEND_ERROR';
    code: string;
    operationKind?: 'VENTE' | 'BON' | 'TICKET';
    operationId?: string;
    workstationId?: string;
    state?: 'RETRY' | 'CONFLICT';
  }) => api.post('/admin-auth/diagnostic-events', data).then(res => res.data),
};

export const documentPrintApi = {
  record: (data: {
    documentType: 'TICKET' | 'FACTURE' | 'BON_VENTE' | 'PROFORMA' | 'FACTURE_VIRTUELLE';
    documentId?: string;
    documentNumber: string;
    status: 'SUCCESS' | 'FAILED';
    workstationId?: string;
    printerName?: string;
    errorCode?: string;
  }) => api.post('/factures/print-events', data).then(r => r.data),
  list: (params?: { documentType?: string; documentNumber?: string }) =>
    api.get('/factures/print-events', { params }).then(r => r.data),
};

export const primeApi = {
  classement: (periode: string) =>
    api.get('/primes/classement', { params: { periode } }).then(r => r.data),
  detailVendeur: (id: string, periode: string) =>
    api.get(`/primes/vendeur/${id}`, { params: { periode } }).then(r => r.data),
  monScore: () => api.get('/primes/mon-score').then(r => r.data),
  valider: (id: string) => api.patch(`/primes/${id}/valider`).then(r => r.data),
  payer: (id: string) => api.patch(`/primes/${id}/payer`).then(r => r.data),
};

export const proformaApi = {
  getAll: (params?: any) => api.get('/proformas', { params }).then(r => r.data),
  getOne: (id: string) => api.get(`/proformas/${id}`).then(r => r.data),
  create: (data: any) => api.post('/proformas', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/proformas/${id}`, data).then(r => r.data),
  transformer: (id: string, body: { methodePaiement: string }) =>
    api.post(`/proformas/${id}/transformer`, body).then(r => r.data),
  remove: (id: string) => api.delete(`/proformas/${id}`).then(r => r.data),
};

export const factureVirtuelleApi = {
  create: (data: any) => api.post('/facture-virtuelle', data).then(r => r.data),
  getAll: (params?: any) => api.get('/facture-virtuelle', { params }).then(r => r.data),
  getOne: (id: string) => api.get(`/facture-virtuelle/${id}`).then(r => r.data),
  approuver: (id: string) => api.post(`/facture-virtuelle/${id}/approuver`).then(r => r.data),
  refuser: (id: string, motif: string) => api.post(`/facture-virtuelle/${id}/refuser`, { motif }).then(r => r.data),
  print: (id: string) => api.post(`/facture-virtuelle/${id}/print`).then(r => r.data),
  remove: (id: string) => api.delete(`/facture-virtuelle/${id}`).then(r => r.data),
};

export const adminRoleApi = {
  changerRole: (id: string, role: string) =>
    api.patch(`/admin-auth/${id}/role`, { role }).then(r => r.data),
};

// Inventaire par catégorie/famille + délégations
export const inventaireApi = {
  create: (data: { categorieId?: string; codeFamille?: string }) =>
    api.post('/inventaires', data).then(r => r.data),
  getAll: () => api.get('/inventaires').then(r => r.data),
  getOne: (id: string) => api.get(`/inventaires/${id}`).then(r => r.data),
  comptage: (id: string, lignes: { id: string; stockCompte: number }[]) =>
    api.patch(`/inventaires/${id}/comptage`, { lignes }).then(r => r.data),
  valider: (id: string) => api.post(`/inventaires/${id}/valider`, {}).then(r => r.data),
  annuler: (id: string) => api.post(`/inventaires/${id}/annuler`, {}).then(r => r.data),
  // Délégations (super admin)
  listDelegations: () => api.get('/inventaires/delegations').then(r => r.data),
  accorderDelegation: (data: { adminUserId: string; finAt: string; motif?: string }) =>
    api.post('/inventaires/delegations', data).then(r => r.data),
  revoquerDelegation: (id: string) =>
    api.post(`/inventaires/delegations/${id}/revoquer`, {}).then(r => r.data),
};

// Paie — salariés & bulletins de paie
export const paieApi = {
  // Paramètres employeur (en-tête légal du bulletin + taux)
  getParametres: () => api.get('/paie/parametres').then(r => r.data),
  updateParametres: (data: any) => api.put('/paie/parametres', data).then(r => r.data),
  // Salariés
  listSalaries: () => api.get('/paie/salaries').then(r => r.data),
  getSalarie: (id: string) => api.get(`/paie/salaries/${id}`).then(r => r.data),
  createSalarie: (data: any) => api.post('/paie/salaries', data).then(r => r.data),
  updateSalarie: (id: string, data: any) => api.patch(`/paie/salaries/${id}`, data).then(r => r.data),
  toggleSalarieActif: (id: string) => api.patch(`/paie/salaries/${id}/toggle-actif`).then(r => r.data),
  // Bulletins
  listBulletins: (params?: { periode?: string; salarieId?: string; statut?: string }) =>
    api.get('/paie/bulletins', { params }).then(r => r.data),
  getBulletin: (id: string) => api.get(`/paie/bulletins/${id}`).then(r => r.data),
  previewBulletin: (data: any) => api.post('/paie/bulletins/preview', data).then(r => r.data),
  createBulletin: (data: any) => api.post('/paie/bulletins', data).then(r => r.data),
  updateBulletin: (id: string, data: any) => api.patch(`/paie/bulletins/${id}`, data).then(r => r.data),
  validerBulletin: (id: string) => api.post(`/paie/bulletins/${id}/valider`, {}).then(r => r.data),
  payerBulletin: (id: string, data?: any) => api.post(`/paie/bulletins/${id}/payer`, data || {}).then(r => r.data),
  annulerBulletin: (id: string) => api.post(`/paie/bulletins/${id}/annuler`, {}).then(r => r.data),
  removeBulletin: (id: string) => api.delete(`/paie/bulletins/${id}`).then(r => r.data),
};

export default api;
