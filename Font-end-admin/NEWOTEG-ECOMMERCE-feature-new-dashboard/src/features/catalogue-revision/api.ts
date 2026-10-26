import api from "../../services/api";
export type Subject = "PRIX" | "CLASSEMENT" | "ARCHIVAGE";
export interface Category {
  id: string;
  nom: string;
  sousCategories: { id: string; nom: string; _count?: { produits: number } }[];
}
export interface Product {
  id: string;
  nomProduit: string;
  code?: string;
  imageUrl?: string;
  quantiteStock: number;
  categorieId: string;
  sousCategorieId: string | null;
  categorie?: { nom: string };
  sousCategorie?: { nom: string };
  prixDetail: number | null;
  prixDemiGros: number | null;
  prixGros: number | null;
  prixPromo: number | null;
  finPromo: string | null;
  quantiteGros: number | null;
  estActif: boolean;
  prixRevision: number;
  classementRevision: number;
  commercialRevision: number;
  prixVerifieRevision: number | null;
  classementVerifieRevision: number | null;
  prixVerifieAt?: string;
  prixVerifiePar?: string;
  propositionsCatalogue?: Proposal[];
}
export interface Proposal {
  id: string;
  sujet: Subject;
  type: string;
  statut: string;
  auteurNom: string;
  createdAt: string;
  commentaire?: string;
  changements: Record<string, unknown>;
  observe: Product;
}
export interface Detail {
  produit: Product;
  propositions: Proposal[];
  historique: {
    id: string;
    acteurNom: string;
    action: string;
    createdAt: string;
    avant: Product;
    apres: Product & { commentaire?: string };
  }[];
}
export interface Mutation {
  operationId: string;
  action: string;
  sujet: Subject;
  type?: string;
  propositionId?: string;
  prixRevision: number;
  classementRevision: number;
  commercialRevision: number;
  commentaire?: string;
  changements?: Record<string, unknown>;
}
export interface Listing {
  data: Product[];
  total: number;
  page: number;
  lastPage: number;
  counts: Record<string, number>;
}
export const revisionApi = {
  list: (params: Record<string, string>) =>
    api.get<Listing>("/catalogue-revisions", { params }).then((r) => r.data),
  detail: (id: string) =>
    api.get<Detail>(`/catalogue-revisions/produits/${id}`).then((r) => r.data),
  equipe: () =>
    api
      .get<{ id: string; nom: string }[]>("/catalogue-revisions/equipe")
      .then((r) => r.data),
  categories: () =>
    api
      .get<
        Category[]
      >("/categories", { params: { includeSousCategories: true, fresh: Date.now() } })
      .then((r) => r.data),
  action: (id: string, data: Mutation) =>
    api
      .post(`/catalogue-revisions/produits/${id}/actions`, data)
      .then((r) => r.data),
  batch: (items: (Mutation & { produitId: string })[]) =>
    api
      .post<{
        results: { produitId: string; ok: boolean; message?: string }[];
      }>("/catalogue-revisions/selection", { items })
      .then((r) => r.data),
  saveSub: (id: string | null, data: { categorieId: string; nom: string }) =>
    (id
      ? api.patch(`/catalogue-revisions/sous-categories/${id}`, data)
      : api.post("/catalogue-revisions/sous-categories", data)
    ).then((r) => r.data),
  deleteSub: (id: string) =>
    api.delete(`/catalogue-revisions/sous-categories/${id}`),
};
export const money = (value: unknown) =>
  value == null || value === ""
    ? "Non renseigné"
    : `${Number(value).toLocaleString("fr-FR")} FCFA`;
export const fieldLabels: Record<string, string> = {
  prixDetail: "Prix détail",
  prixDemiGros: "Prix demi-gros",
  prixGros: "Prix gros",
  prixPromo: "Prix promotionnel",
  quantiteGros: "Quantité gros",
  finPromo: "Fin de promotion",
  categorieId: "Catégorie",
  sousCategorieId: "Sous-catégorie",
};
export const expected = (p: Product) => ({
  prixRevision: p.prixRevision,
  classementRevision: p.classementRevision,
  commercialRevision: p.commercialRevision,
});
export const dateLabel = (s: string) => new Date(s).toLocaleString("fr-FR");
