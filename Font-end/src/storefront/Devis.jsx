import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { formatFCFA } from "../utils/formatFCFA";
import { apiMessage, orderDate } from "./orderData";
import { devisStatus, requestViewValid } from "./devisData";
import { Crumbs } from "./Elements";
import DevisBuilder from "./DevisBuilder";
import Footer from "./Footer";

export default function Devis() {
  const { user, token } = useAuth();
  const { lang } = useI18n();
  const { pathname } = useLocation();
  const { id } = useParams();
  const publicForm = pathname === "/devis";
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(null);
  const [editingVersion, setEditingVersion] = useState(null);
  const key = `${token}:${id || ""}:${revision}`;
  useEffect(() => {
    if (publicForm || !token) return;
    const controller = new AbortController();
    apiClient
      .get(id ? `/devis/mine/${id}` : "/devis/mine", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        timeout: 20000,
      })
      .then(({ data }) => {
        if (
          id
            ? !requestViewValid(data)
            : !Array.isArray(data) || data.some((row) => !requestViewValid(row))
        )
          throw new Error("Invalid quote requests response");
        if (!controller.signal.aborted) setState({ key, data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ key, data: null, error });
      });
    return () => controller.abort();
  }, [publicForm, token, id, revision, key]);
  const current = state?.key === key;
  const data = current ? state?.data : null;
  const error = current ? state?.error : null;
  const title = publicForm
    ? tr("Demander un devis", "Request a quote")
    : id
      ? tr("Votre demande de devis", "Your quote request")
      : tr("Mes demandes de devis", "My quote requests");
  const badge = (status) => {
    const entry = devisStatus[status];
    return (
      <span
        className={`e-order-status e-order-status--${entry?.[2] || "pending"}`}
      >
        {entry?.[lang === "en" ? 1 : 0] ||
          tr("Statut à confirmer", "Status to confirm")}
      </span>
    );
  };
  return (
    <>
      <div className="e-wrap e-devis-page">
        <Crumbs title={title} />
        <div className="e-page-lead e-account-lead">
          <div>
            <h1>{title}</h1>
            <p>
              {publicForm
                ? tr(
                    "Votre liste de pièces, une réponse de la boutique.",
                    "Your parts list, a reply from the shop.",
                  )
                : tr(
                    "Retrouvez votre liste et les propositions de la boutique.",
                    "View your list and offers from the shop.",
                  )}
            </p>
          </div>
          {!publicForm && (
            <button
              className="e-btn e-secondary"
              disabled={!current}
              onClick={() => {
                setEditingVersion(null);
                setRevision((n) => n + 1);
              }}
            >
              {tr("Actualiser", "Refresh")}
            </button>
          )}
        </div>
        <nav
          className="e-account-nav"
          aria-label={tr("Espace devis", "Quote area")}
        >
          <Link to="/devis" aria-current={publicForm ? "page" : undefined}>
            {tr("Nouvelle demande", "New request")}
          </Link>
          <Link to="/mes-devis" aria-current={!publicForm ? "page" : undefined}>
            {tr("Mes demandes", "My requests")}
          </Link>
          {user && <Link to="/profile">{tr("Mon compte", "My account")}</Link>}
        </nav>
        {publicForm ? (
          <DevisBuilder key={user?.id || "visitor"} />
        ) : !current ? (
          <p className="e-state" role="status">
            {tr("Chargement de vos demandes…", "Loading your requests…")}
          </p>
        ) : error ? (
          <div className="e-state" role="alert">
            <h2>
              {tr("La demande est indisponible", "The request is unavailable")}
            </h2>
            <p>
              {apiMessage(
                error,
                tr(
                  "Vérifiez votre connexion puis actualisez. Votre demande reste enregistrée.",
                  "Check your connection then refresh. Your request is still saved.",
                ),
              )}
            </p>
            {error.response?.status === 401 ? (
              <Link to={`/login?returnTo=${encodeURIComponent(pathname)}`}>
                {tr("Se reconnecter", "Sign in again")}
              </Link>
            ) : (
              <Link to="/mes-devis">{tr("Mes demandes", "My requests")}</Link>
            )}
          </div>
        ) : id ? (
          <>
            <div className="e-devis-detail-head">
              {badge(data.statut)}
              <p>
                {tr("Envoyée le", "Sent on")} {orderDate(data.createdAt, lang)}
              </p>
            </div>
            {data.reponseClient && (
              <section className="e-devis-reply">
                <h2>{tr("La réponse de la boutique", "The shop’s reply")}</h2>
                <p>{data.reponseClient}</p>
              </section>
            )}
            {data.statut === "A_PRECISER" && editingVersion === data.version ? (
              <DevisBuilder
                key={`${data.id}:${data.version}`}
                existing={data}
                onSaved={() => {
                  setEditingVersion(null);
                  setRevision((n) => n + 1);
                }}
              />
            ) : (
              <>
                <section className="e-devis-request-lines">
                  <h2>{tr("Votre liste transmise", "Your submitted list")}</h2>
                  {data.lignes.map((line, index) => (
                    <div
                      className="e-devis-reference-row"
                      key={line.id || index}
                    >
                      <div>
                        <strong>{line.reference}</strong>
                        <small>
                          {line.nomProduit ||
                            tr("Référence à préciser", "Reference to clarify")}
                        </small>
                      </div>
                      <span>
                        {line.quantite} {tr("pièce(s)", "item(s)")}
                      </span>
                    </div>
                  ))}
                </section>
                <section className="e-devis-details">
                  <h2>
                    {tr(
                      "Réception et coordonnées",
                      "Reception and contact details",
                    )}
                  </h2>
                  <p>
                    {data.modeReception === "RETRAIT_MAGASIN"
                      ? tr("Retrait à Akwa", "Pickup at Akwa")
                      : tr(
                          "Livraison · frais et délai à confirmer",
                          "Delivery · fee and timing to confirm",
                        )}
                    <br />
                    {data.destination}
                    <br />
                    {data.nomClient}
                    <br />
                    {data.telephone}
                  </p>
                  {data.notes && <p>{data.notes}</p>}
                </section>
                {data.statut === "A_PRECISER" && (
                  <button
                    className="e-btn"
                    onClick={() => setEditingVersion(data.version)}
                  >
                    {tr("Préciser ma demande", "Clarify my request")}
                  </button>
                )}
              </>
            )}
            {data.offre && (
              <section className="e-devis-offer">
                <div className="e-section-head">
                  <h2>
                    {tr("Proposition", "Offer")} {data.offre.numero}
                  </h2>
                </div>
                <p>
                  {tr("Valable jusqu’au", "Valid until")}{" "}
                  {orderDate(data.offre.dateExpiration, lang)}
                </p>
                {data.offre.lignes?.map((line) => (
                  <div className="e-review-line" key={line.produitId}>
                    <div>
                      <strong>{line.nomProduit}</strong>
                      <small>
                        {line.quantite} × {formatFCFA(line.prixUnitaire)}
                      </small>
                    </div>
                    <strong>{formatFCFA(line.sousTotal)}</strong>
                  </div>
                ))}
                <div className="e-order-amount">
                  <span>{tr("Montant des articles", "Item amount")}</span>
                  <strong>{formatFCFA(data.offre.montantArticles)}</strong>
                </div>
                <p>
                  {tr(
                    "Stock non réservé. Disponibilité à revérifier avec la boutique. Frais et délai de livraison à confirmer.",
                    "Stock is not reserved. Check availability with the shop. Delivery fee and timing to confirm.",
                  )}
                </p>
                <Link className="e-btn e-secondary" to="/contact">
                  {tr(
                    "Contacter la boutique pour cette proposition",
                    "Contact the shop about this offer",
                  )}
                </Link>
              </section>
            )}
          </>
        ) : data.length ? (
          data.map((row) => (
            <article className="e-devis-history-row" key={row.id}>
              <div>
                {badge(row.statut)}
                <h2>
                  <Link to={`/mes-devis/${row.id}`}>
                    {row.lignes[0].reference}
                    {row.lignes.length > 1 ? ` + ${row.lignes.length - 1}` : ""}
                  </Link>
                </h2>
                <p>
                  {orderDate(row.createdAt, lang)} · {row.lignes.length}{" "}
                  {tr("référence(s)", "reference(s)")}
                </p>
              </div>
              <Link to={`/mes-devis/${row.id}`}>
                {tr("Voir la demande", "View request")}
              </Link>
            </article>
          ))
        ) : (
          <div className="e-state">
            <h2>
              {tr(
                "Votre première liste commence ici",
                "Start your first list here",
              )}
            </h2>
            <p>
              {tr(
                "Envoyez vos références et quantités pour demander un devis.",
                "Send your references and quantities to request a quote.",
              )}
            </p>
            <Link className="e-btn" to="/devis">
              {tr("Demander un devis", "Request a quote")}
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
