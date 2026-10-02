import api from "./api";

export type ProjectProduct = {
  id: string;
  nomProduit: string;
  code?: string | null;
  estActif: boolean;
  description?: string | null;
  marque?: string | null;
  categorie?: { id: string; nom: string };
  prixDetail?: number | null;
  quantiteStock?: number;
  urlDatasheet?: string | null;
  attributs?: { nomAttribut: string; valeurs: { valeur: string }[] }[];
};
export type ProjectDocument = { titre: string; url: string };
export type ProjectLine = {
  id: string;
  produitId?: string | null;
  reference?: string | null;
  nomProduit: string;
  role: string;
  quantite: number;
  necessaire: boolean;
  ordre: number;
  produit: ProjectProduct | null;
  empreinteActuelle: string | null;
  empreinteTechnique?: string | null;
};
export type ProjectRow = {
  id: string;
  version: number;
  slug: string;
  titre: string;
  titreEn?: string | null;
  resume: string;
  resumeEn?: string | null;
  objectif: string;
  prerequis: string;
  contraintes: string;
  niveau: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
  imageUrl?: string | null;
  ordre: number;
  debutPublication?: string | null;
  finPublication?: string | null;
  statut: "BROUILLON" | "PUBLIE";
  valideAt?: string | null;
  noteValidation?: string | null;
  lignes: ProjectLine[];
  documents: ProjectDocument[];
  historique?: {
    id: string;
    action: string;
    versionAppliquee: number;
    createdAt: string;
  }[];
};
export type ProjectResult = {
  projet: ProjectRow;
  operation: { requestId: string; versionAppliquee: number; rejoue: boolean };
};
export type ProjectPayload = Record<string, unknown> & { requestId: string };
export const projetApi = {
  list: () => api.get<ProjectRow[]>("/projets/admin").then((r) => r.data),
  get: (id: string) =>
    api
      .get<ProjectRow>(`/projets/admin/${encodeURIComponent(id)}`)
      .then((r) => r.data),
  create: (payload: ProjectPayload) =>
    api.post<ProjectResult>("/projets/admin", payload).then((r) => r.data),
  update: (id: string, payload: ProjectPayload) =>
    api
      .patch<ProjectResult>(`/projets/admin/${encodeURIComponent(id)}`, payload)
      .then((r) => r.data),
  publish: (id: string, payload: ProjectPayload) =>
    api
      .post<ProjectResult>(
        `/projets/admin/${encodeURIComponent(id)}/publication`,
        payload,
      )
      .then((r) => r.data),
  withdraw: (id: string, payload: ProjectPayload) =>
    api
      .post<ProjectResult>(
        `/projets/admin/${encodeURIComponent(id)}/retrait`,
        payload,
      )
      .then((r) => r.data),
};
