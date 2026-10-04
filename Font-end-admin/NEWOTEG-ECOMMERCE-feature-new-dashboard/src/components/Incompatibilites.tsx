import { useEffect, useRef, useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { getAdminToken } from "../services/adminSession";
import api from "../services/api";

const labels = {
  SIGNALE: "Signalements reçus",
  EN_EXAMEN: "En cours d’examen",
  RESOLU_SANS_RETOUR: "Résolus sans retour",
  CLOTURE: "Clôturés",
  RETOUR_CONFIRME: "Retours confirmés",
};
const reasons = {
  TENSION: "Tension",
  BROCHAGE: "Brochage",
  FORMAT: "Format ou dimensions",
  FONCTION: "Fonction",
  AUTRE: "Autre",
};
type State = keyof typeof labels;
type Action = Exclude<State, "SIGNALE">;
type Row = {
  id: string;
  version: number;
  statut: State;
  quantite: number;
  motif: keyof typeof reasons;
  description: string;
  createdAt: string;
  reponseBoutique: string | null;
  retourQuantite: number | null;
  retourConfirmeAt: string | null;
  ligne: {
    nomProduit: string;
    quantite: number;
    commande: { id: string; numeroSuivi: string };
  };
  historique: { action: Action; reponse: string; createdAt: string }[];
};
type Attempt = {
  id: string;
  body: {
    requestId: string;
    expectedVersion: number;
    action: Action;
    reponse: string;
    retourQuantite?: number;
    diagnostic?: keyof typeof reasons;
  };
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const terminal = (state: State) => !["SIGNALE", "EN_EXAMEN"].includes(state);
const button =
  "min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50";
const date = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(new Date(value));
function validateAttempt(value: Attempt): Attempt {
  if (
    !uuid.test(value?.id || "") ||
    !uuid.test(value?.body?.requestId || "") ||
    !Number.isSafeInteger(value.body.expectedVersion) ||
    value.body.expectedVersion < 1 ||
    !Object.hasOwn(labels, value.body.action) ||
    value.body.action === ("SIGNALE" as State) ||
    typeof value.body.reponse !== "string" ||
    value.body.reponse.trim().length < 10 ||
    value.body.reponse.length > 1000 ||
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value.body.reponse) ||
    (value.body.action === "RETOUR_CONFIRME"
      ? !Number.isSafeInteger(value.body.retourQuantite) ||
        value.body.retourQuantite! < 1 ||
        !Object.hasOwn(reasons, value.body.diagnostic || "")
      : value.body.retourQuantite !== undefined ||
        value.body.diagnostic !== undefined)
  )
    throw Error("Invalid pending decision");
  return value;
}
function parseList(
  value: { page: number; total: number; items: Row[] },
  page: number,
) {
  if (
    value?.page !== page ||
    !Number.isSafeInteger(value.total) ||
    value.total < 0 ||
    !Array.isArray(value.items) ||
    value.items.length > 30
  )
    throw Error("Invalid registry");
  const ids = new Set();
  value.items.forEach((row) => {
    if (
      !uuid.test(row.id) ||
      ids.has(row.id) ||
      !Object.hasOwn(labels, row.statut) ||
      !Number.isSafeInteger(row.version) ||
      row.version < 1 ||
      !Number.isSafeInteger(row.quantite) ||
      row.quantite < 1 ||
      !Object.hasOwn(reasons, row.motif) ||
      typeof row.description !== "string" ||
      row.description.length > 2000 ||
      !Number.isFinite(Date.parse(row.createdAt)) ||
      typeof row.ligne?.nomProduit !== "string" ||
      !uuid.test(row.ligne?.commande?.id || "") ||
      typeof row.ligne.commande.numeroSuivi !== "string" ||
      (row.reponseBoutique !== null &&
        (typeof row.reponseBoutique !== "string" ||
          row.reponseBoutique.length > 1000)) ||
      !Array.isArray(row.historique) ||
      row.historique.length > 30 ||
      row.historique.some(
        (item) =>
          !Object.hasOwn(labels, item.action) ||
          typeof item.reponse !== "string" ||
          item.reponse.length > 1000 ||
          !Number.isFinite(Date.parse(item.createdAt)),
      ) ||
      (row.statut === "RETOUR_CONFIRME" &&
        (!Number.isSafeInteger(row.retourQuantite) ||
          row.retourQuantite! < 1 ||
          row.retourQuantite! > row.quantite ||
          !Number.isFinite(Date.parse(row.retourConfirmeAt || ""))))
    )
      throw Error("Invalid private case");
    ids.add(row.id);
  });
  return value;
}
export function Incompatibilites() {
  const { admin } = useAdminAuth();
  return <Panel key={`${admin?.id}:${admin?.role}:${getAdminToken() || ""}`} />;
}
function Panel() {
  const { admin } = useAdminAuth(),
    allowed = ["ADMIN", "SUPER_ADMIN"].includes(admin?.role || "");
  const storageKey = `newoteg_incompatibility_decision_v1:${admin?.id}`;
  const [saved, setSaved] = useState<{
    attempt: Attempt | null;
    invalid: boolean;
  }>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return {
        attempt: raw ? validateAttempt(JSON.parse(raw)) : null,
        invalid: false,
      };
    } catch {
      return { attempt: null, invalid: true };
    }
  });
  const attempt = saved.attempt;
  const [filter, setFilter] = useState<State>("SIGNALE"),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<{ items: Row[]; total: number } | null>(
      null,
    ),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Row | null>(null),
    [action, setAction] = useState<Action>("EN_EXAMEN"),
    [reply, setReply] = useState(""),
    [quantity, setQuantity] = useState(1),
    [diagnostic, setDiagnostic] = useState<keyof typeof reasons>("BROCHAGE"),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setSelected(null);
    api
      .get("/incompatibilites/admin", {
        params: { statut: filter, page },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!controller.signal.aborted) setData(parseList(data, page));
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Le registre n’a pas pu être lu. Actualisez avant de décider.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [allowed, filter, page, refresh]);
  async function execute(value: Attempt) {
    if (lock.current || !allowed) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        `/incompatibilites/admin/${value.id}/decision`,
        value.body,
      );
      if (
        data?.id !== value.id ||
        data.statut !== value.body.action ||
        data.version !== value.body.expectedVersion + 1
      )
        throw Error("Unconfirmed result");
      if (!active.current) return;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Receipt can be replayed. */
      }
      setSaved({ attempt: null, invalid: false });
      setSelected(null);
      setNotice(
        "Décision enregistrée. La réponse est visible dans le suivi privé du client.",
      );
      setRefresh((n) => n + 1);
    } catch (e: any) {
      if (active.current)
        setError(
          e?.response?.status === 409
            ? "Le dossier ou cette tentative a changé. Actualisez le registre et vérifiez l’historique avant une nouvelle décision."
            : "Résultat non confirmé. Gardez la tentative et reprenez exactement la même décision.",
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busy || attempt || saved.invalid || !confirmed) return;
    const value: Attempt = {
      id: selected.id,
      body: {
        requestId: crypto.randomUUID(),
        expectedVersion: selected.version,
        action,
        reponse: reply.trim(),
        ...(action === "RETOUR_CONFIRME"
          ? { retourQuantite: quantity, diagnostic }
          : {}),
      },
    };
    try {
      validateAttempt(value);
      if (quantity > selected.quantite && action === "RETOUR_CONFIRME")
        throw Error("Invalid quantity");
      const raw = JSON.stringify(value);
      sessionStorage.setItem(storageKey, raw);
      if (sessionStorage.getItem(storageKey) !== raw)
        throw Error("Storage unavailable");
      setSaved({ attempt: value, invalid: false });
    } catch {
      setError(
        "Vérifiez les champs et le stockage de cet onglet. Aucune décision n’a été envoyée.",
      );
      return;
    }
    await execute(value);
  }
  if (!allowed)
    return (
      <p role="alert">
        Cet espace est réservé aux responsables de la boutique.
      </p>
    );
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-[#0B1636] sm:text-3xl">
          Incompatibilités signalées
        </h1>
        <p className="mt-2 max-w-[75ch] text-sm text-slate-600">
          Lire le montage du client, examiner le problème et conserver une
          réponse privée. Un signalement n’autorise pas un retour commercial.
        </p>
      </header>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          État du dossier
          <select
            className="field mt-2"
            value={filter}
            aria-label="État du dossier"
            disabled={busy}
            onChange={(e) => {
              setFilter(e.target.value as State);
              setPage(1);
              setError("");
            }}
          >
            {Object.entries(labels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className={button}
          disabled={busy}
          onClick={() => {
            setError("");
            setRefresh((n) => n + 1);
          }}
        >
          Actualiser
        </button>
      </div>
      {notice && (
        <p role="status" className="border-l-2 border-success pl-4 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      {saved.invalid && (
        <p role="alert">
          Tentative illisible. Vérifiez les dossiers et l’historique avant de
          l’effacer.{" "}
          <button
            className={button}
            disabled={busy || !data}
            onClick={() => {
              try {
                sessionStorage.removeItem(storageKey);
                setSaved({ attempt: null, invalid: false });
              } catch {
                setError("Le stockage de cet onglet est indisponible.");
              }
            }}
          >
            Effacer la tentative illisible
          </button>
        </p>
      )}
      {attempt && (
        <section className="space-y-3 border-l-2 border-amber-600 bg-amber-50 p-4">
          <h2 className="font-semibold">Décision à vérifier</h2>
          <p className="text-sm">
            {labels[attempt.body.action]} — réponse conservée dans cet onglet.
            Vérifiez l’historique avant toute autre décision.
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">
            {attempt.body.reponse}
          </p>
          <button
            className={button}
            disabled={busy}
            onClick={() => execute(attempt)}
          >
            Reprendre la même décision
          </button>
          <button
            className={button}
            disabled={busy || !data}
            onClick={() => {
              if (
                window.confirm(
                  "Avez-vous vérifié le dossier et son historique ? Effacer la tentative ne supprime aucune décision du serveur.",
                )
              ) {
                try {
                  sessionStorage.removeItem(storageKey);
                  setSaved({ attempt: null, invalid: false });
                } catch {
                  setError("Le stockage de cet onglet est indisponible.");
                }
              }
            }}
          >
            Effacer après vérification
          </button>
        </section>
      )}
      {loading && <p role="status">Chargement des dossiers…</p>}
      {data && (
        <>
          <p className="text-sm text-slate-600">
            {data.total} dossier(s) · page {page}
          </p>
          {!data.items.length && <p>Aucun dossier dans cet état.</p>}
          <div className="divide-y divide-slate-200">
            {data.items.map((row) => (
              <article key={row.id} className="space-y-3 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {row.ligne.nomProduit}
                    </h2>
                    <p className="text-sm text-slate-600">
                      Commande {row.ligne.commande.numeroSuivi} ·{" "}
                      {date(row.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#176D63]">
                    {labels[row.statut]}
                  </span>
                </div>
                <p className="text-sm">
                  {row.quantite} pièce(s) concernée(s) sur {row.ligne.quantite}{" "}
                  achetée(s) · {reasons[row.motif]}
                </p>
                <p className="max-w-[75ch] whitespace-pre-wrap break-words text-sm">
                  {row.description}
                </p>
                {row.reponseBoutique && (
                  <div className="border-l-2 border-success pl-4">
                    <strong className="text-sm">
                      Dernière réponse de la boutique
                    </strong>
                    <p className="max-w-[75ch] whitespace-pre-wrap break-words text-sm">
                      {row.reponseBoutique}
                    </p>
                  </div>
                )}
                {row.statut === "RETOUR_CONFIRME" && (
                  <p className="text-sm">
                    {row.retourQuantite} pièce(s) retournée(s), confirmées le{" "}
                    {date(row.retourConfirmeAt!)}. Aucun remboursement ni
                    mouvement de stock automatique.
                  </p>
                )}
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">
                    Historique des décisions (30 dernières)
                  </summary>
                  {!row.historique.length && (
                    <p className="mt-2 text-sm">Aucune décision enregistrée.</p>
                  )}
                  {row.historique.map((item, i) => (
                    <div
                      key={i}
                      className="mt-3 border-l border-slate-300 pl-4"
                    >
                      <p className="text-sm font-semibold">
                        {labels[item.action]} · {date(item.createdAt)}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {item.reponse}
                      </p>
                    </div>
                  ))}
                </details>
                {!terminal(row.statut) && (
                  <button
                    className={button}
                    disabled={busy || !!attempt || saved.invalid}
                    onClick={() => {
                      setSelected(row);
                      setAction("EN_EXAMEN");
                      setReply("");
                      setQuantity(row.quantite);
                      setConfirmed(false);
                      setError("");
                    }}
                  >
                    Examiner et répondre
                  </button>
                )}
                {selected?.id === row.id && (
                  <form
                    className="max-w-2xl space-y-4 border-t border-slate-200 pt-4"
                    onSubmit={submit}
                  >
                    <label className="block text-sm">
                      Décision
                      <select
                        className="field mt-2"
                        value={action}
                        aria-label="Décision"
                        disabled={busy || !!attempt}
                        onChange={(e) => {
                          setAction(e.target.value as Action);
                          setConfirmed(false);
                        }}
                      >
                        <option value="EN_EXAMEN">Poursuivre l’examen</option>
                        <option value="RESOLU_SANS_RETOUR">
                          Résoudre sans retour
                        </option>
                        <option value="CLOTURE">
                          Clôturer avec explication
                        </option>
                        <option value="RETOUR_CONFIRME">
                          Confirmer un retour reçu
                        </option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      Réponse privée au client
                      <textarea
                        className="field mt-2"
                        rows={4}
                        required
                        minLength={10}
                        maxLength={1000}
                        value={reply}
                        disabled={busy || !!attempt}
                        onChange={(e) => setReply(e.target.value)}
                      />
                    </label>
                    {action === "RETOUR_CONFIRME" && (
                      <>
                        <label className="block text-sm">
                          Quantité physiquement reçue
                          <input
                            className="field mt-2"
                            type="number"
                            min={1}
                            max={row.quantite}
                            step={1}
                            required
                            value={quantity}
                            disabled={busy || !!attempt}
                            onChange={(e) =>
                              setQuantity(Number(e.target.value))
                            }
                          />
                        </label>
                        <label className="block text-sm">
                          Diagnostic vérifié
                          <select
                            className="field mt-2"
                            value={diagnostic}
                            disabled={busy || !!attempt}
                            onChange={(e) =>
                              setDiagnostic(
                                e.target.value as keyof typeof reasons,
                              )
                            }
                          >
                            {Object.entries(reasons).map(([id, name]) => (
                              <option value={id} key={id}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="text-sm text-amber-800">
                          Confirmez uniquement les pièces reçues et vérifiées.
                          Cette décision termine le dossier pour la quantité
                          indiquée ; les autres pièces ne sont pas déclarées
                          retournées. Elle ne déclenche ni remboursement ni
                          remise en stock.
                        </p>
                      </>
                    )}
                    {action !== "EN_EXAMEN" && action !== "RETOUR_CONFIRME" && (
                      <p className="text-sm text-amber-800">
                        Cette décision termine le dossier. L’explication et
                        l’historique resteront consultables.
                      </p>
                    )}
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        required
                        checked={confirmed}
                        disabled={busy || !!attempt}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      <span>
                        {action === "RETOUR_CONFIRME"
                          ? "J’ai reçu et vérifié physiquement cette quantité et relu la réponse."
                          : "J’ai vérifié le dossier et relu la réponse au client."}
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className={`${button} bg-primary text-white`}
                        disabled={busy || !!attempt || !confirmed}
                      >
                        Enregistrer la décision
                      </button>
                      <button
                        type="button"
                        className={button}
                        disabled={busy}
                        onClick={() => setSelected(null)}
                      >
                        Fermer
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
          <nav aria-label="Pages des incompatibilités" className="flex gap-3">
            <button
              className={button}
              disabled={busy || page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Page précédente
            </button>
            <button
              className={button}
              disabled={busy || page * 30 >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Page suivante
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
