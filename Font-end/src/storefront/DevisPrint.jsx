import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { formatFCFA } from "../utils/formatFCFA";
import { apiMessage, orderDate } from "./orderData";
import { requestViewValid } from "./devisData";
import { canAcceptOffer, offerIsValid } from "./devisAcceptance";

export default function DevisPrint() {
  const { id } = useParams();
  const { token } = useAuth();
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [state, setState] = useState({ id: null, token: null, data: null, error: null });

  useEffect(() => {
    if (!id || !token) return;
    const controller = new AbortController();
    apiClient.get(`/devis/mine/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      timeout: 20000,
    }).then(({ data }) => {
      if (!requestViewValid(data) || data.id !== id || !offerIsValid(data))
        throw new Error("Invalid printable offer");
      if (!controller.signal.aborted) setState({ id, token, data, error: null });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ id, token, data: null, error });
    });
    return () => controller.abort();
  }, [id, token]);

  const current = state.id === id && state.token === token;
  const data = current ? state.data : null;
  const error = current ? state.error : null;
  const back = `/mes-devis/${encodeURIComponent(id || "")}`;
  const active = data && canAcceptOffer(data);
  const status = data?.statut === "ACCEPTEE"
    ? tr("Acceptée · document de référence", "Accepted · reference document")
    : active
      ? tr("Proposition en cours de validité", "Current offer")
      : tr("Proposition non disponible à l’acceptation", "Offer unavailable for acceptance");

  return (
    <div className="e-print-page">
      <div className="e-print-toolbar">
        <Link to={back}>{tr("Retour à ma demande", "Back to my request")}</Link>
        {data && <button type="button" className="e-btn" onClick={() => window.print()}>
          {tr("Imprimer ou enregistrer en PDF", "Print or save as PDF")}
        </button>}
      </div>
      {!current ? (
        <p className="e-state" role="status">{tr("Chargement de la proposition…", "Loading offer…")}</p>
      ) : error ? (
        <div className="e-state" role="alert">
          <h1>{tr("Proposition indisponible", "Offer unavailable")}</h1>
          <p>{apiMessage(error, tr("Vérifiez votre connexion ou revenez à votre demande.", "Check your connection or return to your request."))}</p>
          {error.response?.status === 401 && <Link to={`/login?returnTo=${encodeURIComponent(`/mes-devis/${id}/imprimer`)}`}>{tr("Se reconnecter", "Sign in again")}</Link>}
        </div>
      ) : (
        <article className="e-print-sheet" aria-label={tr("Proposition commerciale imprimable", "Printable commercial offer")}>
          <header className="e-print-head">
            <div>
              <strong className="e-print-brand">NEWOTEG</strong>
              <span>X-Electronic · {tr("Composants électroniques", "Electronic components")}</span>
              <small>Akwa, Douala · Cameroun</small>
            </div>
            <div className="e-print-head-right">
              <span>{tr("PROPOSITION COMMERCIALE", "COMMERCIAL OFFER")}</span>
              <strong>{data.offre.numero}</strong>
              <small>{tr("Demande du", "Request from")} {orderDate(data.createdAt, lang)}</small>
            </div>
          </header>

          <div className="e-print-intro">
            <div>
              <span className="e-print-kicker">{tr("DESTINATAIRE", "CUSTOMER")}</span>
              <strong>{data.nomClient || tr("Client", "Customer")}</strong>
              {data.telephone && <span>{data.telephone}</span>}
            </div>
            <div>
              <span className="e-print-kicker">{tr("VALIDITÉ", "VALIDITY")}</span>
              <strong>{orderDate(data.offre.dateExpiration, lang)}</strong>
              <span className={active ? "e-print-status e-print-status--active" : "e-print-status"}>{status}</span>
            </div>
          </div>

          <h1>{tr("Votre proposition", "Your offer")}</h1>
          <p className="e-print-subtitle">{tr("Sélection préparée pour votre demande de composants.", "Selection prepared for your component request.")}</p>

          <div className="e-print-table-wrap">
            <table className="e-print-table">
              <thead><tr>
                <th scope="col">{tr("Désignation", "Item")}</th>
                <th scope="col">{tr("Qté", "Qty")}</th>
                <th scope="col">{tr("Prix unit.", "Unit price")}</th>
                <th scope="col">{tr("Montant", "Amount")}</th>
              </tr></thead>
              <tbody>{data.offre.lignes.map((line) => (
                <tr key={line.produitId}>
                  <td>{line.nomProduit}</td>
                  <td>{line.quantite}</td>
                  <td>{formatFCFA(line.prixUnitaire)}</td>
                  <td>{formatFCFA(line.sousTotal)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="e-print-total">
            <span>{tr("Total des articles", "Item total")}</span>
            <strong>{formatFCFA(data.offre.montantArticles)}</strong>
          </div>

          <section className="e-print-reception">
            <span className="e-print-kicker">{tr("RÉCEPTION PRÉVUE", "PLANNED RECEPTION")}</span>
            <strong>{data.modeReception === "RETRAIT_MAGASIN" ? tr("Retrait à Akwa", "Pickup at Akwa") : tr("Livraison", "Delivery")}</strong>
            {data.destination && <span>{data.destination}</span>}
            {data.modeReception === "LIVRAISON" && <p>{tr("Frais et délai de livraison à confirmer avec la boutique.", "Delivery fee and timing to be confirmed with the shop.")}</p>}
          </section>
          <footer className="e-print-foot">
            <p>{tr("Ce document présente la proposition communiquée pour votre demande. Il ne constitue ni une facture ni une preuve de paiement.", "This document presents the offer for your request. It is neither an invoice nor proof of payment.")}</p>
            <p>{tr("Le stock n’est pas réservé par cette proposition. La disponibilité est revérifiée lors de l’acceptation ; aucun paiement n’est effectué à cette étape.", "This offer does not reserve stock. Availability is checked again on acceptance; no payment is made at this step.")}</p>
            {!active && <p className="e-print-expired">{tr("Pour une proposition actualisée, contactez la boutique avant toute commande.", "Contact the shop for an updated offer before ordering.")}</p>}
          </footer>
        </article>
      )}
    </div>
  );
}
