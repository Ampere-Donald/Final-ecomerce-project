import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { guestApiMessage } from "./guestMessages.js";
import { Modal } from "./Elements";
import {
  newGuestKey,
  saveGuestAction,
  readGuestAction,
  clearGuestAction,
} from "./guestAccess";

export default function GuestActions({
  accessToken,
  order,
  availability,
  onDone,
}) {
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [attempt, setAttempt] = useState(() => {
    const saved = readGuestAction();
    return saved?.accessToken === accessToken ? saved : null;
  });
  const [selected, setSelected] = useState(attempt?.action || "");
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false);
  const action = attempt?.action || selected;
  const cancel = action === "CANCEL";
  const cancelEligible =
    order && ["EN_ATTENTE", "CONFIRMEE"].includes(order.statut);
  const receiveEligible =
    order?.statut === "EN_LIVRAISON" && order.modeReception === "LIVRAISON";
  const enabled = cancel
    ? availability?.canRequestCancel
    : availability?.canRequestReception;

  async function perform(task) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(
        guestApiMessage(
          e,
          lang,
          tr(
            "Le résultat n’a pas pu être vérifié. Conservez cette tentative et vérifiez son résultat avant de recommencer.",
            "The result could not be verified. Keep this attempt and check its result before starting again.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function request() {
    await perform(async () => {
      const { data } = await apiClient.post(
        "/commandes/guest/actions/request",
        { accessToken, action },
        { timeout: 20000 },
      );
      if (data.available === false) {
        setNotice(
          tr(
            "L’envoi du code n’est pas disponible. Contactez la boutique.",
            "Code delivery is unavailable. Contact the shop.",
          ),
        );
        return;
      }
      const next = {
        accessToken,
        action,
        challengeId: data.challengeId,
        actionKey: newGuestKey(),
        orderId: order.id,
      };
      saveGuestAction(next);
      setAttempt(next);
      setCode("");
      setNotice(
        tr(
          "Un code valable 10 minutes a été envoyé à l’email de la commande.",
          "A code valid for 10 minutes has been sent to the order’s email.",
        ),
      );
    });
  }
  function finish(result) {
    if (
      result?.commandeId !== attempt.orderId ||
      result?.action !== attempt.action ||
      result.statut !== (attempt.action === "CANCEL" ? "ANNULEE" : "LIVREE")
    )
      throw new Error("Unconfirmed order action");
    clearGuestAction();
    setAttempt(null);
    setOpen(false);
    setCode("");
    setNotice("");
    onDone(result);
  }
  async function execute(codeValue) {
    const { data } = await apiClient.post(
      "/commandes/guest/actions",
      {
        accessToken: attempt.accessToken,
        action: attempt.action,
        challengeId: attempt.challengeId,
        actionKey: attempt.actionKey,
        ...(codeValue ? { code: codeValue } : {}),
      },
      { timeout: 20000 },
    );
    return data;
  }
  async function verify(event) {
    event.preventDefault();
    await perform(async () => {
      try {
        finish(await execute());
        return;
      } catch (e) {
        if (e.response?.data?.code !== "GUEST_ACTION_CODE_REQUIRED") throw e;
      }
      finish(await execute(code.trim()));
    });
  }
  async function retry() {
    await perform(async () => finish(await execute()));
  }
  if (!cancelEligible && !receiveEligible && !attempt) return null;
  return (
    <section className="e-guest-link">
      <h3>
        {tr(
          "Gérer cette commande sans compte",
          "Manage this order without an account",
        )}
      </h3>
      {attempt ? (
        <>
          <p role="status">
            {tr(
              "Une demande est conservée sur cet appareil. Vérifiez son résultat avant de recommencer.",
              "A request is saved on this device. Check its result before starting again.",
            )}
          </p>
          <button
            className="e-btn e-btn-outline"
            disabled={busy}
            onClick={() => {
              setOpen(true);
              retry();
            }}
          >
            {tr(
              "Vérifier le résultat de ma demande",
              "Check my request result",
            )}
          </button>
        </>
      ) : (
        <>
          <p>
            {tr(
              "Un code envoyé à l’email de la commande est nécessaire. Votre lien de suivi seul ne peut pas modifier la commande.",
              "A code sent to the order’s email is required. Your tracking link alone cannot change the order.",
            )}
          </p>
          <div className="e-actions">
            {cancelEligible && (
              <button
                className="e-btn e-btn-outline"
                disabled={!availability?.canRequestCancel}
                onClick={() => {
                  setSelected("CANCEL");
                  setOpen(true);
                  setError("");
                  setNotice("");
                }}
              >
                {tr("Annuler la commande", "Cancel order")}
              </button>
            )}
            {receiveEligible && (
              <button
                className="e-btn"
                disabled={!availability?.canRequestReception}
                onClick={() => {
                  setSelected("RECEIVE");
                  setOpen(true);
                  setError("");
                  setNotice("");
                }}
              >
                {tr("Confirmer la réception", "Confirm receipt")}
              </button>
            )}
          </div>
          {!availability?.canRequestCancel &&
            !availability?.canRequestReception && (
              <p className="e-note">
                {tr(
                  "Le service email doit être disponible et une adresse doit avoir été enregistrée à la commande. Pour le moment, contactez la boutique pour cette demande.",
                  "Email must be available and an address must have been recorded at checkout. For now, contact the shop about this request.",
                )}
              </p>
            )}
        </>
      )}
      <Link to="/contact">
        {tr("Contacter la boutique", "Contact the shop")}
      </Link>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title={
          cancel
            ? tr("Annuler la commande ?", "Cancel this order?")
            : tr(
                "Avez-vous reçu vos articles ?",
                "Have you received your items?",
              )
        }
      >
        <form className="e-form" onSubmit={verify}>
          <p>
            {cancel
              ? tr(
                  "La commande sera annulée et les articles seront remis en stock. Cette action n’effectue aucun remboursement automatique. Contactez la boutique si vous avez déjà payé.",
                  "The order will be cancelled and the items returned to stock. This action does not issue an automatic refund. Contact the shop if you have already paid.",
                )
              : tr(
                  "Confirmez uniquement après avoir reçu tous les articles de votre livraison. Cette confirmation ne valide aucun paiement. Le retrait en boutique est confirmé par l’équipe.",
                  "Confirm only after receiving all items in your delivery. This confirmation does not validate payment. In-store pickup is confirmed by the team.",
                )}
          </p>
          <p>
            {tr(
              "Le code sera envoyé uniquement à l’adresse enregistrée lors de votre commande.",
              "The code will be sent only to the address recorded at checkout.",
            )}
          </p>
          {notice && <p role="status">{notice}</p>}
          {error && (
            <p className="e-form-error" role="alert">
              {error}
            </p>
          )}
          {attempt ? (
            <>
              <label className="e-field">
                {tr(
                  "Code reçu par email pour cette action",
                  "Email code for this action",
                )}
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  pattern="[0-9]{8}"
                  maxLength={8}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              <button className="e-btn" disabled={busy}>
                {cancel
                  ? tr("Confirmer l’annulation", "Confirm cancellation")
                  : tr(
                      "Confirmer la réception des articles",
                      "Confirm receipt of items",
                    )}
              </button>
              <button
                type="button"
                className="e-text-button"
                disabled={busy}
                onClick={retry}
              >
                {tr(
                  "Vérifier le résultat sans renvoyer le code",
                  "Check result without resending the code",
                )}
              </button>
              <p>
                <small>
                  {tr(
                    "Si le code est définitivement expiré ou remplacé, vous pouvez effacer cette tentative. Cela n’annule pas une action déjà effectuée.",
                    "If the code is definitely expired or replaced, you can clear this attempt. This does not undo a completed action.",
                  )}
                </small>
              </p>
              <button
                type="button"
                className="e-text-button"
                disabled={busy}
                onClick={() => {
                  clearGuestAction();
                  setAttempt(null);
                  setCode("");
                  setError("");
                  setNotice("");
                }}
              >
                {tr("Effacer cette tentative", "Clear this attempt")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="e-btn"
              disabled={busy || !enabled}
              onClick={request}
            >
              {cancel
                ? tr("Recevoir un code d’annulation", "Get a cancellation code")
                : tr("Recevoir un code de réception", "Get a receipt code")}
            </button>
          )}
        </form>
      </Modal>
    </section>
  );
}
