import { createElement, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Package,
  Heart,
  Headphones,
  RefreshCw,
  LogOut,
  Check,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { formatFCFA } from "../utils/formatFCFA";
import { Crumbs, Modal } from "./Elements";
import { apiMessage, orderState, orderDate } from "./orderData";
import useOrders from "./useOrders";
import Footer from "./Footer";
import Reorder from "./Reorder";

export default function Account() {
  const { user, token, logout } = useAuth();
  const { lang } = useI18n();
  const { pathname } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const orders = useOrders();
  const [filter, setFilter] = useState("all");
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reorderOrder, setReorderOrder] = useState(null);
  const lock = useRef(false);
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const profile = pathname === "/profile";
  const order = orders.data?.find((o) => o.id === id);
  const title = profile
    ? tr("Mon compte", "My account")
    : id
      ? tr("Suivi de commande", "Order tracking")
      : tr("Mes commandes", "My orders");
  const status = (o) => {
    const state = orderState(o.statut, lang);
    return (
      <span className={`e-order-status e-order-status--${state.tone}`}>
        {state.label}
      </span>
    );
  };
  const total = (o) =>
    Number.isFinite(Number(o.montantTotal))
      ? formatFCFA(Number(o.montantTotal))
      : tr("À confirmer", "To confirm");
  const tile = (o) => (
    <article className="e-order-row" key={o.id}>
      <div>
        <small>{orderDate(o.dateCommande, lang)}</small>
        <h2>
          <Link to={`/commandes/${o.id}`}>{o.numeroSuivi || o.id}</Link>
        </h2>
        {status(o)}
        <p>
          {o.modeReception === "RETRAIT_MAGASIN"
            ? tr("Retrait en boutique · Akwa", "Shop pickup · Akwa")
            : tr("Livraison", "Delivery")}
        </p>
      </div>
      <div className="e-order-row-end">
        <strong>{total(o)}</strong>
        <small>
          {o.lignes.reduce((n, l) => n + Number(l.quantite || 0), 0)}{" "}
          {tr("article(s)", "item(s)")}
        </small>
        <Link to={`/commandes/${o.id}`}>
          {tr("Voir le suivi", "Track order")} <ArrowRight size={16} />
        </Link>
        {o.lignes.length > 0 && (
          <button
            className="e-text-button"
            disabled={busy}
            onClick={() => setReorderOrder(o)}
          >
            {tr("Acheter à nouveau", "Buy again")}
          </button>
        )}
      </div>
    </article>
  );
  async function confirmAction() {
    if (lock.current || !order || !action) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiClient.patch(
        `/commandes/${order.id}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 },
      );
      setNotice(
        action === "cancel"
          ? tr(
              "Votre commande a été annulée.",
              "Your order has been cancelled.",
            )
          : tr(
              "La réception a été confirmée. Merci !",
              "Receipt has been confirmed. Thank you!",
            ),
      );
      setAction(null);
      orders.refresh();
    } catch (e) {
      setError(
        apiMessage(
          e,
          tr(
            "Impossible de confirmer le résultat. Actualisez le suivi avant de réessayer.",
            "Unable to confirm the result. Refresh order tracking before trying again.",
          ),
        ),
      );
      setAction(null);
      orders.refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="e-wrap e-account-page">
        <Crumbs title={title} />
        <div className="e-page-lead e-account-lead">
          <div>
            <h1>{title}</h1>
            <p>
              {tr(
                "Vos références, vos commandes, votre boutique.",
                "Your products, your orders, your shop.",
              )}
            </p>
          </div>
          {!profile && (
            <button
              className="e-btn e-secondary"
              onClick={orders.refresh}
              disabled={orders.loading || busy}
            >
              <RefreshCw size={16} />
              {tr("Actualiser", "Refresh")}
            </button>
          )}
        </div>
        <nav
          className="e-account-nav"
          aria-label={tr("Espace client", "Customer account")}
        >
          <Link to="/profile" aria-current={profile ? "page" : undefined}>
            {tr("Mon compte", "My account")}
          </Link>
          <Link to="/commandes" aria-current={!profile ? "page" : undefined}>
            {tr("Commandes", "Orders")}
          </Link>
          <Link to="/favourites">{tr("Favoris", "Favourites")}</Link>
          <Link to="/mes-devis">{tr("Devis", "Quotes")}</Link>
        </nav>
        {profile && (
          <>
            <section className="e-account-identity">
              <div className="e-avatar">
                {(user?.nom || "C")
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <h2>{user?.nom}</h2>
                <p>
                  {user?.email}
                  <br />
                  {user?.telephone}
                </p>
              </div>
              <button
                className="e-text-button"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut size={16} />
                {tr("Se déconnecter", "Sign out")}
              </button>
            </section>
            <div className="e-account-shortcuts">
              {[
                [
                  FileText,
                  "/mes-devis",
                  tr("Mes demandes de devis", "My quote requests"),
                  tr("Mes listes et propositions", "My lists and offers"),
                ],
                [
                  Package,
                  "/commandes",
                  tr("Mes commandes", "My orders"),
                  tr(
                    "Consulter le suivi et les détails",
                    "View tracking and details",
                  ),
                ],
                [
                  Heart,
                  "/favourites",
                  tr("Mes favoris", "My favourites"),
                  tr("Retrouver mes références", "Find my saved products"),
                ],
                [
                  Headphones,
                  "/contact",
                  tr("La boutique à vos côtés", "Ask the shop"),
                  tr("Conseils et assistance", "Advice and assistance"),
                ],
              ].map(([Icon, url, label, detail]) => (
                <Link key={url} to={url}>
                  {createElement(Icon, { size: 24 })}
                  <strong>{label}</strong>
                  <span>{detail}</span>
                  <ArrowRight size={18} />
                </Link>
              ))}
            </div>
            <div className="e-section-head">
              <h2>{tr("Ma dernière commande", "My latest order")}</h2>
              <Link to="/commandes">{tr("Tout voir", "View all")}</Link>
            </div>
          </>
        )}
        {error && (
          <div role="alert" className="e-form-error">
            {error}
          </div>
        )}
        {notice && (
          <p role="status" className="e-note">
            {notice}
          </p>
        )}
        {orders.loading ? (
          <div className="e-state" role="status">
            {tr("Chargement de vos commandes…", "Loading your orders…")}
          </div>
        ) : orders.error ? (
          <div className="e-state" role="alert">
            <h2>
              {tr(
                "Votre historique est indisponible",
                "Your order history is unavailable",
              )}
            </h2>
            <p>
              {tr(
                "Une erreur de connexion ne signifie pas que vos commandes ont disparu.",
                "A connection error does not mean your orders have disappeared.",
              )}
            </p>
            {orders.error.response?.status === 401 ? (
              <Link
                className="e-btn"
                to={`/login?returnTo=${encodeURIComponent(pathname)}`}
              >
                {tr("Se reconnecter", "Sign in again")}
              </Link>
            ) : (
              <button className="e-btn" onClick={orders.refresh}>
                {tr("Réessayer", "Try again")}
              </button>
            )}
          </div>
        ) : id ? (
          !order ? (
            <div className="e-state">
              <h2>
                {tr(
                  "Commande introuvable dans votre compte",
                  "Order not found in your account",
                )}
              </h2>
              <Link to="/commandes">{tr("Mes commandes", "My orders")}</Link>
            </div>
          ) : (
            <div className="e-order-detail">
              <section>
                <div className="e-order-overview">
                  <small>{tr("Commande", "Order")}</small>
                  <h2>{order.numeroSuivi || order.id}</h2>
                  {status(order)}
                  <p>
                    {tr("Enregistrée le", "Recorded on")}{" "}
                    {orderDate(order.dateCommande, lang)}
                  </p>
                </div>
                <h2>{tr("Les étapes de votre commande", "Order progress")}</h2>
                <ol className="e-order-timeline">
                  <li className="is-done">
                    <Check size={16} />
                    <div>
                      <strong>
                        {tr("Commande enregistrée", "Order recorded")}
                      </strong>
                      <p>{orderDate(order.dateCommande, lang)}</p>
                    </div>
                  </li>
                  {order.statut === "ANNULEE" ? (
                    <li>
                      <span className="e-timeline-dot" />
                      <div>
                        <strong>
                          {tr("Commande annulée", "Order cancelled")}
                        </strong>
                        <p>{orderDate(order.dateAnnulation, lang)}</p>
                      </div>
                    </li>
                  ) : (
                    <>
                      {[
                        [
                          "CONFIRMEE",
                          tr("Validation par la boutique", "Shop confirmation"),
                          order.dateConfirmation,
                        ],
                        [
                          "EN_LIVRAISON",
                          tr("Livraison en cours", "Delivery in progress"),
                          null,
                        ],
                        [
                          "LIVREE",
                          tr("Réception terminée", "Received"),
                          order.dateLivraison,
                        ],
                      ]
                        .filter(
                          ([state]) =>
                            !(
                              order.modeReception === "RETRAIT_MAGASIN" &&
                              state === "EN_LIVRAISON"
                            ),
                        )
                        .map(([state, label, date]) => {
                          const sequence = [
                            "EN_ATTENTE",
                            "CONFIRMEE",
                            "EN_LIVRAISON",
                            "LIVREE",
                          ];
                          const done =
                            sequence.indexOf(order.statut) >=
                            sequence.indexOf(state);
                          return (
                            <li key={state} className={done ? "is-done" : ""}>
                              {done ? (
                                <Check size={16} />
                              ) : (
                                <span className="e-timeline-dot" />
                              )}
                              <div>
                                <strong>{label}</strong>
                                <p>
                                  {date
                                    ? orderDate(date, lang)
                                    : done
                                      ? tr("Étape atteinte", "Stage reached")
                                      : tr("En attente", "Pending")}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                    </>
                  )}
                </ol>
                <div className="e-note e-gold-note">
                  {tr(
                    "Ce suivi indique l’état de la commande. Il ne constitue pas une preuve de paiement.",
                    "This tracks order status and is not proof of payment.",
                  )}
                  {order.modeReception === "RETRAIT_MAGASIN" &&
                    ["EN_ATTENTE", "CONFIRMEE"].includes(order.statut) &&
                    tr(
                      " Pour un retrait, attendez l’avis de disponibilité de la boutique.",
                      " Wait for confirmation before collecting your order.",
                    )}
                </div>
                <div className="e-actions">
                  {order.lignes.length > 0 && (
                    <button
                      className="e-btn e-secondary"
                      disabled={busy}
                      onClick={() => setReorderOrder(order)}
                    >
                      {tr("Acheter à nouveau", "Buy again")}
                    </button>
                  )}
                  {order.statut === "EN_ATTENTE" && (
                    <button
                      className="e-btn e-secondary"
                      onClick={() => setAction("cancel")}
                    >
                      {tr("Annuler la commande", "Cancel order")}
                    </button>
                  )}
                  {order.statut === "EN_LIVRAISON" && order.modeReception === "LIVRAISON" && (
                    <button
                      className="e-btn"
                      onClick={() => setAction("reception")}
                    >
                      {tr("Confirmer la réception", "Confirm receipt")}
                    </button>
                  )}
                  <Link to="/contact">
                    {tr("Besoin d’aide ?", "Need help?")}
                  </Link>
                </div>
              </section>
              <aside>
                <section className="e-order-selection">
                  <h2>{tr("Articles de la commande", "Order items")}</h2>
                  {order.lignes.map((line, index) => (
                    <div className="e-review-line" key={line.id || index}>
                      <div>
                        {line.produitId ? (
                          <Link to={`/product/${line.produitId}`}>
                            {line.nomProduit}
                          </Link>
                        ) : (
                          line.nomProduit
                        )}
                        <small>
                          {line.quantite} ×{" "}
                          {formatFCFA(Number(line.prixUnitaire))}
                        </small>
                      </div>
                      <strong>
                        {formatFCFA(
                          Number(
                            line.sousTotal ?? line.prixUnitaire * line.quantite,
                          ),
                        )}
                      </strong>
                    </div>
                  ))}
                  <div className="e-order-amount">
                    <span>{tr("Montant enregistré", "Recorded amount")}</span>
                    <strong>{total(order)}</strong>
                  </div>
                </section>
                <section className="e-order-address">
                  <h2>
                    {order.modeReception === "RETRAIT_MAGASIN"
                      ? tr("Retrait en boutique", "Shop pickup")
                      : tr("Adresse de livraison", "Delivery address")}
                  </h2>
                  <p>
                    {order.nomClient}
                    <br />
                    {order.telephone}
                    <br />
                    {order.adresseLivraison}
                  </p>
                </section>
              </aside>
            </div>
          )
        ) : (
          <>
            {!profile && (
              <div
                className="e-order-filters"
                role="group"
                aria-label={tr("Filtrer les commandes", "Filter orders")}
              >
                {[
                  ["all", tr("Toutes", "All")],
                  ["active", tr("En cours", "Active")],
                  ["LIVREE", tr("Terminées", "Completed")],
                  ["ANNULEE", tr("Annulées", "Cancelled")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {(profile
              ? orders.data.slice(0, 1)
              : orders.data.filter(
                  (o) =>
                    filter === "all" ||
                    (filter === "active" &&
                      ["EN_ATTENTE", "CONFIRMEE", "EN_LIVRAISON"].includes(
                        o.statut,
                      )) ||
                    o.statut === filter,
                )
            ).map(tile)}
            {!(
              profile
                ? orders.data.slice(0, 1)
                : orders.data.filter(
                    (o) =>
                      filter === "all" ||
                      (filter === "active" &&
                        ["EN_ATTENTE", "CONFIRMEE", "EN_LIVRAISON"].includes(
                          o.statut,
                        )) ||
                      o.statut === filter,
                  )
            ).length && (
              <div className="e-state">
                <Package size={32} />
                <h2>{tr("Aucune commande à afficher", "No orders to show")}</h2>
                <Link to="/catalogue">
                  {tr("Explorer le catalogue", "Explore the catalogue")}
                </Link>
              </div>
            )}
          </>
        )}
      </div>
      {reorderOrder && (
        <Reorder order={reorderOrder} onClose={() => setReorderOrder(null)} />
      )}
      <Modal
        open={Boolean(action)}
        onClose={() => {
          if (!busy) setAction(null);
        }}
        title={
          action === "cancel"
            ? tr("Annuler cette commande ?", "Cancel this order?")
            : tr(
                "Avez-vous reçu vos articles ?",
                "Have you received your items?",
              )
        }
      >
        <p>
          {action === "cancel"
            ? tr(
                "La commande sera annulée et les articles seront remis en stock.",
                "This order will be cancelled and the items returned to stock.",
              )
            : tr(
                "Confirmez uniquement après avoir reçu votre commande.",
                "Only confirm after you have received your order.",
              )}
        </p>
        <div className="e-actions">
          <button className="e-btn" disabled={busy} onClick={confirmAction}>
            {busy ? tr("En cours…", "Working…") : tr("Confirmer", "Confirm")}
          </button>
          <button
            className="e-btn e-secondary"
            disabled={busy}
            onClick={() => setAction(null)}
          >
            {tr("Revenir au suivi", "Back to tracking")}
          </button>
        </div>
      </Modal>
      <Footer />
    </>
  );
}
