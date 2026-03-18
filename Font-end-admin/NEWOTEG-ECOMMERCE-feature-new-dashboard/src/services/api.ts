import axios from 'axios';

// Utiliser le proxy configuré dans vite.config.ts
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Produits
export const produitApi = {
  getAll: () => api.get('/produits').then(res => res.data),
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
  getAll: () => api.get('/categories').then(res => res.data),
  getOne: (id: string) => api.get(`/categories/${id}`).then(res => res.data),
  create: (data: any) => api.post('/categories', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/categories/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/categories/${id}`).then(res => res.data),
};

// Variantes (Stock unitaire / prix d'un produit)
export const varianteApi = {
  getAll: () => api.get('/variantes-produit').then(res => res.data),
  getOne: (id: string) => api.get(`/variantes-produit/${id}`).then(res => res.data),
  create: (data: any) => api.post('/variantes-produit', data).then(res => res.data),
  update: (id: string, data: any) => api.patch(`/variantes-produit/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/variantes-produit/${id}`).then(res => res.data),
};

// Mouvements de stock
export const mouvementStockApi = {
  getAll: () => api.get('/mouvements-stock').then(res => res.data),
  create: (data: any) => api.post('/mouvements-stock', data).then(res => res.data),
};

// Ventes
export const venteApi = {
  getAll: () => api.get('/ventes').then(res => res.data),
  create: (data: any) => api.post('/ventes', data).then(res => res.data),
};

// Achats
export const achatApi = {
  getAll: () => api.get('/achats').then(res => res.data),
  create: (data: any) => api.post('/achats', data).then(res => res.data),
};

// Clients
export const clientApi = {
  getAll: () => api.get('/clients').then(res => res.data),
  create: (data: any) => api.post('/clients', data).then(res => res.data),
};

// Fournisseurs
export const fournisseurApi = {
  getAll: () => api.get('/fournisseurs').then(res => res.data),
  create: (data: any) => api.post('/fournisseurs', data).then(res => res.data),
};

// Caisse
export const caisseApi = {
  getAll: () => api.get('/caisse').then(res => res.data),
};

export default api;
