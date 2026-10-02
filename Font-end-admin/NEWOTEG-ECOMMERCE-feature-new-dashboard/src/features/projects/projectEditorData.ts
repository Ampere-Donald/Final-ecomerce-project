import { createClientId } from "../../utils/clientId";
import type {
  ProjectDocument,
  ProjectPayload,
  ProjectProduct,
  ProjectRow,
} from "../../services/projets";

export type EditorLine = {
  key: string;
  produitId: string;
  referenceSouhaitee: string;
  role: string;
  quantite: string;
  necessaire: boolean;
  produit: ProjectProduct | null;
};
export type ProjectForm = {
  slug: string;
  titre: string;
  titreEn: string;
  resume: string;
  resumeEn: string;
  objectif: string;
  prerequis: string;
  contraintes: string;
  niveau: ProjectRow["niveau"];
  imageUrl: string;
  ordre: string;
  debutPublication: string;
  finPublication: string;
  documents: ProjectDocument[];
  lignes: EditorLine[];
};
export type ProjectAttempt = {
  kind: "create" | "update" | "publish" | "withdraw";
  projectId: string;
  payload: ProjectPayload;
};
export type EditorSession = {
  schema: 1;
  actorKey: string;
  projectId: string;
  baseVersion: number;
  form: ProjectForm;
  pending: ProjectAttempt | null;
};
export function safeDocumentUrl(value?: string | null): string | null {
  try {
    const url = new URL(value || "");
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function validProduct(value: unknown): value is ProjectProduct {
  const p = value as ProjectProduct;
  return Boolean(
    p &&
    typeof p.id === "string" &&
    typeof p.nomProduit === "string" &&
    typeof p.estActif === "boolean" &&
    (p.code == null || typeof p.code === "string") &&
    (p.description == null || typeof p.description === "string") &&
    (p.attributs == null ||
      (Array.isArray(p.attributs) &&
        p.attributs.every(
          (a) =>
            a &&
            typeof a.nomAttribut === "string" &&
            Array.isArray(a.valeurs) &&
            a.valeurs.every((v) => v && typeof v.valeur === "string"),
        ))),
  );
}
export const editorKey = (actorKey: string) =>
  `newoteg_project_editor_v1:${actorKey}`;
export const blankForm = (): ProjectForm => ({
  slug: "",
  titre: "",
  titreEn: "",
  resume: "",
  resumeEn: "",
  objectif: "",
  prerequis: "",
  contraintes: "",
  niveau: "DEBUTANT",
  imageUrl: "",
  ordre: "0",
  debutPublication: "",
  finPublication: "",
  documents: [],
  lignes: [],
});
export const blankLine = (): EditorLine => ({
  key: createClientId(),
  produitId: "",
  referenceSouhaitee: "",
  role: "",
  quantite: "1",
  necessaire: true,
  produit: null,
});
export function publicProduct(product: ProjectProduct): ProjectProduct {
  return {
    id: product.id,
    nomProduit: product.nomProduit,
    code: product.code,
    estActif: product.estActif,
    description: product.description,
    marque: product.marque,
    categorie: product.categorie
      ? { id: product.categorie.id, nom: product.categorie.nom }
      : undefined,
    prixDetail: product.prixDetail,
    quantiteStock: product.quantiteStock,
    urlDatasheet: product.urlDatasheet,
    attributs: product.attributs?.map((a) => ({
      nomAttribut: a.nomAttribut,
      valeurs: a.valeurs.map((v) => ({ valeur: v.valeur })),
    })),
  };
}
function localTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function formFromProject(row: ProjectRow): ProjectForm {
  return {
    slug: row.slug,
    titre: row.titre,
    titreEn: row.titreEn || "",
    resume: row.resume,
    resumeEn: row.resumeEn || "",
    objectif: row.objectif,
    prerequis: row.prerequis,
    contraintes: row.contraintes,
    niveau: row.niveau,
    imageUrl: row.imageUrl || "",
    ordre: String(row.ordre),
    debutPublication: localTime(row.debutPublication),
    finPublication: localTime(row.finPublication),
    documents: row.documents.map((d) => ({ titre: d.titre, url: d.url })),
    lignes: row.lignes.map((line) => ({
      key: line.id,
      produitId: line.produit?.id || "",
      referenceSouhaitee: line.reference || "",
      role: line.role,
      quantite: String(line.quantite),
      necessaire: line.necessaire,
      produit: line.produit ? publicProduct(line.produit) : null,
    })),
  };
}
export function formPayload(
  form: ProjectForm,
): Omit<ProjectPayload, "requestId"> {
  const ordre = Number(form.ordre);
  if (
    !form.titre.trim() ||
    form.titre.trim().length < 3 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) ||
    form.slug.length < 3 ||
    form.slug.length > 100
  )
    throw Error(
      "Renseignez un titre et un lien composé de lettres minuscules, chiffres et tirets.",
    );
  if (!Number.isSafeInteger(ordre) || ordre < 0 || ordre > 100000)
    throw Error("L’ordre doit être un entier entre 0 et 100 000.");
  const ids = form.lignes.map((line) => line.produitId).filter(Boolean);
  if (new Set(ids).size !== ids.length)
    throw Error(
      "Une pièce ne peut figurer qu’une fois ; regroupez sa quantité.",
    );
  const lignes = form.lignes.map((line) => {
    const quantite = Number(line.quantite);
    if (
      !Number.isSafeInteger(quantite) ||
      quantite < 1 ||
      quantite > 10000 ||
      !line.role.trim()
    )
      throw Error(
        "Chaque ligne exige un rôle et une quantité entière entre 1 et 10 000.",
      );
    return {
      ...(line.produitId ? { produitId: line.produitId } : {}),
      ...(line.referenceSouhaitee.trim()
        ? { referenceSouhaitee: line.referenceSouhaitee.trim() }
        : {}),
      role: line.role.trim(),
      quantite,
      necessaire: line.necessaire,
    };
  });
  const date = (value: string) => {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime()))
      throw Error("Vérifiez les dates de publication.");
    return parsed.toISOString();
  };
  const debutPublication = form.debutPublication
    ? date(form.debutPublication)
    : undefined;
  const finPublication = form.finPublication
    ? date(form.finPublication)
    : undefined;
  if (debutPublication && finPublication && finPublication <= debutPublication)
    throw Error("La fin de publication doit suivre le début.");
  return {
    slug: form.slug,
    titre: form.titre.trim(),
    titreEn: form.titreEn.trim(),
    resume: form.resume.trim(),
    resumeEn: form.resumeEn.trim(),
    objectif: form.objectif.trim(),
    prerequis: form.prerequis.trim(),
    contraintes: form.contraintes.trim(),
    niveau: form.niveau,
    imageUrl: form.imageUrl.trim(),
    ordre,
    debutPublication: debutPublication || null,
    finPublication: finPublication || null,
    documents: form.documents.map((d) => ({
      titre: d.titre.trim(),
      url: d.url.trim(),
    })),
    lignes,
  };
}
export function validProject(value: unknown): value is ProjectRow {
  const row = value as ProjectRow;
  return Boolean(
    row &&
    typeof row.id === "string" &&
    Number.isSafeInteger(row.version) &&
    row.version > 0 &&
    typeof row.slug === "string" &&
    ["BROUILLON", "PUBLIE"].includes(row.statut) &&
    ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"].includes(row.niveau) &&
    Number.isSafeInteger(row.ordre) &&
    row.ordre >= 0 &&
    (row.historique == null ||
      (Array.isArray(row.historique) &&
        row.historique.every(
          (e) =>
            e &&
            typeof e.id === "string" &&
            typeof e.action === "string" &&
            Number.isSafeInteger(e.versionAppliquee) &&
            Number.isFinite(Date.parse(e.createdAt)),
        ))) &&
    ["titre", "resume", "objectif", "prerequis", "contraintes"].every(
      (key) =>
        typeof (row as unknown as Record<string, unknown>)[key] === "string",
    ) &&
    Array.isArray(row.documents) &&
    row.documents.length <= 8 &&
    row.documents.every(
      (d) => d && typeof d.titre === "string" && typeof d.url === "string",
    ) &&
    Array.isArray(row.lignes) &&
    row.lignes.length <= 30 &&
    row.lignes.every(
      (line) =>
        line &&
        typeof line.id === "string" &&
        typeof line.role === "string" &&
        Number.isSafeInteger(line.quantite) &&
        line.quantite > 0 &&
        typeof line.necessaire === "boolean" &&
        (line.empreinteActuelle == null ||
          /^[a-f0-9]{64}$/.test(line.empreinteActuelle)) &&
        (!line.produit || validProduct(line.produit)),
    ),
  );
}
export function readSession(actorKey: string): {
  session: EditorSession | null;
  error: string;
} {
  try {
    const value = localStorage.getItem(editorKey(actorKey));
    if (!value) return { session: null, error: "" };
    const session = JSON.parse(value) as EditorSession;
    const f = session.form;
    if (
      session.schema !== 1 ||
      session.actorKey !== actorKey ||
      typeof session.projectId !== "string" ||
      !Number.isSafeInteger(session.baseVersion) ||
      session.baseVersion < 0 ||
      !f ||
      !["DEBUTANT", "INTERMEDIAIRE", "AVANCE"].includes(f.niveau) ||
      [
        "slug",
        "titre",
        "titreEn",
        "resume",
        "resumeEn",
        "objectif",
        "prerequis",
        "contraintes",
        "imageUrl",
        "ordre",
        "debutPublication",
        "finPublication",
      ].some(
        (key) =>
          typeof (f as unknown as Record<string, unknown>)[key] !== "string",
      ) ||
      !Array.isArray(f.documents) ||
      f.documents.length > 8 ||
      f.documents.some(
        (d) => !d || typeof d.titre !== "string" || typeof d.url !== "string",
      ) ||
      !Array.isArray(f.lignes) ||
      f.lignes.length > 30 ||
      f.lignes.some(
        (l) =>
          !l ||
          typeof l.key !== "string" ||
          typeof l.produitId !== "string" ||
          typeof l.referenceSouhaitee !== "string" ||
          typeof l.role !== "string" ||
          typeof l.quantite !== "string" ||
          typeof l.necessaire !== "boolean" ||
          (l.produit != null && !validProduct(l.produit)),
      ) ||
      (session.pending &&
        (!["create", "update", "publish", "withdraw"].includes(
          session.pending.kind,
        ) ||
          typeof session.pending.projectId !== "string" ||
          !session.pending.payload ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            session.pending.payload.requestId,
          ) ||
          (session.pending.kind === "create"
            ? session.pending.projectId !== ""
            : !session.pending.projectId ||
              session.pending.projectId !== session.projectId ||
              !Number.isSafeInteger(session.pending.payload.version)) ||
          (["create", "update"].includes(session.pending.kind) &&
            (!Array.isArray(session.pending.payload.lignes) ||
              !Array.isArray(session.pending.payload.documents))) ||
          (session.pending.kind === "publish" &&
            !Array.isArray(session.pending.payload.verifications)) ||
          (session.pending.kind === "withdraw" &&
            typeof session.pending.payload.motif !== "string")))
    )
      throw Error("Invalid stored editor");
    return { session, error: "" };
  } catch {
    return {
      session: null,
      error:
        "Le brouillon local est illisible ou inaccessible. Aucune nouvelle tentative ne sera envoyée pour éviter un doublon.",
    };
  }
}
export function writeSession(
  session: EditorSession,
  completedRequestId?: string,
): boolean {
  try {
    const stored = localStorage.getItem(editorKey(session.actorKey));
    if (stored) {
      const current = JSON.parse(stored) as EditorSession;
      if (
        current.pending &&
        current.pending.payload?.requestId !==
          session.pending?.payload?.requestId &&
        current.pending.payload?.requestId !== completedRequestId
      )
        return false;
    }
    const serialized = JSON.stringify(session);
    localStorage.setItem(editorKey(session.actorKey), serialized);
    return localStorage.getItem(editorKey(session.actorKey)) === serialized;
  } catch {
    return false;
  }
}
