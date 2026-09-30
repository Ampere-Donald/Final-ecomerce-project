import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  demandeDevisApi,
  proformaApi,
  getApiErrorMessage,
} from "../services/api";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fmtDateCourt, fmtFCFA } from "../utils/format";

type RequestLine = { reference: string; quantite: number; nomProduit?: string };
type RequestRow = {
  id: string;
  clientId: string;
  nomClient: string;
  telephone: string;
  modeReception: string;
  destination?: string;
  notes?: string;
  statut: string;
  version: number;
  createdAt: string;
  reponseClient?: string;
  responsable?: { id: string; nom: string };
  lignes: RequestLine[];
  historique: {
    statut: string;
    createdAt: string;
    details?: { action?: string; message?: string };
  }[];
};
type Proforma = {
  id: string;
  clientId?: string;
  numero: string;
  vendeurId: string;
  statut: string;
  dateExpiration: string;
  montantTotal: string | number;
};
type Responsible = { id: string; nom: string; role: string };
const labels: Record<string, string> = {
  RECUE: "Reçue",
  A_PRECISER: "À préciser",
  ENVOYEE: "Proposition envoyée",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Clôturée",
  EXPIREE: "Expirée",
};
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export const DemandesDevis = () => {
  const { admin } = useAdminAuth();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [responsables, setResponsables] = useState<Responsible[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    statut: "A_PRECISER" as "A_PRECISER" | "ENVOYEE" | "REFUSEE",
    message: "",
    proformaId: "",
    motifRemise: "",
  });
  const lock = useRef(false);
  const loadSequence = useRef(0);
  const actorKey = `${admin?.id}:${admin?.role}`;
  const [loadedActor, setLoadedActor] = useState("");
  const allowed = ["SUPER_ADMIN", "ADMIN", "VENDEUR"].includes(
    admin?.role || "",
  );
  const canManage = ["SUPER_ADMIN", "ADMIN"].includes(admin?.role || "");
  const load = useCallback(async () => {
    if (!allowed) return;
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const [requests, quotes, assignees] = await Promise.all([
        demandeDevisApi.getAll(),
        proformaApi.getAll({ statut: "EN_COURS" }),
        canManage ? demandeDevisApi.getResponsables() : Promise.resolve([]),
      ]);
      if (sequence !== loadSequence.current) return;
      if (
        !Array.isArray(requests) ||
        requests.some((r) => !r?.id || !Array.isArray(r.lignes)) ||
        !Array.isArray(quotes) ||
        !Array.isArray(assignees)
      )
        throw new Error("Invalid quote queue");
      setRows(requests);
      setProformas(quotes);
      setResponsables(assignees);
      setLoadedActor(actorKey);
    } catch (e) {
      if (sequence === loadSequence.current) {
        setRows([]);
        setProformas([]);
        setResponsables([]);
        setError(
          getApiErrorMessage(e, "Impossible de lire les demandes. Réessayez."),
        );
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [allowed, actorKey, canManage]);
  useEffect(() => {
    void load();
    return () => {
      loadSequence.current += 1;
    };
  }, [load]);
  const current = loadedActor === actorKey;
  const selected = current ? rows.find((r) => r.id === selectedId) : undefined;
  useEffect(() => {
    setAssigneeId(selected?.responsable?.id || "");
  }, [selected?.id, selected?.version, selected?.responsable?.id]);
  const eligible = selected
    ? proformas.filter(
        (p) =>
          p.clientId === selected.clientId &&
          p.statut === "EN_COURS" &&
          Date.parse(p.dateExpiration) > Date.now() &&
          (admin?.role !== "VENDEUR" || p.vendeurId === admin.id),
      )
    : [];
  const writable = Boolean(
    selected &&
    !["ACCEPTEE", "REFUSEE"].includes(selected.statut) &&
    selected.responsable &&
    (admin?.role !== "VENDEUR" ||
      selected.responsable.id === admin.id),
  );
  async function assign(targetId: string | null) {
    if (lock.current || !selected || ["ACCEPTEE", "REFUSEE"].includes(selected.statut)) return;
    if (!canManage && (admin?.role !== "VENDEUR" || targetId !== admin.id || selected.responsable)) return;
    if (canManage && targetId && !responsables.some((r) => r.id === targetId)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await demandeDevisApi.assign(selected.id, {
        version: selected.version,
        responsableId: targetId,
      });
      setNotice("Affectation enregistrée dans l’historique de la demande.");
    } catch (e) {
      setError(getApiErrorMessage(e, "L’affectation n’a pas pu être confirmée. Vérifiez la demande actualisée."));
    } finally {
      await load();
      setBusy(false);
      lock.current = false;
    }
  }
  async function respond(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !selected || !writable) return;
    if (
      form.statut === "ENVOYEE" &&
      !eligible.some((p) => p.id === form.proformaId)
    ) {
      setError("Choisissez une proforma valide de ce client.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await demandeDevisApi.respond(selected.id, {
        version: selected.version,
        statut: form.statut,
        message: form.message.trim(),
        ...(form.statut === "ENVOYEE"
          ? {
              proformaId: form.proformaId,
              ...(form.motifRemise.trim()
                ? { motifRemise: form.motifRemise.trim() }
                : {}),
            }
          : {}),
      });
      setNotice(
        "La réponse est disponible dans le compte du client. Aucun paiement ni stock réservé.",
      );
      setForm({
        statut: "A_PRECISER",
        message: "",
        proformaId: "",
        motifRemise: "",
      });
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          "Le résultat reste à vérifier. Consultez le statut actualisé avant de renvoyer une réponse.",
        ),
      );
    } finally {
      await load();
      setBusy(false);
      lock.current = false;
    }
  }
  if (!allowed)
    return <p role="alert">Vous n’avez pas accès aux demandes de devis.</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Demandes de devis en ligne
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Vérifiez la liste du client, demandez des précisions ou transmettez
            une proforma.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          disabled={loading || busy}
          onClick={() => {
            setError("");
            void load();
          }}
        >
          Actualiser
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
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
      <label className="block max-w-xs text-sm font-semibold">
        Afficher
        <select
          className={inputClass + " mt-2"}
          value={filter}
          disabled={busy}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="active">Demandes en cours</option>
          <option value="all">Toutes les demandes</option>
          <option value="RECUE">Reçues</option>
          <option value="A_PRECISER">À préciser</option>
          <option value="ENVOYEE">Propositions envoyées</option>
        </select>
      </label>
      {loading ? (
        <p role="status">Chargement des demandes…</p>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(250px,1fr)_minmax(0,2fr)]">
          <section
            aria-label="File de demandes"
            className="min-w-0 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
          >
            {current &&
              rows
                .filter(
                  (r) =>
                    filter === "all" ||
                    (filter === "active" &&
                      !["ACCEPTEE", "REFUSEE"].includes(r.statut)) ||
                    r.statut === filter,
                )
                .map((r) => (
                  <button
                    key={r.id}
                    aria-pressed={selectedId === r.id}
                    disabled={busy}
                    onClick={() => {
                      setSelectedId(r.id);
                      setForm({
                        statut: "A_PRECISER",
                        message: "",
                        proformaId: "",
                        motifRemise: "",
                      });
                      setError("");
                      setNotice("");
                    }}
                    className={`block w-full space-y-2 p-5 text-left ${selectedId === r.id ? "bg-blue-50" : ""}`}
                  >
                    <span className="block text-xs font-semibold text-emerald-800">
                      {labels[r.statut] || r.statut}
                    </span>
                    <strong className="block break-words text-slate-900">
                      {r.nomClient}
                    </strong>
                    <span className="block break-words text-sm text-slate-600">
                      {r.lignes[0]?.reference} · {r.lignes.length} référence(s)
                    </span>
                    <small className="block text-slate-500">
                      {fmtDateCourt(r.createdAt)} ·{" "}
                      {r.responsable?.nom || "Non affectée"}
                    </small>
                  </button>
                ))}
            {current && !rows.length && (
              <p className="p-5 text-sm text-slate-600">
                Aucune demande reçue.
              </p>
            )}
          </section>
          {selected ? (
            <section
              className="min-w-0 space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
              aria-label="Demande sélectionnée"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selected.nomClient}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {selected.telephone}
                  <br />
                  {selected.modeReception === "RETRAIT_MAGASIN"
                    ? "Retrait à Akwa"
                    : `Livraison · ${selected.destination || ""}`}
                  <br />
                  Frais et délai à confirmer.
                </p>
                {selected.notes && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                    {selected.notes}
                  </p>
                )}
              </div>
              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {selected.lignes.map((line, index) => (
                  <li
                    key={index}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <div className="min-w-0 break-words">
                      <strong>{line.reference}</strong>
                      <p className="text-slate-600">
                        {line.nomProduit || "Référence à préciser"}
                      </p>
                    </div>
                    <span className="shrink-0">{line.quantite} pièce(s)</span>
                  </li>
                ))}
              </ul>
              {!["ACCEPTEE", "REFUSEE"].includes(selected.statut) && (
                <section className="border-l-4 border-blue-600 bg-blue-50 p-4" aria-label="Responsable de la demande">
                  <h3 className="text-sm font-bold">Responsable du traitement</h3>
                  <p className="mt-1 text-sm text-slate-700">{selected.responsable?.nom || "Demande non affectée"}</p>
                  {canManage ? (
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className="min-w-[220px] flex-1 text-sm font-semibold">
                        Attribuer à
                        <select className={inputClass + " mt-1"} value={assigneeId} disabled={busy} onChange={(e) => setAssigneeId(e.target.value)}>
                          <option value="">Aucun responsable</option>
                          {responsables.map((r) => <option key={r.id} value={r.id}>{r.nom} · {r.role}</option>)}
                        </select>
                      </label>
                      <button type="button" className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50" disabled={busy || assigneeId === (selected.responsable?.id || "")} onClick={() => void assign(assigneeId || null)}>
                        Enregistrer l’affectation
                      </button>
                    </div>
                  ) : !selected.responsable ? (
                    <button type="button" className="mt-3 rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50" disabled={busy} onClick={() => void assign(admin?.id || null)}>
                      Prendre cette demande
                    </button>
                  ) : null}
                  {!selected.responsable && <p className="mt-2 text-xs text-slate-600">Une affectation est nécessaire avant toute réponse au client.</p>}
                </section>
              )}
              {selected.reponseClient && (
                <div className="border-l-4 border-emerald-600 bg-emerald-50 p-4">
                  <strong className="text-sm">
                    Dernière réponse au client
                  </strong>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {selected.reponseClient}
                  </p>
                </div>
              )}
              {writable && (
                <form onSubmit={respond} className="space-y-4">
                  <fieldset className="space-y-4" disabled={busy}>
                    <legend className="mb-3 font-bold">
                      Répondre au client
                    </legend>
                    <label className="block text-sm font-semibold">
                      Type de réponse
                      <select
                        className={inputClass + " mt-2"}
                        value={form.statut}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            statut: e.target.value as typeof form.statut,
                            proformaId: "",
                            motifRemise: "",
                          })
                        }
                      >
                        <option value="A_PRECISER">
                          Demander des précisions
                        </option>
                        <option value="ENVOYEE">
                          Transmettre une proposition
                        </option>
                        <option value="REFUSEE">
                          Clôturer avec une explication
                        </option>
                      </select>
                    </label>
                    <label className="block text-sm font-semibold">
                      Message visible par le client
                      <textarea
                        rows={4}
                        required
                        maxLength={2000}
                        className={inputClass + " mt-2"}
                        value={form.message}
                        onChange={(e) =>
                          setForm({ ...form, message: e.target.value })
                        }
                      />
                    </label>
                    {form.statut === "ENVOYEE" && (
                      <>
                        <label className="block text-sm font-semibold">
                          Proforma de ce client
                          <select
                            required
                            value={form.proformaId}
                            className={inputClass + " mt-2"}
                            onChange={(e) =>
                              setForm({ ...form, proformaId: e.target.value })
                            }
                          >
                            <option value="">
                              Choisir une proforma en cours
                            </option>
                            {eligible.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.numero} · {fmtFCFA(p.montantTotal)} · expire
                                le {fmtDateCourt(p.dateExpiration)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="text-sm text-slate-600">
                          Seules les proformas non expirées de ce compte client
                          sont proposées. Vérifiez les lignes et tarifs avant
                          l’envoi.
                        </p>
                        <label className="block text-sm font-semibold">
                          Motif de remise (interne)
                          <textarea
                            rows={2}
                            maxLength={500}
                            className={inputClass + " mt-2"}
                            value={form.motifRemise}
                            onChange={(e) =>
                              setForm({ ...form, motifRemise: e.target.value })
                            }
                          />
                          <span className="block mt-1 text-xs font-normal text-slate-600">
                            Requis si une ligne est sous le prix détail. Les
                            limites de votre rôle restent appliquées.
                          </span>
                        </label>
                        <Link
                          className="text-sm font-semibold text-blue-700"
                          to="/proformas"
                        >
                          Préparer ou vérifier une proforma
                        </Link>
                      </>
                    )}
                  </fieldset>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={
                      busy ||
                      !form.message.trim() ||
                      (form.statut === "ENVOYEE" && !form.proformaId)
                    }
                  >
                    {busy ? "Enregistrement…" : "Rendre la réponse disponible"}
                  </button>
                </form>
              )}
              <details>
                <summary className="cursor-pointer text-sm font-semibold">
                  Historique de traitement
                </summary>
                <ol className="mt-4 space-y-4">
                  {selected.historique?.map((event, i) => (
                    <li key={i} className="text-sm">
                      <strong>{event.details?.action === "AFFECTATION" ? "Affectation modifiée" : labels[event.statut] || event.statut}</strong> ·{" "}
                      {fmtDateCourt(event.createdAt)}
                      {event.details?.message && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">
                          {event.details.message}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          ) : (
            <p className="py-5 text-sm text-slate-600">
              Choisissez une demande pour consulter sa liste et préparer la
              réponse.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
