import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { apiMessage } from "./orderData";
import { Modal } from "./Elements";
import {
  newGuestKey,
  readGuestLink,
  saveGuestLink,
  clearGuestLink,
  forgetGuestKey,
} from "./guestAccess";

export default function GuestLink({ accessToken, available, hasOrder }) {
  const { user, token, loading } = useAuth();
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const navigate = useNavigate();
  const saved = readGuestLink();
  const [attempt, setAttempt] = useState(() =>
    saved?.accessToken === accessToken ? saved : null,
  );
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false);
  const sameAccount = !!user?.id && (!attempt || attempt.clientId === user.id);
  const auth = {
    timeout: 20000,
    headers: { Authorization: `Bearer ${token}` },
  };

  async function perform(task) {
    if (lock.current || loading || !token || !sameAccount) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(
        apiMessage(
          e,
          tr(
            "La réponse n’a pas pu être vérifiée. Conservez cette tentative et vérifiez son résultat avant de recommencer.",
            "The response could not be verified. Keep this attempt and check its result before starting again.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function finish(result) {
    if (!result?.linked || !result.commandeId)
      throw new Error("Unconfirmed linking");
    forgetGuestKey();
    clearGuestLink();
    navigate(`/commandes/${encodeURIComponent(result.commandeId)}`, {
      replace: true,
    });
  }
  async function request() {
    await perform(async () => {
      const { data } = await apiClient.post(
        "/commandes/guest/link/request",
        { accessToken },
        auth,
      );
      if (data.available === false) {
        setNotice(data.message);
        return;
      }
      const next = {
        accessToken,
        challengeId: data.challengeId,
        actionKey: newGuestKey(),
        clientId: user.id,
      };
      saveGuestLink(next);
      setAttempt(next);
      setNotice(data.message);
      setCode("");
    });
  }
  async function verify(event) {
    event.preventDefault();
    await perform(async () => {
      // A previous completed operation may have lost its response. Check its
      // receipt first; a code is needed only if no linking was committed.
      try {
        const { data } = await apiClient.post(
          "/commandes/guest/link",
          {
            accessToken: attempt.accessToken,
            challengeId: attempt.challengeId,
            actionKey: attempt.actionKey,
          },
          auth,
        );
        finish(data);
        return;
      } catch (e) {
        if (e.response?.data?.code !== "GUEST_LINK_CODE_REQUIRED") throw e;
      }
      const { data } = await apiClient.post(
        "/commandes/guest/link",
        {
          accessToken: attempt.accessToken,
          challengeId: attempt.challengeId,
          actionKey: attempt.actionKey,
          code: code.trim(),
        },
        auth,
      );
      finish(data);
    });
  }
  async function retry() {
    await perform(async () => {
      const { data } = await apiClient.post(
        "/commandes/guest/link",
        {
          accessToken: attempt.accessToken,
          challengeId: attempt.challengeId,
          actionKey: attempt.actionKey,
        },
        auth,
      );
      finish(data);
    });
  }
  if (!hasOrder && !attempt) return null;
  return (
    <section className="e-guest-link">
      <h3>
        {tr(
          "Retrouver cette commande dans mon compte",
          "Keep this order in my account",
        )}
      </h3>
      <p>
        {tr(
          "Le rattachement est facultatif. Il demande une connexion à votre compte et un code envoyé à l’email enregistré lors de la commande.",
          "Linking is optional. Sign into your account and use a code sent to the email recorded at checkout.",
        )}
      </p>
      {attempt ? (
        <>
          <p role="status">
            {tr(
              "Une tentative de rattachement est conservée sur cet appareil. Vérifiez son résultat avant de demander un autre code.",
              "A linking attempt is saved on this device. Check its result before requesting another code.",
            )}
          </p>
          <button
            className="e-btn e-btn-outline"
            disabled={loading || busy || !sameAccount}
            onClick={() => {
              setOpen(true);
              retry();
            }}
          >
            {tr("Vérifier le résultat du rattachement", "Check linking result")}
          </button>
        </>
      ) : available ? (
        <button
          className="e-text-button"
          disabled={loading}
          onClick={() => setOpen(true)}
        >
          {tr("Rattacher à mon compte", "Link to my account")}
        </button>
      ) : (
        <p className="e-note">
          {tr(
            "Le service email doit être disponible et une adresse doit avoir été enregistrée à la commande. Pour le moment, conservez votre lien privé ou contactez la boutique.",
            "Email must be available and an address must have been recorded at checkout. For now, keep your private link or contact the shop.",
          )}
        </p>
      )}
      {(!user || !sameAccount) && attempt && (
        <Link to="/login?returnTo=%2Fsuivi-invite">
          {tr(
            "Se connecter au compte concerné",
            "Sign into the selected account",
          )}
        </Link>
      )}
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title={tr(
          "Rattacher la commande à mon compte",
          "Link the order to my account",
        )}
      >
        {loading ? (
          <p role="status">
            {tr("Vérification du compte…", "Checking account…")}
          </p>
        ) : !user || !sameAccount ? (
          <>
            <p>
              {tr(
                "Connectez-vous au compte auquel vous souhaitez rattacher la commande. Une tentative en cours reste liée au compte choisi au départ.",
                "Sign into the account that should own this order. A pending attempt stays bound to the initially selected account.",
              )}
            </p>
            <Link className="e-btn" to="/login?returnTo=%2Fsuivi-invite">
              {tr("Se connecter", "Sign in")}
            </Link>
          </>
        ) : (
          <form className="e-form" onSubmit={verify}>
            <p>
              {tr("Compte destinataire : ", "Destination account: ")}
              <strong>{user.email}</strong>
            </p>
            <p>
              {tr(
                "Ce compte pourra consulter les coordonnées et gérer la commande. Le lien invité sera désactivé après le rattachement. Aucun paiement n’est effectué.",
                "This account will be able to view contact details and manage the order. Your guest link will be disabled after linking. No payment is made.",
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
                    "Code de rattachement reçu par email",
                    "Linking code received by email",
                  )}
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{8}"
                    maxLength={8}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
                <button className="e-btn" disabled={busy}>
                  {tr("Confirmer le rattachement", "Confirm linking")}
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
                      "Si le code est définitivement expiré ou remplacé, vous pouvez effacer cette tentative. Cela n’annule pas un rattachement déjà effectué.",
                      "If the code is definitely expired or replaced, you can clear this attempt. This does not undo a completed link.",
                    )}
                  </small>
                </p>
                <button
                  type="button"
                  className="e-text-button"
                  disabled={busy}
                  onClick={() => {
                    clearGuestLink();
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
                disabled={busy || !available}
                onClick={request}
              >
                {tr("Recevoir un code de rattachement", "Get a linking code")}
              </button>
            )}
          </form>
        )}
      </Modal>
    </section>
  );
}
