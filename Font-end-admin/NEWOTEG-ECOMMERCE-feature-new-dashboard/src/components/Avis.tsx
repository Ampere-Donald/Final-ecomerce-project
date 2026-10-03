import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import api, { getApiErrorMessage } from "../services/api";

type State = "EN_ATTENTE" | "PUBLIE" | "REFUSE";
type Action = "PUBLIER" | "REFUSER" | "REPONDRE";
type Review = {
  id: string;
  version: number;
  note: number;
  texte: string;
  pseudonyme: string;
  projetRealise: string | null;
  statut: State;
  createdAt: string;
  reponseBoutique: string | null;
  ligne: { nomProduit: string };
  _count: { signalements: number };
  historique: { action: string; motif: string | null; createdAt: string }[];
  signalements: { motif: string; createdAt: string }[];
};
type Attempt = {
  id: string;
  body: {
    requestId: string;
    expectedVersion: number;
    action: Action;
    motif?: string;
    reponse?: string;
  };
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const labels: Record<State, string> = {
  EN_ATTENTE: "En attente",
  PUBLIE: "Publiés",
  REFUSE: "Non publiés",
};
const reasons: Record<string, string> = {
  DONNEES_PERSONNELLES: "Données personnelles",
  INJURES_MENACES: "Injures ou menaces",
  SPAM: "Spam",
  HORS_SUJET: "Hors sujet",
};
const button =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50";
export function Avis() {
  const { admin } = useAdminAuth();
  return <AvisPanel key={`${admin?.id || "anonymous"}:${admin?.role || ""}`} />;
}
function AvisPanel() {
  const { admin } = useAdminAuth();
  const allowed = ["ADMIN", "SUPER_ADMIN"].includes(admin?.role || "");
  const storageKey = "newoteg_review_moderation_v1:" + admin?.id;
  const [session, setSession] = useState<{
    attempt: Attempt | null;
    invalid: boolean;
  }>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey),
        value = raw ? JSON.parse(raw) : null;
      if (
        value &&
        (!uuid.test(value.id) ||
          !uuid.test(value.body?.requestId) ||
          !Number.isInteger(value.body?.expectedVersion) ||
          value.body.expectedVersion < 1 ||
          !["PUBLIER", "REFUSER", "REPONDRE"].includes(value.body?.action))
      )
        throw Error("Invalid saved moderation");
      return { attempt: value, invalid: false };
    } catch {
      return { attempt: null, invalid: true };
    }
  });
  const [filter, setFilter] = useState<State>("EN_ATTENTE"),
    [page, setPage] = useState(1),
    [rows, setRows] = useState<Review[] | null>(null);
  const [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<{
      row: Review;
      action: Action;
    } | null>(null),
    [motif, setMotif] = useState(""),
    [reply, setReply] = useState(""),
    [agreed, setAgreed] = useState(false),
    [refused, setRefused] = useState(false);
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setRows(null);
    api
      .get("/avis/admin", {
        params: { statut: filter, page },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (
          !Array.isArray(data) ||
          data.some(
            (row) =>
              !uuid.test(row.id) ||
              !Number.isInteger(row.version) ||
              typeof row.texte !== "string" ||
              !row.ligne ||
              !Array.isArray(row.historique) ||
              !Array.isArray(row.signalements),
          )
        )
          throw Error("Invalid moderation list");
        setRows(data);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            getApiErrorMessage(e, "Liste des avis indisponible. Réessayez."),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [allowed, filter, page, version]);
  async function send(value: Attempt) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setRefused(false);
    try {
      const { data } = await api.post(
        `/avis/admin/${value.id}/moderation`,
        value.body,
      );
      if (
        data?.id !== value.id ||
        !Object.keys(labels).includes(data?.statut) ||
        !Number.isInteger(data?.version)
      )
        throw Error("Unconfirmed decision");
      if (!mounted.current) return;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* A replay is harmless if storage cleanup fails. */
      }
      setSession({ attempt: null, invalid: false });
      setSelected(null);
      setNotice(
        "Décision enregistrée. La liste relit maintenant l’état courant.",
      );
      setVersion((n) => n + 1);
    } catch (e) {
      if (!mounted.current) return;
      setRefused(
        (e as { response?: { status?: number } })?.response?.status === 409,
      );
      setError(
        getApiErrorMessage(
          e,
          "Résultat non confirmé. Reprenez exactement cette demande avant toute autre décision.",
        ),
      );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !agreed || session.attempt || busy) return;
    const value: Attempt = {
      id: selected.row.id,
      body: {
        requestId: crypto.randomUUID(),
        expectedVersion: selected.row.version,
        action: selected.action,
        ...(selected.action === "REFUSER" ? { motif } : {}),
        ...(selected.action === "REPONDRE" ? { reponse: reply.trim() } : {}),
      },
    };
    try {
      const raw = JSON.stringify(value);
      sessionStorage.setItem(storageKey, raw);
      if (sessionStorage.getItem(storageKey) !== raw)
        throw Error("Attempt not retained");
      setSession({ attempt: value, invalid: false });
      void send(value);
    } catch {
      setError(
        "La demande ne peut pas être conservée sur cet appareil. Aucun envoi effectué.",
      );
    }
  }
  if (!allowed)
    return <p>La modération des avis est réservée aux administrateurs.</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Avis clients</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Chaque avis provient d’une ligne reçue. Publiez aussi les avis
            négatifs conformes. Un refus concerne le contenu, jamais la note.
          </p>
        </div>
        <button
          className={button}
          disabled={loading || busy}
          onClick={() => setVersion((n) => n + 1)}
        >
          Actualiser
        </button>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="État des avis">
        {Object.entries(labels).map(([state, label]) => (
          <button
            key={state}
            className={
              button + (filter === state ? " bg-slate-900 text-white" : "")
            }
            aria-pressed={filter === state}
            disabled={busy}
            onClick={() => {
              setFilter(state as State);
              setPage(1);
              setSelected(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {session.invalid && (
        <div className="rounded-lg border border-amber-300 p-4">
          <p>
            Tentative sauvegardée illisible. Vérifiez les avis avant de
            l’effacer.
          </p>
          <button
            className={button}
            disabled={loading || busy}
            onClick={() => {
              try {
                sessionStorage.removeItem(storageKey);
                setSession({ attempt: null, invalid: false });
              } catch {
                setError("Stockage indisponible.");
              }
            }}
          >
            Effacer la tentative illisible
          </button>
        </div>
      )}
      {session.attempt && (
        <div className="space-y-3 rounded-lg border border-amber-300 p-4">
          <p>
            Une décision attend confirmation : {session.attempt.body.action}.
            Reprenez la même tentative pour éviter une seconde décision.
          </p>
          <button
            className={button}
            disabled={busy}
            onClick={() => void send(session.attempt!)}
          >
            Vérifier ou reprendre la décision
          </button>
          {refused && (
            <button
              className={button}
              disabled={busy || loading}
              onClick={() => {
                try {
                  sessionStorage.removeItem(storageKey);
                  setSession({ attempt: null, invalid: false });
                  setSelected(null);
                  setVersion((n) => n + 1);
                } catch {
                  setError(
                    "Stockage indisponible. La tentative est conservée.",
                  );
                }
              }}
            >
              Effacer la demande refusée et relire les avis
            </button>
          )}
        </div>
      )}
      {loading ? (
        <p role="status">Chargement des avis…</p>
      ) : rows?.length === 0 ? (
        <p>Aucun avis dans cet état.</p>
      ) : (
        rows?.map((row) => (
          <article
            className="border-b border-slate-200 pb-6"
            key={row.id}
            data-review-id={row.id}
          >
            <header className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-bold">{row.ligne.nomProduit}</h2>
              <span>{row.note}/5</span>
              <span className="text-sm text-slate-500">
                {row.pseudonyme} ·{" "}
                {new Date(row.createdAt).toLocaleDateString("fr-FR")}
              </span>
            </header>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words">
              {row.texte}
            </p>
            {row.projetRealise && (
              <p className="mt-2 text-sm text-slate-600">
                Projet : {row.projetRealise}
              </p>
            )}
            {row.reponseBoutique && (
              <div className="mt-3 border-l-2 border-emerald-500 pl-4">
                <strong>Réponse boutique</strong>
                <p className="whitespace-pre-wrap break-words">
                  {row.reponseBoutique}
                </p>
              </div>
            )}
            {row._count.signalements > 0 && (
              <p className="mt-3 text-sm text-amber-800">
                {row._count.signalements} signalement(s) :{" "}
                {row.signalements
                  .map((s) => reasons[s.motif] || s.motif)
                  .join(", ")}
              </p>
            )}
            <details className="my-3 text-sm">
              <summary>Historique de modération</summary>
              {row.historique.length === 0 ? (
                <p>Aucune décision.</p>
              ) : (
                row.historique.map((h, i) => (
                  <p key={i}>
                    {new Date(h.createdAt).toLocaleString("fr-FR")} : {h.action}
                    {h.motif ? " — " + (reasons[h.motif] || h.motif) : ""}
                  </p>
                ))
              )}
            </details>
            {selected?.row.id === row.id ? (
              <form
                className="mt-4 grid max-w-xl gap-3 rounded-lg bg-slate-50 p-4"
                onSubmit={confirm}
              >
                <h3 className="font-semibold">
                  {selected.action === "PUBLIER"
                    ? "Publier cet avis"
                    : selected.action === "REFUSER"
                      ? "Ne pas publier ce contenu"
                      : "Réponse publique de la boutique"}
                </h3>
                {selected.action === "REFUSER" && (
                  <label className="grid gap-1">
                    Motif de contenu
                    <select
                      className="rounded border p-2"
                      required
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">Choisir un motif</option>
                      {Object.entries(reasons).map(([code, label]) => (
                        <option value={code} key={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {selected.action === "REPONDRE" && (
                  <label className="grid gap-1">
                    Réponse
                    <textarea
                      className="min-h-28 rounded border p-2"
                      required
                      minLength={2}
                      maxLength={1000}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                )}
                <label className="flex items-start gap-2">
                  <input
                    className="mt-1"
                    type="checkbox"
                    required
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    J’ai relu le contenu et confirme cette décision. Une note
                    négative ne justifie pas un refus.
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button + " bg-slate-900 text-white"}
                    disabled={
                      busy || !agreed || !!session.attempt || session.invalid
                    }
                  >
                    Confirmer la décision
                  </button>
                  <button
                    className={button}
                    type="button"
                    disabled={busy}
                    onClick={() => setSelected(null)}
                  >
                    Fermer
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "PUBLIER",
                    "REFUSER",
                    ...(row.statut === "PUBLIE" ? ["REPONDRE"] : []),
                  ] as Action[]
                )
                  .filter(
                    (action) =>
                      !(row.statut === "PUBLIE" && action === "PUBLIER") &&
                      !(row.statut === "REFUSE" && action === "REFUSER"),
                  )
                  .map((action) => (
                    <button
                      key={action}
                      className={button}
                      disabled={busy || !!session.attempt || session.invalid}
                      onClick={() => {
                        setSelected({ row, action });
                        setMotif("");
                        setReply(row.reponseBoutique || "");
                        setAgreed(false);
                        setError("");
                      }}
                    >
                      {action === "PUBLIER"
                        ? "Préparer la publication"
                        : action === "REFUSER"
                          ? "Examiner un refus"
                          : "Répondre"}
                    </button>
                  ))}
              </div>
            )}
          </article>
        ))
      )}
      <nav
        className="flex flex-wrap items-center gap-3"
        aria-label="Pages de modération"
      >
        <button
          className={button}
          disabled={page <= 1 || loading || busy}
          onClick={() => {
            setPage((n) => n - 1);
            setSelected(null);
          }}
        >
          Précédents
        </button>
        <span>Page {page}</span>
        <button
          className={button}
          disabled={!rows || rows.length < 30 || loading || busy}
          onClick={() => {
            setPage((n) => n + 1);
            setSelected(null);
          }}
        >
          Suivants
        </button>
      </nav>
      <Link to="/orders" className="text-sm underline">
        Revenir aux commandes
      </Link>
    </div>
  );
}
