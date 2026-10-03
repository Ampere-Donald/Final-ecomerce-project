import React, { useEffect, useRef, useState } from "react";
import { commandeApi, getApiErrorMessage } from "../services/api";
import type { GuestOrderAccessStatus } from "../types";

const labels: Record<GuestOrderAccessStatus["state"], string> = {
  ACTIVE: "Lien actif",
  EXPIRED: "Lien expiré",
  REVOKED: "Accès révoqué",
  LINKED: "Commande rattachée au compte",
  ACCOUNT: "Commande avec compte",
  NO_ACCESS: "Aucun accès invité",
};
const date = (value: string) => new Date(value).toLocaleString("fr-FR");

/** Rendered only for administrators; the API enforces the same roles. */
export function GuestOrderAccess({ orderId }: { orderId: string }) {
  const [data, setData] = useState<GuestOrderAccessStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    commandeApi
      .getGuestAccess(orderId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            getApiErrorMessage(e, "État de l’accès indisponible. Réessayez."),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          lock.current = false;
          setBusy(false);
        }
      });
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [orderId]);

  async function refresh() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await commandeApi.getGuestAccess(orderId);
      if (!mounted.current) return;
      setData(value);
      setUncertain(false);
      if (!value.canRevoke) {
        setEditing(false);
        setAgreed(false);
      }
      if (uncertain && value.grant?.revokedAt)
        setNotice("La révocation est confirmée.");
    } catch (e) {
      if (mounted.current)
        setError(
          getApiErrorMessage(
            e,
            "État de l’accès indisponible. Conservez cette demande et vérifiez son état.",
          ),
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function revoke(event: React.FormEvent) {
    event.preventDefault();
    if (
      lock.current ||
      !data?.canRevoke ||
      !data.grant ||
      !agreed ||
      !reason.trim() ||
      uncertain
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setUncertain(true);
    try {
      await commandeApi.revokeGuestAccess(orderId, {
        expectedVersion: data.grant.version,
        reason: reason.trim(),
      });
      const value = await commandeApi.getGuestAccess(orderId);
      if (!mounted.current) return;
      setData(value);
      if (!value.grant?.revokedAt) throw new Error("Révocation non confirmée");
      setUncertain(false);
      setEditing(false);
      setAgreed(false);
      setReason("");
      setNotice("L’accès invité est révoqué. La commande reste conservée.");
    } catch (e) {
      if (mounted.current)
        setError(
          getApiErrorMessage(
            e,
            "Le résultat doit être vérifié avant une nouvelle demande de révocation.",
          ),
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="guest-access-title"
      className="border-t border-slate-200 pt-5 space-y-3 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id="guest-access-title" className="font-semibold text-slate-900">
          Suivi sans compte
        </h4>
        {data && (
          <span
            className={`px-2 py-1 rounded-md font-medium ${data.state === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : data.state === "EXPIRED" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}
          >
            {labels[data.state]}
          </span>
        )}
      </div>
      {busy && (
        <p role="status" className="text-slate-500">
          Vérification de l’accès…
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-emerald-800">
          {notice}
        </p>
      )}
      {data && (
        <>
          {data.grant ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
              <div>
                <dt>Dernier accès émis</dt>
                <dd className="font-medium text-slate-900">
                  {date(data.grant.issuedAt)}
                </dd>
              </div>
              <div>
                <dt>Expiration du lien</dt>
                <dd className="font-medium text-slate-900">
                  {date(data.grant.expiresAt)}
                </dd>
              </div>
              {data.grant.revokedAt && (
                <div className="sm:col-span-2">
                  <dt>Révocation enregistrée</dt>
                  <dd>
                    {date(data.grant.revokedAt)}
                    {data.grant.reason && (
                      <p className="break-words mt-1">{data.grant.reason}</p>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-slate-600">
              {data.state === "ACCOUNT"
                ? "Le client retrouve cette commande depuis son compte."
                : "Aucun lien privé n’a été créé pour cette commande. Un téléphone ou un numéro de commande ne permet pas de créer cet accès."}
            </p>
          )}
          {data.state === "LINKED" && (
            <p className="text-slate-600">
              Le suivi invité est fermé. Le client utilise désormais son compte.
            </p>
          )}
          {data.state === "EXPIRED" && (
            <p className="text-slate-600">
              Le lien ne permet plus de consulter la commande. La récupération
              exige une preuve distincte.
            </p>
          )}
          <p className="text-slate-600">
            Email de récupération :{" "}
            {data.channels.email ? "service configuré" : "service indisponible"}
            . SMS :{" "}
            {data.channels.sms ? "service configuré" : "service indisponible"}.
            Aucun message n’est envoyé depuis cet écran.
          </p>
          {data.canRevoke && !editing && !uncertain && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(true);
                setNotice("");
              }}
              className="min-h-11 px-3 border border-red-200 rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Préparer la révocation de l’accès
            </button>
          )}
          {editing && data.canRevoke && (
            <form
              onSubmit={revoke}
              className="space-y-3 border-l-2 border-red-200 pl-4"
            >
              <p className="text-slate-700">
                La révocation bloque le lien privé et les codes en attente. Elle
                ne supprime pas la commande, ne l’annule pas et ne modifie ni le
                stock ni les paiements.
              </p>
              <label className="block font-medium">
                Motif de révocation
                <textarea
                  required
                  maxLength={200}
                  value={reason}
                  disabled={busy || uncertain}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  className="mt-1 w-full border border-slate-300 rounded-lg p-3 font-normal"
                />
              </label>
              <p className="text-xs text-slate-500">
                Décrivez le motif, sans copier de clé privée, de code ou de
                coordonnées.
              </p>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  disabled={busy || uncertain}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-1"
                />
                <span>Je confirme la fermeture de cet accès invité.</span>
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={busy || uncertain || !agreed || !reason.trim()}
                  className="min-h-11 px-3 bg-red-700 text-white rounded-lg disabled:opacity-50"
                >
                  Révoquer l’accès invité
                </button>
                {!uncertain && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(false);
                      setReason("");
                      setAgreed(false);
                    }}
                    className="min-h-11 px-3 text-slate-700"
                  >
                    Fermer sans révoquer
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}
      {uncertain && (
        <p className="text-amber-800">
          Une demande a été envoyée. Vérifiez son résultat avant de recommencer.
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={refresh}
        className="min-h-11 text-primary underline underline-offset-4 disabled:opacity-50"
      >
        {uncertain
          ? "Vérifier le résultat de la révocation"
          : "Actualiser l’état de l’accès"}
      </button>
    </section>
  );
}
