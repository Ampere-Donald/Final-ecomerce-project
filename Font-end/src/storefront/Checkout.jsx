import { createElement, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Truck, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { formatFCFA } from "../utils/formatFCFA";
import { Copy, Crumbs } from "./Elements";
import { apiMessage, validQuote } from "./orderData";
import Confirmation from "./Confirmation";
import {
  readAttempt,
  saveAttempt,
  forgetAttempt,
  sameCart,
  newRequestId,
} from "./orderAttempt";
import Cart from "./Cart";
import Footer from "./Footer";

export default function Checkout() {
  const { loading } = useAuth();
  return loading ? (
    <div className="e-state" role="status">
      <Copy fr="Chargement de votre session…" en="Loading your session…" />
    </div>
  ) : (
    <CheckoutForm />
  );
}
function CheckoutForm() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, token, isAuthenticated, loginFromToken } = useAuth();
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [form, setForm] = useState({
    nom: user?.nom || "",
    telephone: user?.telephone || "",
    mode: "RETRAIT_MAGASIN",
    ville: "",
    adresse: "",
    email: "",
    password: "",
    createAccount: false,
  });
  const [quote, setQuote] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(readAttempt);
  const [uncertain, setUncertain] = useState(Boolean(pending));
  const [success, setSuccess] = useState(null);
  const lock = useRef(false);
  const heading = useRef();
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const delivery = form.mode === "LIVRAISON";
  const quoteMatches = quote && validQuote(quote, cartItems);
  const reviewing = Boolean(quoteMatches);
  const priceChanged =
    reviewing &&
    quote.lignes.some(
      (line) =>
        cartItems.find((i) => i.id === line.produitId)?.retailPrice !==
        line.prixUnitaire,
    );
  const focusTitle = () =>
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  async function review(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post(
        "/commandes/quote",
        {
          lignes: cartItems.map((i) => ({
            produitId: i.id,
            quantite: i.quantity,
          })),
        },
        { timeout: 20000 },
      );
      if (!validQuote(data, cartItems) || data.requestProtocol !== 1)
        throw new Error("Invalid quote or unsupported order recovery");
      setQuote(data);
      setAccepted(false);
      focusTitle();
    } catch (e) {
      setError(
        apiMessage(
          e,
          tr(
            "Impossible de vérifier votre sélection. Votre panier est conservé.",
            "Unable to check your selection. Your cart has been kept.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function sendAttempt(attempt) {
    if (lock.current || attempt?.invalid) return;
    if (attempt.userId && (!isAuthenticated || user?.id !== attempt.userId)) {
      setError(
        tr(
          "Reconnectez-vous au compte utilisé pour cette commande.",
          "Sign in to the account used for this order.",
        ),
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = { ...attempt.payload };
      if (attempt.path === "/commandes/checkout" && attempt.payload.email)
        payload.motDePasse = form.password;
      const { data } = await apiClient.post(attempt.path, payload, {
        headers:
          attempt.userId && token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 30000,
      });
      const order = data.commande || data;
      if (!order.id || !order.numeroSuivi) throw new Error("Uncertain order");
      if (data.access_token && data.user)
        loginFromToken(data.access_token, data.user);
      forgetAttempt();
      setPending(null);
      setUncertain(false);
      setSuccess({
        order,
        canTrack: Boolean(isAuthenticated || (data.access_token && data.user)),
      });
      // A customer may have edited the cart while checking a lost response.
      if (sameCart(cartItems, payload.lignes)) clearCart();
      setForm((previous) => ({ ...previous, password: "" }));
      window.scrollTo(0, 0);
    } catch (e) {
      const data = e.response?.data;
      const mustKeep =
        // A validation error on a retry does not undo an earlier committed order.
        (uncertain &&
          !["PRICE_CHANGED", "STOCK_CHANGED", "PRICE_UNAVAILABLE"].includes(
            data?.code,
          )) ||
        !e.response ||
        e.response.status >= 500 ||
        [401, 403].includes(e.response.status) ||
        ["REQUEST_CONFLICT", "ORDER_REMOVED", "REQUEST_AUTH_CHANGED"].includes(
          data?.code,
        );
      if (mustKeep) {
        setUncertain(true);
        setError(
          apiMessage(
            e,
            tr(
              "La réponse n’est pas arrivée. Reprenez cette tentative pour retrouver votre commande sans la créer en double.",
              "The response did not arrive. Resume this attempt to recover your order without creating a duplicate.",
            ),
          ),
        );
      } else {
        forgetAttempt();
        setPending(null);
        setUncertain(false);
        if (
          data?.code === "PRICE_CHANGED" &&
          validQuote(data.quote, cartItems)
        ) {
          setQuote(data.quote);
          setAccepted(false);
        }
        setError(
          apiMessage(
            e,
            tr(
              "L’enregistrement a échoué. Votre panier est conservé.",
              "Your order could not be recorded. Your cart has been kept.",
            ),
          ),
        );
      }
      focusTitle();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current || !accepted || !reviewing || uncertain) return;
    const payload = {
      requestId: newRequestId(),
      nomClient: form.nom.trim(),
      telephone: form.telephone.trim(),
      modeReception: form.mode,
      adresseLivraison: delivery
        ? `${form.ville.trim()} — ${form.adresse.trim()}`
        : "Retrait en boutique — Akwa, Douala",
      montantTotal: quote.montantArticles,
      lignes: quote.lignes.map(
        ({ produitId, nomProduit, quantite, prixUnitaire }) => ({
          produitId,
          nomProduit,
          quantite,
          prixUnitaire,
        }),
      ),
      ...(!isAuthenticated && form.createAccount
        ? { email: form.email.trim() }
        : {}),
    };
    let attempt;
    try {
      attempt = saveAttempt(
        payload,
        isAuthenticated ? "/commandes" : "/commandes/checkout",
        isAuthenticated ? user.id : null,
      );
      setPending(attempt);
    } catch {
      setError(
        tr(
          "Le navigateur ne peut pas conserver votre tentative. Autorisez le stockage de session avant de commander.",
          "Your browser cannot save this attempt. Allow session storage before ordering.",
        ),
      );
      return;
    }
    await sendAttempt(attempt);
  }
  if (success)
    return (
      <Confirmation
        number={success.order.numeroSuivi}
        orderId={success.order.id}
        canTrack={success.canTrack}
      />
    );
  if (uncertain && pending)
    return (
      <>
        <div className="e-wrap e-checkout-page">
          <h1 ref={heading} tabIndex={-1}>
            {tr("Reprendre votre commande", "Resume your order")}
          </h1>
          <p>
            {tr(
              "Une tentative est en attente de confirmation. Nous conservons votre sélection initiale pour éviter une commande en double.",
              "An attempt is awaiting confirmation. We keep your original selection to avoid a duplicate order.",
            )}
          </p>
          {error && (
            <p className="e-form-error" role="alert">
              {error}
            </p>
          )}
          {pending.invalid ? (
            <p>
              {tr(
                "La tentative enregistrée est illisible. Consultez votre suivi ou contactez la boutique.",
                "The saved attempt cannot be read. Check your orders or contact the shop.",
              )}
            </p>
          ) : (
            <form
              className="e-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendAttempt(pending);
              }}
            >
              <p>
                <strong>{formatFCFA(pending.payload.montantTotal)}</strong> ·{" "}
                {pending.payload.lignes.length} {tr("référence(s)", "item(s)")}
              </p>
              {pending.path === "/commandes/checkout" && (
                <label className="e-field">
                  {tr(
                    "Mot de passe choisi pour cette commande",
                    "Password chosen for this order",
                  )}
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <small>
                    {tr(
                      "Votre mot de passe n’est pas enregistré dans cette tentative.",
                      "Your password is not stored in this attempt.",
                    )}
                  </small>
                </label>
              )}
              <button className="e-btn" disabled={busy}>
                {busy
                  ? tr("Vérification…", "Checking…")
                  : tr("Reprendre cette tentative", "Resume this attempt")}
              </button>
            </form>
          )}
          <div className="e-actions">
            <Link to="/login?returnTo=%2Fcheckout">
              {tr("Me connecter", "Sign in")}
            </Link>
            <Link to="/commandes">
              {tr("Consulter mes commandes", "View my orders")}
            </Link>
            <Link to="/contact">
              {tr("Contacter la boutique", "Contact the shop")}
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  if (!cartItems.length) return <Cart />;
  const input = (name, label, options = {}) => (
    <label className="e-field">
      {label}
      <input
        name={name}
        value={form[name]}
        onChange={change}
        required
        {...options}
      />
    </label>
  );
  return (
    <>
      <div className="e-wrap e-checkout-page">
        <Crumbs title={tr("Votre commande", "Your order")} />
        <nav
          className="e-checkout-steps"
          aria-label={tr("Étapes de commande", "Order steps")}
        >
          <Link to="/panier">
            1 <span>{tr("Panier", "Cart")}</span>
          </Link>
          <span aria-current={!reviewing ? "step" : undefined}>
            2 <span>{tr("Réception", "Delivery")}</span>
          </span>
          <span aria-current={reviewing ? "step" : undefined}>
            3 <span>{tr("Vérification", "Review")}</span>
          </span>
        </nav>
        <div className="e-page-lead">
          <h1 ref={heading} tabIndex={-1}>
            {reviewing
              ? tr("Une dernière vérification", "One final check")
              : tr(
                  "Comment recevoir votre commande ?",
                  "How would you like to receive your order?",
                )}
          </h1>
          <p>
            {reviewing
              ? tr(
                  "Relisez les références, les quantités et vos coordonnées.",
                  "Check the products, quantities and your contact details.",
                )
              : tr(
                  "Vos articles, à retirer en boutique ou à faire livrer.",
                  "Collect your items at the shop or request delivery.",
                )}
          </p>
        </div>
        {error && (
          <div className="e-form-error" role="alert">
            {error}
            <div className="e-actions">
              <Link to="/panier">{tr("Revoir mon panier", "Review cart")}</Link>
              <Link
                to={uncertain ? "/commandes" : "/login?returnTo=%2Fcheckout"}
              >
                {uncertain
                  ? tr("Consulter mes commandes", "View my orders")
                  : tr("Me connecter", "Sign in")}
              </Link>
              {uncertain && (
                <Link to="/contact">
                  {tr("Contacter la boutique", "Contact the shop")}
                </Link>
              )}
            </div>
          </div>
        )}
        <div className="e-checkout-layout">
          <section>
            {!reviewing ? (
              <form className="e-form" onSubmit={review}>
                <fieldset disabled={busy || uncertain}>
                  <legend>{tr("Mode de réception", "Delivery method")}</legend>
                  <div className="e-reception-options">
                    {[
                      [
                        "RETRAIT_MAGASIN",
                        Store,
                        tr("Retrait à Akwa", "Collect at Akwa"),
                        tr(
                          "Camp Yabassi, Douala. Attendez l’avis de disponibilité.",
                          "Camp Yabassi, Douala. Wait for confirmation before collecting.",
                        ),
                      ],
                      [
                        "LIVRAISON",
                        Truck,
                        tr("Livraison", "Delivery"),
                        tr(
                          "Adresse et frais à confirmer avec la boutique.",
                          "Address and delivery fees to be confirmed with the shop.",
                        ),
                      ],
                    ].map(([value, Icon, title, description]) => (
                      <label className="e-reception-option" key={value}>
                        <input
                          type="radio"
                          name="mode"
                          value={value}
                          checked={form.mode === value}
                          onChange={change}
                        />
                        {createElement(Icon, { size: 24 })}
                        <strong>{title}</strong>
                        <span>{description}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset disabled={busy || uncertain}>
                  <legend>{tr("Vos coordonnées", "Contact details")}</legend>
                  <div className="e-field-grid">
                    {input("nom", tr("Nom complet", "Full name"), {
                      minLength: 2,
                      autoComplete: "name",
                    })}
                    {input("telephone", tr("Téléphone", "Phone"), {
                      type: "tel",
                      minLength: 6,
                      autoComplete: "tel",
                    })}
                  </div>
                  {delivery && (
                    <>
                      {input("ville", tr("Ville", "City"), {
                        autoComplete: "address-level2",
                      })}
                      {input(
                        "adresse",
                        tr(
                          "Quartier, adresse et repère",
                          "Street address and landmark",
                        ),
                        { autoComplete: "street-address" },
                      )}
                      <p className="e-field-help">
                        {tr(
                          "La boutique vous confirmera la zone desservie, les frais et le délai.",
                          "The shop will confirm coverage, delivery fees and timing.",
                        )}
                      </p>
                    </>
                  )}
                </fieldset>
                {!isAuthenticated && (
                  <fieldset disabled={busy || uncertain}>
                    <legend>{tr("Compte client (facultatif)", "Customer account (optional)")}</legend>
                    <p>
                      {tr("Déjà client ?", "Already a customer?")}{" "}
                      <Link to="/login?returnTo=%2Fcheckout">
                        {tr("Se connecter", "Sign in")}
                      </Link>
                    </p>
                    <label className="e-check">
                      <input
                        type="checkbox"
                        checked={form.createAccount}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            createAccount: event.target.checked,
                          })
                        }
                      />
                      <span>
                        {tr(
                          "Je souhaite créer un compte pour mes prochaines commandes.",
                          "I would like to create an account for future orders.",
                        )}
                      </span>
                    </label>
                    {form.createAccount ? (
                      <>
                        {input("email", tr("Adresse e-mail", "Email address"), {
                          type: "email",
                          autoComplete: "email",
                        })}
                        {input(
                          "password",
                          tr("Créer un mot de passe", "Create a password"),
                          {
                            type: "password",
                            minLength: 8,
                            pattern: "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}",
                            autoComplete: "new-password",
                            "aria-describedby": "password-help",
                          },
                        )}
                        <p className="e-field-help" id="password-help">
                          {tr(
                            "8 caractères minimum, une majuscule, une minuscule et un chiffre. Le compte sera créé avec la commande.",
                            "At least 8 characters with uppercase, lowercase and a number. Your account will be created with the order.",
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="e-field-help">
                        {tr(
                          "Vous pouvez continuer comme invité, sans e-mail ni mot de passe.",
                          "You can continue as a guest, without an email or password.",
                        )}
                      </p>
                    )}
                  </fieldset>
                )}
                <button className="e-btn" disabled={busy || uncertain}>
                  {busy
                    ? tr("Vérification…", "Checking…")
                    : tr("Vérifier ma sélection", "Review my selection")}
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form onSubmit={submit} className="e-form e-review">
                {priceChanged && (
                  <p className="e-note e-gold-note" role="status">
                    {tr(
                      "Un tarif a été actualisé depuis l’ajout au panier. Les prix ci-dessous sont ceux du catalogue au moment de la vérification.",
                      "A price has changed since you added items. The prices below reflect the catalogue at the time of review.",
                    )}
                  </p>
                )}
                <h2>{tr("Votre sélection", "Your selection")}</h2>
                {quote.lignes.map((line) => (
                  <div className="e-review-line" key={line.produitId}>
                    <div>
                      <Link to={`/product/${line.produitId}`}>
                        {line.nomProduit}
                      </Link>
                      <small>
                        {line.quantite} × {formatFCFA(line.prixUnitaire)}
                      </small>
                    </div>
                    <strong>
                      {formatFCFA(line.quantite * line.prixUnitaire)}
                    </strong>
                  </div>
                ))}
                <div className="e-review-contact">
                  <div>
                    <h2>
                      {delivery
                        ? tr("Livraison", "Delivery")
                        : tr("Retrait en boutique", "Shop pickup")}
                    </h2>
                    <p>
                      {form.nom}
                      <br />
                      {form.telephone}
                      <br />
                      {delivery
                        ? `${form.ville} — ${form.adresse}`
                        : "Akwa, Douala"}
                    </p>
                  </div>
                  <button
                    className="e-text-button"
                    type="button"
                    disabled={busy || uncertain}
                    onClick={() => {
                      setQuote(null);
                      setAccepted(false);
                      setError("");
                      focusTitle();
                    }}
                  >
                    {tr("Modifier", "Edit")}
                  </button>
                </div>
                <label className="e-check e-review-accept">
                  <input
                    type="checkbox"
                    checked={accepted}
                    disabled={busy || uncertain}
                    onChange={(e) => setAccepted(e.target.checked)}
                    required
                  />
                  <span>
                    {tr(
                      "J’ai vérifié mes articles et le montant. Je comprends que les modalités de réception et les frais éventuels restent à confirmer.",
                      "I have checked my items and the amount. Delivery arrangements and any additional fees still need confirmation.",
                    )}
                  </span>
                </label>
                <p className="e-field-help">
                  {tr(
                    "En enregistrant cette commande, vous acceptez les",
                    "By recording this order, you accept the",
                  )}{" "}
                  <Link to="/terms">
                    {tr("conditions d’utilisation", "terms of use")}
                  </Link>
                  .{" "}
                  {tr(
                    "Aucun paiement en ligne à cette étape.",
                    "No online payment at this stage.",
                  )}
                </p>
                <button
                  className="e-btn"
                  disabled={!accepted || busy || uncertain}
                >
                  {busy
                    ? tr("Enregistrement…", "Recording…")
                    : tr("Enregistrer ma commande", "Record my order")}
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </section>
          <aside className="e-summary">
            <span className="e-eyebrow">
              {tr("Votre sélection", "Your selection")}
            </span>
            <h2>
              {cartItems.reduce((n, i) => n + i.quantity, 0)}{" "}
              {tr("article(s)", "item(s)")}
            </h2>
            <div>
              <span>{tr("Montant des articles", "Items subtotal")}</span>
              <strong>
                {formatFCFA(reviewing ? quote.montantArticles : cartTotal)}
              </strong>
            </div>
            <div>
              <span>
                {delivery
                  ? tr("Frais de livraison", "Delivery fees")
                  : tr("Réception", "Collection")}
              </span>
              <span>
                {delivery
                  ? tr("À confirmer", "To confirm")
                  : tr("En boutique", "At the shop")}
              </span>
            </div>
            <p>
              {tr(
                "La boutique vous accompagne pour finaliser votre commande. L’enregistrement ne constitue pas un paiement.",
                "The shop will help you complete your order. Recording an order is not a payment.",
              )}
            </p>
            <Link to="/panier">
              {tr("Modifier mon panier", "Edit my cart")}
            </Link>
          </aside>
        </div>
      </div>
      <Footer />
    </>
  );
}
