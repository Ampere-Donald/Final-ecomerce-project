import api from './api';

export interface PricingProduct {
  id: string;
  version: number;
  nomProduit: string;
  marque?: string | null;
  code?: string | null;
  codeFamille?: string | null;
  imageUrl?: string | null;
  prixDetail: number | null;
  prixDemiGros: number | null;
  prixGros: number | null;
  estActif: boolean;
  quantiteStock: number;
  categorie: { id: string; nom: string };
}
export interface PricingSummary {
  totalCount: number;
  missingCount: number;
  pricedCount: number;
}
export interface PricingResult {
  data: PricingProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: PricingSummary;
  categories: { id: string; nom: string; count: number }[];
  recentActivity: {
    id: string;
    author: string;
    productName: string;
    prixDetail: number;
    createdAt: string;
  }[];
}
export const cataloguePricingApi = {
  list: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      inStock?: string;
      visibility?: string;
    } = {},
    signal?: AbortSignal,
  ) =>
    api
      .get<PricingResult>('/catalogue-pricing', { params, signal })
      .then((response) => response.data),
  complete: async (
    id: string,
    data: {
      version: number;
      prixDetail: number;
      prixDemiGros?: number;
      prixGros?: number;
    },
  ) => {
    const response = await api.patch(`/catalogue-pricing/${id}`, data);
    if (typeof caches !== 'undefined')
      await caches.delete('newoteg-offline-data-v1').catch(() => {});
    return response.data;
  },
};

export const formatFcfa = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) +
  ' FCFA';
export const parseFcfaInput = (value: string): number | null => {
  const compact = value.replace(/\s/g, '');
  if (!/^\d+$/.test(compact)) return null;
  const amount = Number(compact);
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000_000
    ? amount
    : null;
};
