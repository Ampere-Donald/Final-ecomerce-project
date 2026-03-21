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

// Normalise toute réponse en tableau (gère { data: [...] } et [...] )
const toArray = (res: any): any[] => {
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
};

// Produits
export const produitApi = {
  getAll: () => api.get('/produits?limit=1000').then(toArray),
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
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/produits/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
};

// Catégories
export const categorieApi = {
  getAll: () => api.get('/categories').then(toArray),
  getOne: (id: string) => api.get(`/categories/${id}`).then(res => res.data),
  create: (data: any) => api.post('/categories', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/categories/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/categories/${id}`).then(res => res.data),
};

// Mouvements de stock
export const mouvementStockApi = {
  getAll: () => api.get('/mouvements-stock').then(toArray),
  create: (data: any) => api.post('/mouvements-stock', data).then(res => res.data),
};

// Ventes
export const venteApi = {
  getAll: () => api.get('/ventes').then(toArray),
  create: (data: any) => api.post('/ventes', data).then(res => res.data),
};

// Achats
export const achatApi = {
  getAll: () => api.get('/achats').then(toArray),
  create: (data: any) => api.post('/achats', data).then(res => res.data),
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
};

// Caisse
export const caisseApi = {
  getAll: () => api.get('/caisse').then(toArray),
};

// Commandes (e-commerce orders)
export const commandeApi = {
  getAll: () => api.get('/commandes').then(toArray),
  getOne: (id: string) => api.get(`/commandes/${id}`).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/commandes/${id}`, data).then(res => res.data),
};

// Notifications
export const notificationApi = {
  getAll: () => api.get('/notifications').then(toArray),
  unreadCount: () => api.get('/notifications/unread-count').then(res => res.data),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`).then(res => res.data),
  markAllAsRead: () => api.patch('/notifications/read-all').then(res => res.data),
};

// Search
export const searchApi = {
  search: (q: string) => api.get('/search', { params: { q } }).then(res => res.data),
};

export default api;
