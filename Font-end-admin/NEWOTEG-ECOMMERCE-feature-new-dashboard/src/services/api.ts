import axios from 'axios';

// En production, VITE_API_URL pointe vers le backend (ex: https://api.newoteg.com)
// En dev local, le proxy Vite redirige /api vers localhost:3000
// On s'assure que le préfixe /api est toujours présent
const rawUrl = import.meta.env.VITE_API_URL || '/api';
const BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Auth interceptors ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('newoteg_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('newoteg_admin_token');
      localStorage.removeItem('newoteg_admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// ── Admin Auth API ───────────────────────────────────────────────────────
export const adminAuthApi = {
  login: (email: string, motDePasse: string) =>
    api.post('/admin-auth/login', { email, motDePasse }).then(res => res.data),
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
  getAll: () => api.get('/produits?limit=20000').then(toArray),
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
};

// Achats
export const achatApi = {
  getAll: () => api.get('/achats').then(toArray),
  getOne: (id: string) => api.get(`/achats/${id}`).then(res => res.data),
  create: (data: any) => api.post('/achats', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/achats/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/achats/${id}`).then(res => res.data),
};

// Clients
export const clientApi = {
  getAll: () => api.get('/clients').then(toArray),
  getOne: (id: string) => api.get(`/clients/${id}`).then(res => res.data),
  create: (data: any) => api.post('/clients', data).then(res => res.data),
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
  create: (data: { email: string; motDePasse: string; nom: string; role: string }) =>
    api.post('/admin-auth/admins', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/admin-auth/admins/${id}`, data).then(res => res.data),
  resetPassword: (id: string, newPassword: string) =>
    api.patch(`/admin-auth/admins/${id}/reset-password`, { newPassword }).then(res => res.data),
  delete: (id: string) => api.delete(`/admin-auth/admins/${id}`).then(res => res.data),
};

// Search
export const searchApi = {
  search: (q: string) => api.get('/search', { params: { q } }).then(res => res.data),
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
};

export const caisseValidationApi = {
  pending: () => api.get('/bons/pending').then(r => r.data),
  valider: (id: string) => api.post(`/bons/${id}/valider`).then(r => r.data),
};

export const factureApi = {
  getAll: (params?: any) => api.get('/factures', { params }).then(r => r.data),
  getOne: (id: string) => api.get(`/factures/${id}`).then(r => r.data),
  print: (id: string) => api.post(`/factures/${id}/print`).then(r => r.data),
};

export const primeApi = {
  classement: (periode: string) =>
    api.get('/primes/classement', { params: { periode } }).then(r => r.data),
  monScore: () => api.get('/primes/mon-score').then(r => r.data),
  valider: (id: string) => api.patch(`/primes/${id}/valider`).then(r => r.data),
  payer: (id: string) => api.patch(`/primes/${id}/payer`).then(r => r.data),
};

export const adminRoleApi = {
  changerRole: (id: string, role: string) =>
    api.patch(`/admin-auth/${id}/role`, { role }).then(r => r.data),
};

export default api;
