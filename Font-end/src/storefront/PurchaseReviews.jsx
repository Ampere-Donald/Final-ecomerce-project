import { useEffect, useRef, useState } from "react";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { Modal } from "./Elements";
import { apiMessage } from "./orderData";
import { newGuestKey } from "./guestAccess";
import {
  clearReviewAttempt,
  readReviewAttempt,
  reviewContent,
  reviewReceipt,
  saveReviewAttempt,
} from "./reviewData";
import "./reviews.css";

const empty = { note: 0, pseudonyme: "", texte: "", projetRealise: "" };
function formError(message) {
  return Object.assign(new Error("Review form unavailable"), {
    userMessage: message,
  });
}
export default function PurchaseReviews({
  orderId,
  userId,
  token,
  accessToken,
}) {
  const { lang } = useI18n(),
    tr = (fr, en) => (lang === "en" ? en : fr);
  const mode = accessToken ? "guest" : "account",
    scope = `${mode}:${userId || "private"}:${orderId}`;
  const [saved, setSaved] = useState(() => {
    try {
      return { attempt: readReviewAttempt(scope), invalid: false };
    } catch {
      return { attempt: null, invalid: true };
    }
  });
  const attempt = saved.attempt;
  const [resource, setResource] = useState({
      data: null,
      loading: true,
      error: null,
    }),
    [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false),
    [line, setLine] = useState(null),
    [form, setForm] = useState(empty),
    [consent, setConsent] = useState(false);
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setResource({ data: null, loading: true, error: null });
    const options = {
      signal: controller.signal,
      timeout: 20000,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
    const promise = accessToken
      ? apiClient.post("/avis/guest/purchases", { accessToken }, options)
      : apiClient.get(`/avis/commandes/${orderId}`, options);
    promise
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (
          typeof data?.eligible !== "boolean" ||
          !Array.isArray(data.lignes) ||
          (accessToken && data.commandeId !== orderId)
        )
          throw Error("Invalid purchase proof");
        setResource({ data, loading: false, error: null });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setResource({ data: null, loading: false, error: e });
      });
    return () => controller.abort();
  }, [orderId, token, accessToken, refresh]);
  const display = attempt?.body || form;
  const change = (event) =>
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  function begin(value) {
    setLine(value);
    setForm(empty);
    setConsent(false);
    setCode("");
    setError("");
    setOpen(true);
  }
  function resume() {
    setLine(
      resource.data?.lignes.find(
        (item) => item.id === attempt.body.ligneCommandeId,
      ),
    );
    setCode("");
    setError("");
    setOpen(true);
  }
  function remember(value) {
    try {
      saveReviewAttempt(value);
    } catch {
      throw formError(
        tr(
          "La tentative ne peut pas être conservée dans cet onglet. Aucun avis n’a été envoyé. Vérifiez le stockage de votre navigateur.",
          "This attempt cannot be saved in this tab. No review was sent. Check your browser storage.",
        ),
      );
    }
    setSaved({ attempt: value, invalid: false });
    return value;
  }
  async function perform(task) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      if (active.current)
        setError(
          e.userMessage ||
            apiMessage(
              e,
              tr(
                "Résultat non confirmé. Conservez la tentative et réessayez avec le même contenu.",
                "Result not confirmed. Keep this attempt and retry with the same content.",
              ),
            ),
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  function finish(result) {
    if (!reviewReceipt(result)) throw Error("Unconfirmed review");
    if (!active.current) return;
    try {
      clearReviewAttempt(scope);
    } catch {
      /* Saved replay remains harmless and can be rechecked. */
    }
    setSaved({ attempt: null, invalid: false });
    setOpen(false);
    setCode("");
    setLine(null);
    setForm(empty);
    setNotice(
      tr(
        "Votre avis a été enregistré. Il sera publié après modération.",
        "Your review was recorded. It will be published after moderation.",
      ),
    );
    setRefresh((n) => n + 1);
  }
  async function send(value, codeValue) {
    const { data } = await apiClient.post(
      value.mode === "guest" ? "/avis/guest" : "/avis",
      value.mode === "guest"
        ? {
            ...value.body,
            accessToken: value.accessToken,
            actionKey: value.actionKey,
            challengeId: value.challengeId,
            ...(codeValue ? { code: codeValue } : {}),
          }
        : value.body,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 20000,
      },
    );
    return data;
  }
  async function submit(event) {
    event.preventDefault();
    await perform(async () => {
      let value = attempt;
      if (!value) {
        if (!consent || !line)
          throw formError(
            tr(
              "Choisissez un article et acceptez la publication de cet avis.",
              "Choose an item and agree to publication of this review.",
            ),
          );
        let content;
        try {
          content = reviewContent(form);
        } catch {
          throw formError(
            tr(
              "Choisissez une note, un pseudonyme de 2 caractères minimum et un avis de 10 caractères minimum.",
              "Choose a rating, a nickname of at least 2 characters and a review of at least 10 characters.",
            ),
          );
        }
        value = remember({
          scope,
          mode,
          orderId,
          body: {
            requestId: crypto.randomUUID(),
            ligneCommandeId: line.id,
            ...content,
          },
          ...(accessToken
            ? { accessToken, actionKey: newGuestKey(), challengeId: "" }
            : {}),
        });
      }
      if (value.mode === "guest" && !value.challengeId) {
        const { data } = await apiClient.post(
          "/avis/guest/request",
          { ...value.body, accessToken: value.accessToken },
          { timeout: 20000 },
        );
        if (data.available === false) {
          setError(
            tr(
              "L’envoi du code est indisponible. Contactez la boutique.",
              "Code delivery is unavailable. Contact the shop.",
            ),
          );
          return;
        }
        value = remember({ ...value, challengeId: data.challengeId });
        if (active.current)
          setNotice(
            tr(
              "Un code autorisant cet avis a été envoyé à l’email de la commande.",
              "A code authorizing this review was sent to the order’s email.",
            ),
          );
        return;
      }
      try {
        finish(
          await send(value, value.mode === "guest" ? code.trim() : undefined),
        );
      } catch (e) {
        if (value.mode !== "guest" || e.response?.status < 500) throw e;
        try {
          finish(await send(value));
        } catch {
          throw e;
        }
      }
    });
  }
  async function checkReceipt() {
    await perform(async () => finish(await send(attempt)));
  }
  async function resendCode() {
    await perform(async () => {
      const { data } = await apiClient.post(
        "/avis/guest/request",
        { ...attempt.body, accessToken: attempt.accessToken },
        { timeout: 20000 },
      );
      if (data.available === false)
        throw formError(
          tr(
            "L’envoi du code est indisponible.",
            "Code delivery is unavailable.",
          ),
        );
      remember({ ...attempt, challengeId: data.challengeId });
      setCode("");
      if (active.current)
        setNotice(
          tr(
            "Utilisez le code envoyé pour cet avis.",
            "Use the code sent for this review.",
          ),
        );
    });
  }
  if (resource.loading)
    return (
      <section className="e-purchase-reviews">
        <p role="status">
          {tr(
            "Chargement des avis de vos achats…",
            "Loading your purchase reviews…",
          )}
        </p>
      </section>
    );
  return (
    <section
      className="e-purchase-reviews"
      aria-labelledby="purchase-reviews-title"
    >
      <h2 id="purchase-reviews-title">
        {tr(
          "Votre expérience avec ces articles",
          "Your experience with these items",
        )}
      </h2>
      <p>
        {tr(
          "Un avis par article reçu. Votre texte et le pseudonyme choisi seront publics après modération. Évitez les coordonnées personnelles.",
          "One review per received item. Your text and chosen nickname will be public after moderation. Avoid personal contact details.",
        )}
      </p>
      {notice && <p role="status">{notice}</p>}
      {resource.error ? (
        <div role="alert">
          <p>
            {tr(
              "Vos avis ne sont pas disponibles. Actualisez avant de poursuivre.",
              "Your reviews are unavailable. Refresh before continuing.",
            )}
          </p>
          <button
            className="e-btn e-secondary"
            onClick={() => setRefresh((n) => n + 1)}
          >
            {tr("Actualiser", "Refresh")}
          </button>
        </div>
      ) : (
        <>
          {!resource.data?.eligible && (
            <p>
              {tr(
                "Vous pourrez donner votre avis après réception de la commande.",
                "You can write a review after receiving the order.",
              )}
            </p>
          )}
          {resource.data?.eligible &&
            accessToken &&
            !resource.data.codeAvailable && (
              <p className="e-review-pending">
                {tr(
                  "La vérification par email est momentanément indisponible. Aucun avis ne peut être publié avec le seul lien de suivi.",
                  "Email verification is currently unavailable. The tracking link alone cannot publish a review.",
                )}
              </p>
            )}
          {resource.data?.lignes.map((item) => (
            <div key={item.id} className="e-review-purchase">
              <div>
                <h3>{item.nomProduit}</h3>
                {item.avis && (
                  <p>
                    {item.avis.note}/5 ·{" "}
                    {item.avis.statut === "PUBLIE"
                      ? tr("Publié", "Published")
                      : item.avis.statut === "REFUSE"
                        ? tr(
                            "Non publié après modération",
                            "Not published after moderation",
                          )
                        : tr("En attente de modération", "Awaiting moderation")}
                  </p>
                )}
              </div>
              {!item.avis && resource.data.eligible && (
                <button
                  className="e-btn e-secondary"
                  disabled={
                    !!attempt ||
                    saved.invalid ||
                    (accessToken && !resource.data.codeAvailable)
                  }
                  onClick={() => begin(item)}
                >
                  {tr("Donner mon avis", "Write my review")}
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {saved.invalid && (
        <div role="alert" className="e-review-pending">
          <p>
            {tr(
              "La tentative sauvegardée est illisible. Vérifiez d’abord les avis déjà enregistrés ci-dessus.",
              "The saved attempt is unreadable. First check the reviews already recorded above.",
            )}
          </p>
          <button
            className="e-btn e-secondary"
            onClick={() => {
              try {
                clearReviewAttempt(scope);
                setSaved({ attempt: null, invalid: false });
              } catch {
                setError(
                  tr(
                    "Stockage indisponible sur cet appareil.",
                    "Storage unavailable on this device.",
                  ),
                );
              }
            }}
          >
            {tr("Effacer la tentative illisible", "Clear unreadable attempt")}
          </button>
        </div>
      )}
      {attempt && (
        <div className="e-review-pending">
          <p>
            {tr(
              "Une tentative est conservée sur cet onglet. Reprenez-la pour vérifier le résultat sans créer un deuxième avis.",
              "An attempt is saved in this tab. Resume it to check the result without creating a second review.",
            )}
          </p>
          <button className="e-btn e-secondary" onClick={resume}>
            {tr("Reprendre mon avis", "Resume my review")}
          </button>
        </div>
      )}
      {!open && error && <p role="alert">{error}</p>}
      <Modal
        open={open}
        title={tr("Votre avis sur l’article", "Your review of the item")}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <p>
          <strong>
            {line?.nomProduit ||
              tr("Article de votre commande", "Item from your order")}
          </strong>
        </p>
        <form className="e-review-form" onSubmit={submit}>
          <fieldset disabled={busy || !!attempt}>
            <legend>{tr("Votre note", "Your rating")}</legend>
            <div className="e-review-rating">
              {[1, 2, 3, 4, 5].map((note) => (
                <label key={note}>
                  <input
                    type="radio"
                    name="note"
                    required
                    checked={display.note === note}
                    onChange={() => setForm((old) => ({ ...old, note }))}
                  />
                  {note}/5
                </label>
              ))}
            </div>
          </fieldset>
          <label className="e-field">
            {tr("Pseudonyme public", "Public nickname")}
            <input
              name="pseudonyme"
              required
              minLength={2}
              maxLength={40}
              value={display.pseudonyme}
              onChange={change}
              disabled={busy || !!attempt}
              autoComplete="off"
            />
          </label>
          <label className="e-field">
            {tr("Votre avis", "Your review")}
            <textarea
              name="texte"
              required
              minLength={10}
              maxLength={2000}
              value={display.texte}
              onChange={change}
              disabled={busy || !!attempt}
            />
          </label>
          <label className="e-field">
            {tr("Projet réalisé (facultatif)", "Completed project (optional)")}
            <input
              name="projetRealise"
              maxLength={300}
              value={display.projetRealise || ""}
              onChange={change}
              disabled={busy || !!attempt}
            />
          </label>
          {!attempt && (
            <label className="e-review-consent">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                disabled={busy}
              />
              <span>
                {tr(
                  "J’accepte que cet avis et ce pseudonyme soient publiés après modération. Ma tentative sera conservée dans cet onglet pour pouvoir reprendre après une coupure.",
                  "I agree to publication of this review and nickname after moderation. My attempt will be saved in this tab so I can resume after a connection interruption.",
                )}
              </span>
            </label>
          )}
          {attempt?.challengeId && (
            <label className="e-field">
              {tr("Code reçu par email", "Code received by email")}
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{8}"
                required
                maxLength={8}
                disabled={busy}
              />
            </label>
          )}
          {attempt?.challengeId && (
            <button
              type="button"
              className="e-text-button"
              disabled={busy}
              onClick={resendCode}
            >
              {tr(
                "Redemander le code de cet avis",
                "Request the code for this review again",
              )}
            </button>
          )}
          {error && <p role="alert">{error}</p>}
          <button className="e-btn" disabled={busy || (!attempt && !consent)}>
            {busy
              ? tr("Vérification…", "Checking…")
              : accessToken && !attempt?.challengeId
                ? tr(
                    "Recevoir le code pour cet avis",
                    "Get the code for this review",
                  )
                : tr("Enregistrer mon avis", "Record my review")}
          </button>
          {attempt?.challengeId && (
            <button
              type="button"
              className="e-btn e-secondary"
              disabled={busy}
              onClick={checkReceipt}
            >
              {tr(
                "Vérifier le résultat sans nouveau code",
                "Check the result without a new code",
              )}
            </button>
          )}
        </form>
      </Modal>
    </section>
  );
}
