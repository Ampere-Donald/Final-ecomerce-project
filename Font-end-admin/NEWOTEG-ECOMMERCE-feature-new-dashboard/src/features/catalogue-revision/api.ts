import api from "../../services/api";
export type Subject =
  | "PRIX"
  | "CLASSEMENT"
  | "IDENTIFICATION"
  | "PHOTO"
  | "COMPLET"
  | "ARCHIVAGE";
export const subjectLabels: Record<Subject, string> = {
  PRIX: "Prix",
  CLASSEMENT: "Classement",
  IDENTIFICATION: "Identification",
  PHOTO: "Photo",
  COMPLET: "Fiche complète",
  ARCHIVAGE: "Article arrêté",
};
export const reviewSubjects: Subject[] = [
  "IDENTIFICATION",
  "PRIX",
  "CLASSEMENT",
  "PHOTO",
];
export const subjectPrefix = {
  PRIX: "prix",
  CLASSEMENT: "classement",
  IDENTIFICATION: "identification",
  PHOTO: "photo",
};
export const isVerified = (p: Product, subject: Subject) => {
  const prefix = subjectPrefix[subject];
  return (
    p[`${prefix}VerifieRevision`] != null &&
    p[`${prefix}VerifieRevision`] === p[`${prefix}Revision`]
  );
};
export interface Progress {
  total: number;
  remaining: number;
  pending: number;
  discussion: number;
  complete: number;
}
export interface Category {
  id: string;
  nom: string;
  sousCategories: { id: string; nom: string; _count?: { produits: number } }[];
}
export interface Product {
  id: string;
  nomProduit: string;
  marque?: string | null;
  referenceFabricant?: string | null;
  identificationRevision: number;
  photoRevision: number;
  identificationVerifieRevision: number | null;
  photoVerifieRevision: number | null;
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
  presence?: { auteurId: string; auteurNom: string }[];
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
  identificationRevision?: number;
  photoRevision?: number;
  commentaire?: string;
  changements?: Record<string, unknown>;
}
export interface Listing {
  catalogueTotal?: number;
  data: Product[];
  total: number;
  page: number;
  lastPage: number;
  counts: Record<string, number>;
}
export const revisionApi = {
  overview: () =>
    api
      .get<Record<string, Progress>>("/catalogue-revisions/progression")
      .then((r) => r.data),
  presence: (id: string) =>
    api.post(`/catalogue-revisions/produits/${id}/presence`),
  releasePresence: (id: string) =>
    api.delete(`/catalogue-revisions/produits/${id}/presence`),
  photo: (file: Blob) => {
    const data = new FormData();
    data.append("file", file, "photo.jpg");
    return api
      .post<{ imageUrl: string }>("/catalogue-revisions/photos", data)
      .then((r) => r.data);
  },
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
  nomProduit: "Nom de l’article",
  marque: "Marque",
  referenceFabricant: "Référence fabricant",
  imageUrl: "Photo principale",
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
  identificationRevision: p.identificationRevision,
  photoRevision: p.photoRevision,
});
export const dateLabel = (s: string) => new Date(s).toLocaleString("fr-FR");
