import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { RefreshCw, ArrowRight } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { formatFCFA } from "../utils/formatFCFA";
import { apiMessage, orderDate, orderState } from "./orderData";
import {
  captureGuestFragment,
  readGuestKey,
  rememberGuestKey,
  forgetGuestKey,
  newGuestKey,
  privateTrackingLink,
  saveGuestRecovery,
  readGuestRecovery,
  clearGuestRecovery,
} from "./guestAccess";
import Footer from "./Footer";
import GuestLink from "./GuestLink";
import GuestActions from "./GuestActions";
import PurchaseReviews from "./PurchaseReviews";
import PurchaseIncompatibilities from "./PurchaseIncompatibilities";
import { guestIssueOrder } from './incompatibilityData';
import { guestReviewOrder } from './reviewData.js';

export default function GuestTracking() {
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const location = useLocation(),
    navigate = useNavigate();
  const [key, setKey] = useState(readGuestKey),
    [data, setData] = useState(null);
  const [channels, setChannels] = useState(null),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    link: "",
    numeroSuivi: "",
    email: "",
    code: "",
  });
  const [challenge, setChallenge] = useState(
    () => readGuestRecovery()?.challengeId || "",
  );
  const lock = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const change = (event) =>
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  useEffect(() => {
    if (!location.hash) return;
    captureGuestFragment();
    setData(null);
    setError("");
    setKey(readGuestKey());
    navigate("/suivi-invite", { replace: true });
  }, [location.hash, navigate]);
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/commandes/guest/channels", { signal: controller.signal })
      .then(({ data: value }) => setChannels(value))
      .catch(() => {
        if (!controller.signal.aborted)
          setChannels({ email: false, sms: false });
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    setBusy(true);
    apiClient
      .post(
        "/commandes/guest/access",
        { accessToken: key },
        { signal: controller.signal, timeout: 20000 },
      )
      .then(({ data: value }) => {
        if (!controller.signal.aborted) {
          setData(value);
          clearGuestRecovery();
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(
            apiMessage(
              e,
              tr(
                "Suivi indisponible. Vérifiez votre connexion ou retrouvez votre accès ci-dessous.",
                "Tracking unavailable. Check your connection or recover access below.",
              ),
            ),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
    // Language changes should not issue another sensitive request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refresh]);
  async function perform(task) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(
        apiMessage(
          e,
          tr(
            "Impossible de terminer. Réessayez ou contactez la boutique.",
            "Unable to finish. Try again or contact the shop.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function openLink(event) {
    event.preventDefault();
    try {
      const url = new URL(form.link.trim());
      if (
        url.origin !== window.location.origin ||
        url.pathname !== "/suivi-invite"
      )
        throw new Error();
      const value = new URLSearchParams(url.hash.slice(1)).get("acces");
      rememberGuestKey(value);
      setKey(value);
      setRefresh((count) => count + 1);
      setData(null);
      setError("");
      setForm((old) => ({ ...old, link: "" }));
    } catch {
      setError(
        tr(
          "Collez le lien privé obtenu après votre commande.",
          "Paste the private link provided after your order.",
        ),
      );
    }
  }
  async function requestCode(event) {
    event.preventDefault();
    await perform(async () => {
      const { data: value } = await apiClient.post(
        "/commandes/guest/recovery",
        { numeroSuivi: form.numeroSuivi.trim(), email: form.email.trim() },
        { timeout: 20000 },
      );
      if (value.available === false) {
        setNotice(value.message);
        return;
      }
      clearGuestRecovery();
      setChallenge(value.challengeId);
      setNotice(value.message);
    });
  }
  async function verifyCode(event) {
    event.preventDefault();
    await perform(async () => {
      const pending = readGuestRecovery();
      const nextKey =
        pending?.challengeId === challenge ? pending.key : newGuestKey();
      // Save before POST: if its response is lost, reopening this page can read
      // the rotated key without issuing a second recovery or order.
      saveGuestRecovery(challenge, nextKey);
      let alreadyRecovered = false;
      if (pending?.challengeId === challenge) {
        try {
          await apiClient.post(
            "/commandes/guest/access",
            { accessToken: nextKey },
            { timeout: 20000 },
          );
          alreadyRecovered = true;
        } catch (e) {
          if (e.response?.status !== 401) throw e;
        }
      }
      try {
        if (!alreadyRecovered)
          await apiClient.post(
            "/commandes/guest/recover",
            {
              challengeId: challenge,
              code: form.code.trim(),
              accessToken: nextKey,
            },
            { timeout: 20000 },
          );
      } catch (e) {
        try {
          await apiClient.post(
            "/commandes/guest/access",
            { accessToken: nextKey },
            { timeout: 20000 },
          );
        } catch (readError) {
          if (
            e.response &&
            e.response.status < 500 &&
            readError.response?.status === 401
          )
            clearGuestRecovery();
          throw e;
        }
      }
      clearGuestRecovery();
      setData(null);
      setKey(nextKey);
      setChallenge("");
      setForm({ link: "", numeroSuivi: "", email: "", code: "" });
    });
  }
  const order = data?.commande,
    state = order && orderState(order.statut, lang);
  let retainedReviewOrder, retainedIssueOrder;
  try {
    if (key && !order) retainedReviewOrder = guestReviewOrder(key);
    if (key && !order) retainedIssueOrder = guestIssueOrder(key);
  } catch {
    /* Explicit storage errors are shown by the review form when accessible. */
  }
  return (
    <>
      <Helmet>
        <title>
          {tr("Suivi privé de commande", "Private order tracking")} ·
          X-Electronic
        </title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <div className="e-wrap e-guest-tracking">
        <div className="e-page-lead">
          <span className="e-eyebrow">
            {tr("Sans compte client", "Without an account")}
          </span>
          <h1>{tr("Votre suivi privé", "Your private tracking")}</h1>
          <p>
            {tr(
              "Consultez l’avancement de votre commande grâce à votre lien personnel.",
              "Use your personal link to check your order’s progress.",
            )}
          </p>
        </div>
        {busy && <p role="status">{tr("Vérification…", "Checking…")}</p>}
        {error && (
          <p className="e-form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="e-note" role="status">
            {notice}
          </p>
        )}
        {order ? (
          <div className="e-confirmation-layout">
            <section>
              <div className="e-order-id">
                <small>{orderDate(order.dateCommande, lang)}</small>
                <h2>{order.numeroSuivi}</h2>
                <span
                  className={`e-order-status e-order-status--${state.tone}`}
                >
                  {state.label}
                </span>
              </div>
              <p className="e-note e-gold-note">
                {tr(
                  "L’enregistrement ne vaut ni validation ni paiement. La boutique confirme la disponibilité et les modalités de réception.",
                  "Recording is neither confirmation nor payment. The shop confirms availability and delivery arrangements.",
                )}
              </p>
              <h2>{tr("Articles de votre commande", "Your ordered items")}</h2>
              {order.lignes.map((line) => (
                <div className="e-review-line" key={line.id}>
                  <div>
                    <strong>{line.nomProduit}</strong>
                    <small>
                      {line.quantite} × {formatFCFA(Number(line.prixUnitaire))}
                    </small>
                  </div>
                  <strong>{formatFCFA(Number(line.sousTotal))}</strong>
                </div>
              ))}
              <div className="e-review-line">
                <strong>{tr("Montant des articles", "Items subtotal")}</strong>
                <strong>{formatFCFA(Number(order.montantTotal))}</strong>
              </div>
              <p>
                {order.statut === "ANNULEE"
                  ? tr(
                      "Commande annulée · Aucun retrait ni livraison prévu.",
                      "Order cancelled · No pickup or delivery planned.",
                    )
                  : order.statut === "LIVREE"
                    ? order.modeReception === "RETRAIT_MAGASIN"
                      ? tr(
                          "Retrait en boutique effectué.",
                          "In-store pickup completed.",
                        )
                      : tr(
                          "Réception de la livraison confirmée.",
                          "Delivery receipt confirmed.",
                        )
                    : order.modeReception === "RETRAIT_MAGASIN"
                      ? tr(
                          "Retrait à Akwa · Attendez l’avis de disponibilité.",
                          "Collect at Akwa · Wait for availability confirmation.",
                        )
                      : tr(
                          "Livraison · Frais et délai à confirmer.",
                          "Delivery · Fees and timing to confirm.",
                        )}
              </p>
              <Link to="/contact">
                {tr(
                  "Contacter la boutique pour cette commande",
                  "Contact the shop about this order",
                )}
              </Link>
              <PurchaseReviews
                key={`${order.id}:${key}:${order.statut}`}
                orderId={order.id}
                accessToken={key}
              />
              <PurchaseIncompatibilities key={`issues:${order.id}:${key}`} orderId={order.id} accessToken={key} />
            </section>
            <aside className="e-next-steps">
              <h2>{tr("Conserver votre accès", "Keep your access")}</h2>
              <p>
                {tr(
                  "Ce lien donne accès aux articles et au suivi. Gardez-le privé. Il ne permet ni paiement, ni annulation, ni accès à un compte.",
                  "This link reveals items and tracking. Keep it private. It cannot pay, cancel or access an account.",
                )}
              </p>
              <label className="e-field">
                {tr("Lien privé", "Private link")}
                <input
                  readOnly
                  value={privateTrackingLink(key)}
                  onFocus={(event) => event.target.select()}
                />
              </label>
              <small>
                {tr("Valable jusqu’au ", "Valid until ")}
                {orderDate(data.access.expiresAt, lang)}
              </small>
              <div className="e-actions">
                <button
                  className="e-btn e-btn-outline"
                  disabled={busy}
                  onClick={() => {
                    setRefresh((value) => value + 1);
                  }}
                >
                  <RefreshCw size={16} />
                  {tr("Actualiser", "Refresh")}
                </button>
                <button
                  className="e-text-button"
                  disabled={busy}
                  onClick={() => {
                    forgetGuestKey();
                    setKey("");
                    setData(null);
                  }}
                >
                  {tr(
                    "Fermer mon accès sur cet appareil",
                    "Close access on this device",
                  )}
                </button>
              </div>
            </aside>
          </div>
        ) : (
          !busy && (
            <div className="e-confirmation-layout">
              <form className="e-form" onSubmit={openLink}>
                <h2>{tr("J’ai mon lien privé", "I have my private link")}</h2>
                <label className="e-field">
                  {tr("Votre lien de suivi", "Your tracking link")}
                  <input
                    required
                    name="link"
                    value={form.link}
                    onChange={change}
                    autoComplete="off"
                    type="url"
                  />
                </label>
                <button className="e-btn">
                  {tr("Ouvrir mon suivi", "Open tracking")}
                  <ArrowRight size={18} />
                </button>
              </form>
              <form
                className="e-form"
                onSubmit={challenge ? verifyCode : requestCode}
              >
                <h2>
                  {tr(
                    "Retrouver mon accès par email",
                    "Recover access by email",
                  )}
                </h2>
                <p>
                  {tr(
                    "Utilisez l’adresse renseignée lors de votre commande. Aucun compte client n’est nécessaire.",
                    "Use the email recorded at checkout. No customer account is needed.",
                  )}
                </p>
                {channels?.email ? (
                  challenge ? (
                    <label className="e-field">
                      {tr("Code reçu par email", "Code received by email")}
                      <input
                        name="code"
                        value={form.code}
                        onChange={change}
                        required
                        pattern="[0-9]{8}"
                        maxLength={8}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                    </label>
                  ) : (
                    <>
                      <label className="e-field">
                        {tr("Numéro de commande", "Order number")}
                        <input
                          name="numeroSuivi"
                          value={form.numeroSuivi}
                          onChange={change}
                          required
                          maxLength={30}
                        />
                      </label>
                      <label className="e-field">
                        Email
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={change}
                          required
                          maxLength={254}
                          autoComplete="email"
                        />
                      </label>
                    </>
                  )
                ) : (
                  <p className="e-note">
                    {channels
                      ? tr(
                          "L’envoi des emails de récupération n’est pas encore disponible. La boutique peut vous aider à retrouver votre commande.",
                          "Recovery emails are not available yet. The shop can help find your order.",
                        )
                      : tr(
                          "Vérification du service email…",
                          "Checking email availability…",
                        )}
                  </p>
                )}
                {channels?.email && (
                  <button className="e-btn" disabled={busy}>
                    {challenge
                      ? tr("Vérifier le code", "Verify code")
                      : tr("Recevoir un code par email", "Get a code by email")}
                  </button>
                )}
                {challenge && (
                  <button
                    type="button"
                    className="e-text-button"
                    onClick={() => {
                      setChallenge("");
                      setNotice("");
                    }}
                  >
                    {tr("Recommencer la récupération", "Restart recovery")}
                  </button>
                )}
                <Link to="/contact">
                  {tr(
                    "Demander l’aide de la boutique",
                    "Ask the shop for help",
                  )}
                </Link>
              </form>
            </div>
          )
        )}
      </div>
      {key && (
        <div className="e-wrap">
          <GuestActions
            key={`actions-${key}`}
            accessToken={key}
            order={order}
            availability={data?.actions}
            onDone={(result) => {
              setNotice(
                result.action === "CANCEL"
                  ? tr(
                      "Votre commande a été annulée. Aucun remboursement automatique n’a été effectué.",
                      "Your order has been cancelled. No automatic refund was issued.",
                    )
                  : tr(
                      "La réception a été confirmée. Merci !",
                      "Receipt has been confirmed. Thank you!",
                    ),
              );
              setRefresh((value) => value + 1);
            }}
          />
          <GuestLink
            key={key}
            accessToken={key}
            available={!!data?.linking?.available}
            hasOrder={!!order}
          />
        </div>
      )}
      {!order && retainedReviewOrder && (
        <div className="e-wrap">
          <PurchaseReviews
            key={`${retainedReviewOrder}:${key}`}
            orderId={retainedReviewOrder}
            accessToken={key}
          />
        </div>
      )}
      {!order && retainedIssueOrder && <div className="e-wrap"><PurchaseIncompatibilities key={`issues:${retainedIssueOrder}:${key}`} orderId={retainedIssueOrder} accessToken={key} /></div>}
      <Footer />
    </>
  );
}
