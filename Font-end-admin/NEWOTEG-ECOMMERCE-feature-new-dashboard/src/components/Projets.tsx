import {
  cloneElement,
  isValidElement,
  useId,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Search,
  RotateCw,
  ClipboardCheck,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { produitApi, getApiErrorMessage } from "../services/api";
import {
  projetApi,
  type ProjectProduct,
  type ProjectRow,
  type ProjectResult,
} from "../services/projets";
import { createClientId } from "../utils/clientId";
import { fmtFCFA } from "../utils/format";
import {
  blankForm,
  blankLine,
  editorKey,
  formFromProject,
  formPayload,
  publicProduct,
  readSession,
  validProject,
  validProduct,
  safeDocumentUrl,
  writeSession,
  type EditorSession,
  type ProjectAttempt,
  type ProjectForm,
} from "../features/projects/projectEditorData";
import "../features/projects/projects.css";

const status = (row: ProjectRow) =>
  row.statut === "BROUILLON"
    ? "Brouillon"
    : row.finPublication && Date.parse(row.finPublication) <= Date.now()
      ? "Période terminée"
      : row.debutPublication && Date.parse(row.debutPublication) > Date.now()
        ? "Programmé"
        : "Publié";
const Field = ({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) => {
  const id = useId();
  return (
    <div className="project-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement<Record<string, unknown>>(children)
        ? cloneElement(children, {
            id,
            "aria-describedby": help ? `${id}-help` : undefined,
          })
        : children}
      {help && <small id={`${id}-help`}>{help}</small>}
    </div>
  );
};
export function Projets() {
  const { admin } = useAdminAuth();
  if (!admin || !["ADMIN", "SUPER_ADMIN"].includes(admin.role))
    return (
      <p role="alert">
        La gestion des projets est réservée aux administrateurs.
      </p>
    );
  return (
    <ProjectEditor
      key={`${admin.id}:${admin.role}`}
      actorKey={`${admin.id}:${admin.role}`}
    />
  );
}
function ProjectEditor({ actorKey }: { actorKey: string }) {
  const [initial] = useState(() => readSession(actorKey));
  const [session, setSession] = useState<EditorSession>(
    () =>
      initial.session || {
        schema: 1,
        actorKey,
        projectId: "",
        baseVersion: 0,
        form: blankForm(),
        pending: null,
      },
  );
  const sessionRef = useRef(session);
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [saved, setSaved] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const sequence = useRef(0);
  const detailSequence = useRef(0);
  const [error, setError] = useState(initial.error);
  const [storageBlocked, setStorageBlocked] = useState(Boolean(initial.error));
  const [storageNotice, setStorageNotice] = useState("");
  const [notice, setNotice] = useState(
    initial.session
      ? "Brouillon local retrouvé. Les données de la boutique seront relues avant publication."
      : "",
  );
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [replacementKey, setReplacementKey] = useState("");
  const [results, setResults] = useState<ProjectProduct[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const searchSequence = useRef(0);
  const [review, setReview] = useState<ProjectRow | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [materialsChecked, setMaterialsChecked] = useState(false);
  const [docsChecked, setDocsChecked] = useState(false);
  const [validationNote, setValidationNote] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const form = session.form;
  const pending = session.pending;
  const disabled = busy || Boolean(pending) || storageBlocked;
  const dirty = (() => {
    if (!saved) return JSON.stringify(form) !== JSON.stringify(blankForm());
    try {
      return (
        JSON.stringify(formPayload(form)) !==
        JSON.stringify(formPayload(formFromProject(saved)))
      );
    } catch {
      return true;
    }
  })();
  const persist = (next: EditorSession, completedRequestId?: string) => {
    const success = writeSession(next, completedRequestId);
    if (!success && completedRequestId) setStorageBlocked(true);
    sessionRef.current = next;
    setSession(next);
    setStorageNotice(
      success
        ? ""
        : "Le brouillon n’a pas pu être conservé sur cet appareil. Aucun enregistrement ne partira sans une tentative conservée.",
    );
    return success;
  };
  const resetReview = () => {
    setReview(null);
    setChecked({});
    setMaterialsChecked(false);
    setDocsChecked(false);
    setValidationNote("");
  };
  const edit = (next: ProjectForm) => {
    if (disabled) return;
    persist({ ...sessionRef.current, form: next });
    resetReview();
    setNotice("");
  };
  const change = (key: keyof ProjectForm, value: unknown) =>
    edit({ ...form, [key]: value });
  const loadList = useCallback(async () => {
    const n = ++sequence.current;
    setLoading(true);
    try {
      const list = await projetApi.list();
      if (n !== sequence.current) return;
      if (!Array.isArray(list) || !list.every(validProject))
        throw Error("Invalid project list");
      setRows(list);
    } catch (e) {
      if (n === sequence.current) {
        setRows([]);
        setError(
          getApiErrorMessage(e, "Impossible de lire les projets. Réessayez."),
        );
      }
    } finally {
      if (n === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let live = true;
    void loadList();
    const id = sessionRef.current.projectId;
    const detail = ++detailSequence.current;
    if (id)
      void projetApi
        .get(id)
        .then((row) => {
          if (
            !live ||
            detail !== detailSequence.current ||
            id !== sessionRef.current.projectId
          )
            return;
          if (!validProject(row) || row.id !== id)
            throw Error("Invalid project");
          setSaved(row);
          if (row.version !== sessionRef.current.baseVersion)
            setNotice(
              "La version boutique a changé. Votre brouillon est conservé ; relisez la version boutique avant une nouvelle modification.",
            );
        })
        .catch((e) => {
          if (live && detail === detailSequence.current)
            setError(
              getApiErrorMessage(
                e,
                "Impossible de retrouver la version boutique. Votre brouillon est conservé.",
              ),
            );
        });
    return () => {
      live = false;
      sequence.current++;
      searchSequence.current++;
      detailSequence.current++;
    };
  }, [loadList]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty || pending) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty, pending]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== editorKey(actorKey) || busy) return;
      setStorageBlocked(true);
      setStorageNotice(
        "Ce brouillon a changé dans un autre onglet. Relisez le brouillon conservé avant de continuer.",
      );
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [actorKey, busy]);
  const restoreStorage = () => {
    if (lock.current) return;
    const value = readSession(actorKey);
    if (value.error) {
      setError(value.error);
      return;
    }
    if (
      dirty &&
      !window.confirm(
        "Remplacer les modifications affichées par le brouillon conservé sur cet appareil ?",
      )
    )
      return;
    const next = value.session || {
      schema: 1 as const,
      actorKey,
      projectId: "",
      baseVersion: 0,
      form: blankForm(),
      pending: null,
    };
    sessionRef.current = next;
    setSession(next);
    setSaved(null);
    resetReview();
    setStorageBlocked(false);
    setStorageNotice("");
    setError("");
    if (next.projectId) void readProject(next.projectId, false);
  };
  const readProject = async (id: string, replace: boolean) => {
    if (lock.current) return;
    lock.current = true;
    ++detailSequence.current;
    setBusy(true);
    setError("");
    try {
      const row = await projetApi.get(id);
      if (!validProject(row) || row.id !== id) throw Error("Invalid project");
      searchSequence.current++;
      setReplacementKey("");
      setResults([]);
      setSearching(false);
      setSearchError("");
      setSaved(row);
      if (replace)
        persist({
          ...sessionRef.current,
          projectId: id,
          baseVersion: row.version,
          form: formFromProject(row),
          pending: null,
        });
      resetReview();
      setNotice("Version boutique relue.");
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          "Impossible de relire ce projet. Le brouillon reste conservé.",
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const select = (id: string) => {
    if (disabled || lock.current) return;
    if (
      dirty &&
      !window.confirm(
        "Remplacer le brouillon affiché par ce projet ? Les modifications non enregistrées seront perdues.",
      )
    )
      return;
    void readProject(id, true);
  };
  const newProject = () => {
    if (
      disabled ||
      lock.current ||
      (dirty &&
        !window.confirm(
          "Commencer un autre projet et remplacer le brouillon non enregistré ?",
        ))
    )
      return;
    ++detailSequence.current;
    searchSequence.current++;
    setReplacementKey("");
    setResults([]);
    setSearching(false);
    setSearchError("");
    persist({
      schema: 1,
      actorKey,
      projectId: "",
      baseVersion: 0,
      form: blankForm(),
      pending: null,
    });
    setSaved(null);
    resetReview();
    setError("");
    setNotice("Nouveau projet en brouillon.");
  };
  const search = async () => {
    if (disabled || query.trim().length < 2) return;
    const n = ++searchSequence.current;
    setSearching(true);
    setSearchError("");
    setResults([]);
    try {
      const response = await produitApi.list({
        page: 1,
        limit: 12,
        search: query.trim(),
        includeInactive: false,
      });
      if (n !== searchSequence.current) return;
      if (!Array.isArray(response?.data)) throw Error("Invalid product list");
      // Catalogue search supplies attribute names without their values. It is
      // an identity chooser; complete technical data comes from the fresh
      // project detail during publication review, never from these summaries.
      const summaries = response.data.map((p: ProjectProduct) => ({
        ...p,
        attributs: undefined,
      }));
      if (!summaries.every(validProduct)) throw Error("Invalid product list");
      setResults(
        summaries.filter((p: ProjectProduct) => p.estActif).map(publicProduct),
      );
      if (!response.data.length)
        setSearchError(
          "Aucune pièce trouvée. Vous pouvez garder une référence à rechercher dans le brouillon.",
        );
    } catch (e) {
      if (n === searchSequence.current)
        setSearchError(
          getApiErrorMessage(e, "Recherche indisponible. Réessayez."),
        );
    } finally {
      if (n === searchSequence.current) setSearching(false);
    }
  };
  const addProduct = (p: ProjectProduct) => {
    if (disabled || (!replacementKey && form.lignes.length >= 30)) return;
    if (
      form.lignes.some((l) => l.produitId === p.id && l.key !== replacementKey)
    ) {
      setSearchError(
        "Cette pièce figure déjà dans la liste. Modifiez sa quantité.",
      );
      return;
    }
    const replacement = form.lignes.find((l) => l.key === replacementKey);
    if (replacementKey && !replacement) {
      setReplacementKey("");
      setSearchError(
        "Cette ligne a été retirée. Choisissez une nouvelle ligne avant de remplacer une pièce.",
      );
      return;
    }
    edit({
      ...form,
      lignes: replacement
        ? form.lignes.map((l) =>
            l.key === replacementKey
              ? {
                  ...l,
                  produitId: p.id,
                  referenceSouhaitee: p.code || "",
                  produit: p,
                }
              : l,
          )
        : [
            ...form.lignes,
            {
              ...blankLine(),
              produitId: p.id,
              referenceSouhaitee: p.code || "",
              produit: p,
            },
          ],
    });
    setReplacementKey("");
    setSearchError("");
  };
  const moveLine = (i: number, direction: number) => {
    const lignes = [...form.lignes];
    [lignes[i], lignes[i + direction]] = [lignes[i + direction], lignes[i]];
    change("lignes", lignes);
  };
  const updateLine = (i: number, changes: Record<string, unknown>) =>
    change(
      "lignes",
      form.lignes.map((l, index) => (index === i ? { ...l, ...changes } : l)),
    );
  const send = async (attempt: ProjectAttempt, retry = false) => {
    if (lock.current || storageBlocked || (!retry && pending)) return;
    const stored = readSession(actorKey);
    if (
      stored.error ||
      (stored.session?.pending &&
        stored.session.pending.payload.requestId !== attempt.payload.requestId)
    ) {
      setStorageBlocked(true);
      setError(
        stored.error ||
          "Une autre tentative est conservée. Relisez le brouillon local avant de continuer.",
      );
      return;
    }
    const next = { ...sessionRef.current, pending: attempt };
    if (!writeSession(next)) {
      setStorageNotice(
        "Impossible de conserver cette tentative sur l’appareil. Rien n’a été envoyé. Vérifiez le stockage du navigateur puis réessayez.",
      );
      return;
    }
    sessionRef.current = next;
    setSession(next);
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response: ProjectResult =
        attempt.kind === "create"
          ? await projetApi.create(attempt.payload)
          : attempt.kind === "update"
            ? await projetApi.update(attempt.projectId, attempt.payload)
            : attempt.kind === "publish"
              ? await projetApi.publish(attempt.projectId, attempt.payload)
              : await projetApi.withdraw(attempt.projectId, attempt.payload);
      if (
        !validProject(response?.projet) ||
        (attempt.projectId && response.projet.id !== attempt.projectId) ||
        response.operation?.requestId !== attempt.payload.requestId ||
        !Number.isSafeInteger(response.operation.versionAppliquee) ||
        response.operation.versionAppliquee < 1 ||
        typeof response.operation.rejoue !== "boolean" ||
        response.operation.versionAppliquee > response.projet.version
      )
        throw Error("Uncertain project response");
      persist(
        {
          ...sessionRef.current,
          projectId: response.projet.id,
          baseVersion: response.projet.version,
          form: formFromProject(response.projet),
          pending: null,
        },
        attempt.payload.requestId,
      );
      setSaved(response.projet);
      resetReview();
      setWithdrawReason("");
      setNotice(
        response.operation.rejoue
          ? "Tentative retrouvée, sans nouvel enregistrement. La version boutique courante est affichée."
          : attempt.kind === "publish"
            ? "Projet publié selon son calendrier."
            : attempt.kind === "withdraw"
              ? "Projet retiré. Son historique est conservé."
              : "Brouillon enregistré. Il reste à vérifier avant publication.",
      );
      void loadList();
    } catch (e: unknown) {
      const code = (e as { response?: { status?: number } })?.response?.status;
      if (code && [400, 403, 404, 409, 422].includes(code)) {
        persist(
          { ...sessionRef.current, pending: null },
          attempt.payload.requestId,
        );
        resetReview();
        setError(
          getApiErrorMessage(
            e,
            "Enregistrement refusé. Relisez la version boutique avant de réessayer.",
          ),
        );
      } else
        setError(
          getApiErrorMessage(
            e,
            "La réponse n’a pas été confirmée. Reprenez la tentative conservée ; n’en créez pas une autre.",
          ),
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const save = () => {
    if (disabled) return;
    try {
      if (saved && saved.version !== session.baseVersion)
        throw Error(
          "La version boutique a changé. Relisez-la avant d’enregistrer.",
        );
      const payload = {
        ...formPayload(form),
        requestId: createClientId(),
        ...(session.projectId ? { version: session.baseVersion } : {}),
      };
      void send({
        kind: session.projectId ? "update" : "create",
        projectId: session.projectId,
        payload,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const beginReview = async () => {
    if (disabled || dirty || !saved || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    resetReview();
    try {
      const row = await projetApi.get(saved.id);
      if (!validProject(row) || row.id !== saved.id)
        throw Error("Invalid project review");
      setSaved(row);
      persist({
        ...sessionRef.current,
        projectId: row.id,
        baseVersion: row.version,
        form: formFromProject(row),
        pending: null,
      });
      if (row.statut !== "BROUILLON") {
        setNotice(
          "Ce projet est déjà publié. Retirez-le ou modifiez-le pour préparer une nouvelle version.",
        );
        return;
      }
      setReview(row);
      setNotice(
        "Relisez chaque pièce, ses quantités et les documents. Rien n’est publié à cette étape.",
      );
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          "Impossible de relire le matériel. Réessayez avant publication.",
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const canPublish = Boolean(
    review &&
    review.lignes.length &&
    review.lignes.some((l) => l.necessaire) &&
    review.documents.length &&
    review.resume &&
    review.objectif &&
    review.prerequis &&
    review.contraintes &&
    review.lignes.every(
      (l) =>
        checked[l.id] &&
        l.produit?.estActif &&
        l.produit.code === l.reference &&
        l.empreinteActuelle,
    ) &&
    materialsChecked &&
    docsChecked &&
    validationNote.trim().length >= 10,
  );
  const publish = () => {
    if (!review || !canPublish || disabled) return;
    void send({
      kind: "publish",
      projectId: review.id,
      payload: {
        requestId: createClientId(),
        version: review.version,
        referencesVerifiees: true,
        materielEtQuantitesVerifies: true,
        contraintesEtDocumentsVerifies: true,
        noteValidation: validationNote.trim(),
        verifications: review.lignes.map((l) => ({
          ligneId: l.id,
          empreinteTechnique: l.empreinteActuelle,
        })),
      },
    });
  };

  return (
    <div className="project-editor">
      <header className="project-heading">
        <div>
          <h1>Projets et matériel</h1>
          <p>
            Préparez une liste utile, puis vérifiez chaque pièce avant de la
            rendre visible aux clients.
          </p>
        </div>
        <button
          className="project-button"
          onClick={newProject}
          disabled={disabled}
        >
          <Plus size={17} /> Nouveau projet
        </button>
      </header>
      {error && (
        <p className="project-message project-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="project-message" role="status">
          {notice}
        </p>
      )}
      {storageNotice && (
        <p className="project-message project-warning" role="alert">
          {storageNotice}
        </p>
      )}
      {storageBlocked && (
        <button
          className="project-button"
          onClick={restoreStorage}
          disabled={busy}
        >
          Relire le brouillon conservé
        </button>
      )}
      {pending && (
        <section className="project-pending" aria-label="Tentative en attente">
          <strong>Un enregistrement reste à confirmer</strong>
          <p>
            Le même contenu sera renvoyé avec la même tentative, pour retrouver
            le résultat sans doublon.
          </p>
          <button
            className="project-button project-primary"
            disabled={busy || storageBlocked}
            onClick={() => void send(pending, true)}
          >
            {busy ? "Reprise en cours…" : "Reprendre l’enregistrement"}
          </button>
        </section>
      )}
      <div className="project-workspace">
        <aside className="project-library" aria-label="Projets de la boutique">
          <div className="project-library-head">
            <h2>Les projets</h2>
            <button
              className="project-icon"
              aria-label="Actualiser les projets"
              onClick={() => void loadList()}
              disabled={busy || loading}
            >
              <RotateCw size={17} />
            </button>
          </div>
          <Field label="Afficher les projets">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Tous les projets</option>
              <option value="BROUILLON">Brouillons</option>
              <option value="PUBLIE">Publiés et programmés</option>
            </select>
          </Field>
          {loading ? (
            <p role="status">Chargement des projets…</p>
          ) : !rows.length ? (
            <p>
              Aucun projet disponible dans cette liste. Créez un brouillon pour
              préparer votre première liste de matériel.
            </p>
          ) : (
            <ul className="project-list">
              {rows
                .filter((r) => filter === "all" || r.statut === filter)
                .map((row) => (
                  <li key={row.id}>
                    <button
                      aria-pressed={row.id === session.projectId}
                      disabled={disabled}
                      onClick={() => select(row.id)}
                    >
                      <span>{row.titre}</span>
                      <small>
                        {row.lignes.length} pièces · {status(row)}
                      </small>
                    </button>
                  </li>
                ))}
            </ul>
          )}
          {rows.length >= 100 && (
            <p className="project-hint">
              Les 100 premiers projets sont affichés.
            </p>
          )}
        </aside>
        <div className="project-sheet">
          <div className="project-sheet-heading">
            <div>
              <h2>
                {session.projectId
                  ? form.titre || "Modifier le projet"
                  : "Préparer un projet"}
              </h2>
              <p>
                {saved
                  ? `${status(saved)} · version ${saved.version}`
                  : "Le premier enregistrement crée un brouillon."}
              </p>
            </div>
            {session.projectId && (
              <button
                className="project-button"
                disabled={disabled}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      "Remplacer vos modifications par la version boutique ?",
                    )
                  )
                    void readProject(session.projectId, true);
                }}
              >
                Relire la version boutique
              </button>
            )}
          </div>
          <fieldset disabled={disabled} className="project-form">
            <section>
              <h3>Le projet</h3>
              <div className="project-fields">
                <Field label="Titre">
                  <input
                    maxLength={150}
                    value={form.titre}
                    onChange={(e) => change("titre", e.target.value)}
                  />
                </Field>
                <Field
                  label="Lien du projet"
                  help="Minuscules, chiffres et tirets. Conservé après le premier enregistrement."
                >
                  <input
                    maxLength={100}
                    disabled={Boolean(session.projectId)}
                    value={form.slug}
                    onChange={(e) => change("slug", e.target.value)}
                  />
                </Field>
                <Field label="Niveau">
                  <select
                    value={form.niveau}
                    onChange={(e) => change("niveau", e.target.value)}
                  >
                    <option value="DEBUTANT">Débutant</option>
                    <option value="INTERMEDIAIRE">Intermédiaire</option>
                    <option value="AVANCE">Avancé</option>
                  </select>
                </Field>
                <Field label="Ordre d’affichage">
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    value={form.ordre}
                    onChange={(e) => change("ordre", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Résumé">
                <textarea
                  rows={2}
                  maxLength={500}
                  value={form.resume}
                  onChange={(e) => change("resume", e.target.value)}
                />
              </Field>
              {(["objectif", "prerequis", "contraintes"] as const).map(
                (key, i) => (
                  <Field
                    key={key}
                    label={
                      [
                        "Objectif",
                        "Prérequis et accessoires",
                        "Contraintes et limites",
                      ][i]
                    }
                  >
                    <textarea
                      rows={2}
                      maxLength={3000}
                      value={form[key]}
                      onChange={(e) => change(key, e.target.value)}
                    />
                  </Field>
                ),
              )}
              <details>
                <summary>Titre et résumé en anglais</summary>
                <Field label="Titre en anglais">
                  <input
                    maxLength={150}
                    value={form.titreEn}
                    onChange={(e) => change("titreEn", e.target.value)}
                  />
                </Field>
                <Field label="Résumé en anglais">
                  <textarea
                    maxLength={500}
                    value={form.resumeEn}
                    onChange={(e) => change("resumeEn", e.target.value)}
                  />
                </Field>
              </details>
            </section>
            <section>
              <h3>La liste de matériel</h3>
              <p className="project-hint">
                Choisissez les références exactes, puis décrivez leur rôle. Une
                référence manquante peut rester en brouillon ; elle bloque la
                publication.
              </p>
              <div className="project-search">
                <Field label="Rechercher une pièce du catalogue">
                  <input
                    value={query}
                    maxLength={150}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      searchSequence.current++;
                      setResults([]);
                      setSearching(false);
                      setSearchError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void search();
                      }
                    }}
                  />
                </Field>
                <button
                  className="project-button"
                  disabled={searching || query.trim().length < 2}
                  onClick={() => void search()}
                >
                  <Search size={17} /> Rechercher
                </button>
              </div>
              {replacementKey && (
                <p className="project-hint" role="status">
                  Le choix remplacera la pièce de cette ligne en conservant son
                  rôle et sa quantité.{" "}
                  <button
                    className="project-button"
                    onClick={() => setReplacementKey("")}
                  >
                    Annuler le remplacement
                  </button>
                </p>
              )}
              {searchError && (
                <p role="status" className="project-hint">
                  {searchError}
                </p>
              )}
              {searching && <p role="status">Recherche en cours…</p>}
              {results.length > 0 && (
                <ul
                  className="project-results"
                  aria-label="Résultats du catalogue"
                >
                  {results.map((p) => (
                    <li key={p.id}>
                      <div>
                        <strong>{p.nomProduit}</strong>
                        <span>
                          {p.code || "Référence non renseignée"}
                          {p.marque ? ` · ${p.marque}` : ""}
                        </span>
                      </div>
                      <button
                        className="project-button"
                        disabled={
                          (!replacementKey && form.lignes.length >= 30) ||
                          form.lignes.some(
                            (l) =>
                              l.produitId === p.id && l.key !== replacementKey,
                          )
                        }
                        onClick={() => addProduct(p)}
                      >
                        {replacementKey ? "Choisir" : "Ajouter"}{" "}
                        {p.code || p.nomProduit}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <ol className="project-materials">
                {form.lignes.map((line, i) => (
                  <li key={line.key}>
                    <div className="project-line-title">
                      <div>
                        <strong>
                          {line.produit?.nomProduit || "Pièce à rechercher"}
                        </strong>
                        <span>
                          {line.referenceSouhaitee || "Référence à préciser"}
                        </span>
                      </div>
                      <div className="project-line-tools">
                        <button
                          className="project-icon"
                          aria-label={`Monter la pièce ${i + 1}`}
                          disabled={!i}
                          onClick={() => moveLine(i, -1)}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          className="project-icon"
                          aria-label={`Descendre la pièce ${i + 1}`}
                          disabled={i === form.lignes.length - 1}
                          onClick={() => moveLine(i, 1)}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          className="project-icon"
                          aria-label={`Retirer la pièce ${i + 1}`}
                          onClick={() =>
                            change(
                              "lignes",
                              form.lignes.filter((_, index) => index !== i),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <button
                      className="project-button"
                      onClick={() => {
                        setReplacementKey(line.key);
                        setQuery(line.referenceSouhaitee);
                        setResults([]);
                        searchSequence.current++;
                        setSearchError(
                          "Recherchez puis choisissez une pièce pour remplacer cette ligne.",
                        );
                      }}
                    >
                      Choisir une pièce pour la ligne {i + 1}
                    </button>
                    {!line.produitId && (
                      <Field label={`Référence souhaitée, pièce ${i + 1}`}>
                        <input
                          maxLength={100}
                          value={line.referenceSouhaitee}
                          onChange={(e) =>
                            updateLine(i, {
                              referenceSouhaitee: e.target.value,
                            })
                          }
                        />
                      </Field>
                    )}
                    <div className="project-line-fields">
                      <Field label={`Rôle, pièce ${i + 1}`}>
                        <input
                          maxLength={150}
                          value={line.role}
                          onChange={(e) =>
                            updateLine(i, { role: e.target.value })
                          }
                        />
                      </Field>
                      <Field label={`Quantité, pièce ${i + 1}`}>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          step={1}
                          value={line.quantite}
                          onChange={(e) =>
                            updateLine(i, { quantite: e.target.value })
                          }
                        />
                      </Field>
                      <label className="project-check">
                        <input
                          type="checkbox"
                          checked={line.necessaire}
                          onChange={(e) =>
                            updateLine(i, { necessaire: e.target.checked })
                          }
                        />{" "}
                        Nécessaire au projet
                      </label>
                    </div>
                    {line.produit && !line.produit.estActif && (
                      <p className="project-hint">
                        Pièce inactive : choisissez une autre référence
                        explicitement.
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              <button
                className="project-button"
                disabled={form.lignes.length >= 30}
                onClick={() => change("lignes", [...form.lignes, blankLine()])}
              >
                <Plus size={16} /> Ajouter une référence à rechercher
              </button>
            </section>
            <section>
              <h3>Documentation et visuel</h3>
              <Field
                label="Visuel marketing"
                help="URL publique ou chemin d’un visuel NEWOTEG déjà disponible."
              >
                <input
                  maxLength={2048}
                  value={form.imageUrl}
                  onChange={(e) => change("imageUrl", e.target.value)}
                />
              </Field>
              {form.documents.map((document, i) => (
                <div className="project-document" key={i}>
                  <Field label={`Titre du document ${i + 1}`}>
                    <input
                      maxLength={120}
                      value={document.titre}
                      onChange={(e) =>
                        change(
                          "documents",
                          form.documents.map((d, index) =>
                            index === i ? { ...d, titre: e.target.value } : d,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label={`URL du document ${i + 1}`}>
                    <input
                      type="url"
                      maxLength={2048}
                      value={document.url}
                      onChange={(e) =>
                        change(
                          "documents",
                          form.documents.map((d, index) =>
                            index === i ? { ...d, url: e.target.value } : d,
                          ),
                        )
                      }
                    />
                  </Field>
                  <button
                    className="project-icon"
                    aria-label={`Retirer le document ${i + 1}`}
                    onClick={() =>
                      change(
                        "documents",
                        form.documents.filter((_, index) => index !== i),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                className="project-button"
                disabled={form.documents.length >= 8}
                onClick={() =>
                  change("documents", [
                    ...form.documents,
                    { titre: "", url: "" },
                  ])
                }
              >
                <Plus size={16} /> Ajouter un document
              </button>
            </section>
            <section>
              <h3>Calendrier de publication</h3>
              <p className="project-hint">
                Dates et heures de cet appareil. Sans date de début, le projet
                devient visible après validation ; sans date de fin, il reste
                publié jusqu’au retrait.
              </p>
              <div className="project-fields">
                <Field label="Début de publication">
                  <input
                    type="datetime-local"
                    value={form.debutPublication}
                    onChange={(e) => change("debutPublication", e.target.value)}
                  />
                </Field>
                <Field label="Fin de publication">
                  <input
                    type="datetime-local"
                    value={form.finPublication}
                    onChange={(e) => change("finPublication", e.target.value)}
                  />
                </Field>
              </div>
            </section>
          </fieldset>
          <div className="project-save">
            <p>
              {dirty
                ? "Modifications non enregistrées."
                : saved
                  ? "La version affichée est enregistrée."
                  : "Le projet restera en brouillon."}
              {saved?.statut === "PUBLIE" && dirty
                ? " Enregistrer le remettra en brouillon."
                : ""}
            </p>
            <div>
              <button
                className="project-button project-primary"
                disabled={disabled || (Boolean(saved) && !dirty)}
                onClick={save}
              >
                {busy ? "Enregistrement…" : "Enregistrer le brouillon"}
              </button>
              <button
                className="project-button"
                disabled={
                  disabled || dirty || !saved || saved.statut !== "BROUILLON"
                }
                onClick={() => void beginReview()}
              >
                <ClipboardCheck size={17} /> Vérifier avant publication
              </button>
            </div>
          </div>
          {review && (
            <section
              className="project-review"
              aria-label="Vérification avant publication"
            >
              <h3>Relire le matériel avant publication</h3>
              <p>
                Ces caractéristiques viennent de la version boutique relue.
                Vérifiez aussi les accessoires, le montage et ses limites. Le
                prix et le stock pourront évoluer.
              </p>
              <dl>
                <div>
                  <dt>Objectif</dt>
                  <dd>{review.objectif || "À renseigner"}</dd>
                </div>
                <div>
                  <dt>Prérequis</dt>
                  <dd>{review.prerequis || "À renseigner"}</dd>
                </div>
                <div>
                  <dt>Contraintes</dt>
                  <dd>{review.contraintes || "À renseigner"}</dd>
                </div>
              </dl>
              <ul>
                {review.documents.map((doc, i) => (
                  <li key={i}>
                    {safeDocumentUrl(doc.url) ? (
                      <a
                        href={safeDocumentUrl(doc.url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {doc.titre}
                      </a>
                    ) : (
                      `${doc.titre} : lien à vérifier`
                    )}
                  </li>
                ))}
              </ul>
              {review.lignes.map((line) => (
                <article key={line.id}>
                  <h4>{line.nomProduit}</h4>
                  <p>
                    {line.reference || "Référence manquante"} · {line.quantite}{" "}
                    pièce(s) · {line.necessaire ? "Nécessaire" : "Facultative"}
                  </p>
                  <p>{line.role}</p>
                  <p>
                    {line.produit?.marque || "Marque non renseignée"} ·{" "}
                    {line.produit?.categorie?.nom || "Famille non renseignée"}
                  </p>
                  {safeDocumentUrl(line.produit?.urlDatasheet) && (
                    <a
                      href={safeDocumentUrl(line.produit?.urlDatasheet)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Documentation de la pièce
                    </a>
                  )}
                  <p>
                    {line.produit?.description || "Description non renseignée."}
                  </p>
                  <dl>
                    {line.produit?.attributs?.map((a, i) => (
                      <div key={i}>
                        <dt>{a.nomAttribut}</dt>
                        <dd>
                          {a.valeurs.map((v) => v.valeur).join(", ") ||
                            "Non renseigné"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="project-hint">
                    {line.produit?.prixDetail &&
                    Number.isFinite(line.produit.prixDetail)
                      ? fmtFCFA(line.produit.prixDetail)
                      : "Prix à renseigner"}{" "}
                    par pièce. La disponibilité sera revérifiée pour le client.
                  </p>
                  <label className="project-check">
                    <input
                      type="checkbox"
                      disabled={
                        disabled ||
                        !line.produit?.estActif ||
                        !line.produit.code ||
                        !line.empreinteActuelle
                      }
                      checked={Boolean(checked[line.id])}
                      onChange={(e) =>
                        setChecked({ ...checked, [line.id]: e.target.checked })
                      }
                    />{" "}
                    Référence et caractéristiques vérifiées :{" "}
                    {line.reference || line.nomProduit}
                  </label>
                </article>
              ))}
              <fieldset disabled={disabled}>
                <label className="project-check">
                  <input
                    type="checkbox"
                    checked={materialsChecked}
                    onChange={(e) => setMaterialsChecked(e.target.checked)}
                  />{" "}
                  Matériel, quantités et accessoires vérifiés
                </label>
                <label className="project-check">
                  <input
                    type="checkbox"
                    checked={docsChecked}
                    onChange={(e) => setDocsChecked(e.target.checked)}
                  />{" "}
                  Contraintes et documentation vérifiées
                </label>
                <Field
                  label="Note de validation privée"
                  help="Au moins 10 caractères. Cette note reste dans l’administration."
                >
                  <textarea
                    maxLength={3000}
                    value={validationNote}
                    onChange={(e) => setValidationNote(e.target.value)}
                  />
                </Field>
              </fieldset>
              <button
                className="project-button project-primary"
                disabled={disabled || !canPublish}
                onClick={publish}
              >
                Publier le projet vérifié
              </button>
              {!canPublish && (
                <p className="project-hint">
                  La publication exige un résumé, un objectif, les prérequis,
                  contraintes, documents, au moins une pièce nécessaire et
                  toutes les vérifications.
                </p>
              )}
            </section>
          )}
          {saved?.statut === "PUBLIE" && !dirty && (
            <section className="project-withdraw">
              <h3>Retirer de la boutique</h3>
              <p>
                Le projet retourne en brouillon. La liste et son historique sont
                conservés.
              </p>
              <Field label="Motif du retrait">
                <input
                  disabled={disabled}
                  maxLength={500}
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                />
              </Field>
              <button
                className="project-button"
                disabled={disabled || withdrawReason.trim().length < 3}
                onClick={() =>
                  void send({
                    kind: "withdraw",
                    projectId: saved.id,
                    payload: {
                      requestId: createClientId(),
                      version: saved.version,
                      motif: withdrawReason.trim(),
                    },
                  })
                }
              >
                Retirer le projet
              </button>
            </section>
          )}
          {saved?.historique?.length ? (
            <details className="project-history">
              <summary>Historique des enregistrements</summary>
              <ul>
                {saved.historique.map((event) => (
                  <li key={event.id}>
                    {(
                      {
                        CREATION: "Création",
                        MODIFICATION: "Modification",
                        PUBLICATION: "Publication",
                        RETRAIT: "Retrait",
                      } as Record<string, string>
                    )[event.action] || event.action}{" "}
                    · version {event.versionAppliquee} ·{" "}
                    {new Date(event.createdAt).toLocaleString("fr-FR")}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
