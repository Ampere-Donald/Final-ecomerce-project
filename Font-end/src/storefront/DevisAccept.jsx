import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { formatFCFA } from "../utils/formatFCFA";
import { apiMessage, orderDate, orderState } from "./orderData";
import { requestViewValid } from "./devisData";
import {
  offerIsValid,
  canAcceptOffer,
  readAcceptance,
  saveAcceptance,
  clearAcceptance,
  acceptedResponseValid,
} from "./devisAcceptance";

export default function DevisAccept({ request, onUpdated }) {
  const { user, token } = useAuth();
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const ownerId = user?.id;
  const [recovery] = useState(() => readAcceptance(ownerId, request.id));
  const [attempt, setAttempt] = useState(recovery.attempt);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [now, setNow] = useState(Date.now);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);
  const accepted = request.statut === "ACCEPTEE";
  const valid = offerIsValid(request);
  const available = canAcceptOffer(request, now);
  const route = `/mes-devis/${encodeURIComponent(request.id)}`;

  async function reloadRequest() {
    if (lock.current || !token) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNeedsLogin(false);
    try {
      const { data } = await apiClient.get(
        `/devis/mine/${encodeURIComponent(request.id)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        },
      );
      if (!requestViewValid(data) || data.id !== request.id)
        throw new Error("Invalid request response");
      if (!alive.current) return;
      // A confirmed rejection requires this successful authoritative read before a new confirmation.
      if (!clearAcceptance(ownerId, request.id))
        throw new Error("Cannot clear acceptance recovery");
      setAttempt(null);
      setChecked(false);
      onUpdated(data);
    } catch (e) {
      if (!alive.current) return;
      setNeedsLogin(e.response?.status === 401);
      setError(
        apiMessage(
          e,
          tr(
            "Impossible de relire la proposition. Réessayez avant de confirmer à nouveau.",
            "The offer could not be reloaded. Try again before confirming again.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function send(saved) {
    if (
      lock.current ||
      !token ||
      saved.ownerId !== ownerId ||
      saved.demandeId !== request.id
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNeedsLogin(false);
    try {
      const { data } = await apiClient.post(
        `/devis/mine/${encodeURIComponent(request.id)}/accepter`,
        saved.payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        },
      );
      if (!acceptedResponseValid(data, request.id))
        throw new Error("Invalid acceptance response");
      if (!alive.current) return;
      // The durable request status prevents resubmission even when browser storage cannot be cleared.
      clearAcceptance(ownerId, request.id);
      setAttempt(null);
      setChecked(false);
      onUpdated({
        ...request,
        statut: "ACCEPTEE",
        commande: data.commande,
        numeroCommande: data.commande.numeroSuivi,
        acceptedVersion: saved.payload.version,
      });
    } catch (e) {
      if (!alive.current) return;
      setNeedsLogin(e.response?.status === 401);
      if ([400, 404, 409, 422].includes(e.response?.status)) {
        const review = { ...saved, phase: "review" };
        saveAcceptance(review);
        setAttempt(review);
        setChecked(false);
      }
      setError(
        apiMessage(
          e,
          tr(
            "La réponse n’est pas arrivée. Reprenez la même tentative pour vérifier si votre commande a été créée.",
            "The response did not arrive. Resume the same attempt to check whether your order was created.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function accept(event) {
    event.preventDefault();
    if (
      lock.current ||
      attempt ||
      recovery.blocked ||
      !checked ||
      !canAcceptOffer(request) ||
      !ownerId ||
      !token
    )
      return;
    let requestId;
    try {
      requestId = crypto.randomUUID();
    } catch {
      setError(
        tr(
          "La confirmation est indisponible sur ce navigateur. Contactez la boutique.",
          "Confirmation is unavailable in this browser. Contact the shop.",
        ),
      );
      return;
    }
    const saved = {
      ownerId,
      demandeId: request.id,
      phase: "pending",
      payload: {
        requestId,
        version: request.version,
        conditionsAcceptees: true,
      },
    };
    if (!saveAcceptance(saved)) {
      setError(
        tr(
          "Votre navigateur ne peut pas conserver cette tentative. Aucun envoi effectué. Autorisez le stockage de session ou contactez la boutique.",
          "Your browser cannot retain this attempt. Nothing was sent. Enable session storage or contact the shop.",
        ),
      );
      return;
    }
    setAttempt(saved);
    void send(saved);
  }

  if (accepted) {
    const number = request.commande?.numeroSuivi || request.numeroCommande;
    return (
      <section
        className="e-devis-reply"
        aria-label={tr("Commande du devis", "Quote order")}
      >
        <h2>
          {tr("Votre commande est enregistrée", "Your order is recorded")}
        </h2>
        {number && (
          <p>
            <strong>{number}</strong>
          </p>
        )}
        <p>
          {request.commande
            ? orderState(request.commande.statut, lang).label
            : tr(
                "L’historique de cette commande n’est plus disponible en ligne.",
                "The history for this order is no longer available online.",
              )}
        </p>
        <p>
          {tr(
            "Aucun paiement n’a été effectué par cette acceptation. La boutique vous confirme la disponibilité et la réception.",
            "Accepting this offer did not make a payment. The shop will confirm availability and reception.",
          )}
        </p>
        {request.commande?.id ? (
          <Link
            className="e-btn"
            to={`/commandes/${encodeURIComponent(request.commande.id)}`}
          >
            {tr("Voir le suivi de ma commande", "Track my order")}
          </Link>
        ) : (
          <Link className="e-btn e-secondary" to="/contact">
            {tr(
              "Contacter la boutique avec ce numéro",
              "Contact the shop with this number",
            )}
          </Link>
        )}
      </section>
    );
  }

  if (!request.offre && !attempt && !recovery.blocked) return null;
  return (
    <section
      className="e-devis-offer"
      aria-label={tr("Proposition de la boutique", "Shop offer")}
    >
      <h2>
        {tr("Proposition", "Offer")} {valid ? request.offre.numero : ""}
      </h2>
      {valid ? (
        <>
          <p>
            {tr("Valable jusqu’au", "Valid until")}{" "}
            {orderDate(request.offre.dateExpiration, lang)}
          </p>
          {request.offre.lignes.map((line) => (
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
            <strong>{formatFCFA(request.offre.montantArticles)}</strong>
          </div>
          <section className="e-devis-details">
            <h3>{tr("Réception prévue", "Planned reception")}</h3>
            <p>
              {request.modeReception === "RETRAIT_MAGASIN"
                ? tr("Retrait à Akwa", "Pickup at Akwa")
                : tr(
                    "Livraison · frais et délai à confirmer",
                    "Delivery · fee and timing to confirm",
                  )}
              {request.destination && (
                <>
                  <br />
                  {request.destination}
                </>
              )}
            </p>
          </section>
          <p>
            {tr(
              "Stock non réservé. La boutique revérifie la disponibilité avant de valider la commande. Aucun paiement à cette étape.",
              "Stock is not reserved. The shop checks availability before confirming the order. No payment at this step.",
            )}
          </p>
        </>
      ) : (
        <p>
          {tr(
            "Les détails de cette proposition sont incomplets. Contactez la boutique avant de confirmer.",
            "This offer is incomplete. Contact the shop before confirming.",
          )}
        </p>
      )}
      {error && (
        <p className="e-field-error" role="alert">
          {error}
        </p>
      )}
      {recovery.blocked ? (
        <div className="e-devis-resume">
          <h3>
            {tr(
              "Votre tentative ne peut pas être relue",
              "Your attempt cannot be read",
            )}
          </h3>
          <p>
            {tr(
              "Consultez vos commandes ou contactez la boutique avant toute nouvelle confirmation.",
              "Check your orders or contact the shop before confirming again.",
            )}
          </p>
          <Link to="/commandes">{tr("Mes commandes", "My orders")}</Link>
        </div>
      ) : attempt ? (
        <div className="e-devis-resume" aria-live="polite">
          <h3>
            {attempt.phase === "review"
              ? tr(
                  "Relisez la proposition avant de confirmer",
                  "Review the offer before confirming",
                )
              : tr(
                  "Une confirmation est en cours de vérification",
                  "A confirmation is awaiting verification",
                )}
          </h3>
          <p>
            {attempt.phase === "review"
              ? tr(
                  "La boutique a refusé cette tentative. Relisez l’état actuel de votre demande, puis confirmez à nouveau si une proposition reste disponible.",
                  "The shop rejected this attempt. Reload the current request, then confirm again if an offer is still available.",
                )
              : tr(
                  "Cette tentative garde la proposition que vous avez confirmée. Reprenez-la pour retrouver son résultat.",
                  "This attempt retains the offer you confirmed. Resume it to retrieve its result.",
                )}
          </p>
          {!needsLogin && (
            <button
              className="e-btn"
              disabled={busy}
              onClick={() =>
                attempt.phase === "review"
                  ? void reloadRequest()
                  : void send(attempt)
              }
            >
              {busy
                ? tr("Vérification…", "Checking…")
                : attempt.phase === "review"
                  ? tr("Relire la proposition", "Reload the offer")
                  : tr(
                      "Reprendre la même confirmation",
                      "Resume the same confirmation",
                    )}
            </button>
          )}
        </div>
      ) : available ? (
        <form className="e-devis-contact" onSubmit={accept}>
          <label className="e-check">
            <input
              type="checkbox"
              required
              checked={checked}
              disabled={busy}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <span>
              {tr(
                "J’accepte cette proposition et la réception indiquée. Les frais et le délai de livraison restent à confirmer avec la boutique.",
                "I accept this offer and the stated reception method. Delivery fees and timing remain subject to confirmation with the shop.",
              )}
            </span>
          </label>
          <button className="e-btn" type="submit" disabled={!checked || busy}>
            {tr(
              "Créer ma commande à valider",
              "Create my order for confirmation",
            )}
          </button>
        </form>
      ) : (
        <p role="status">
          {request.statut === "ENVOYEE" || request.statut === "EXPIREE"
            ? tr(
                "Cette proposition n’est plus disponible à l’acceptation. Demandez sa mise à jour à la boutique.",
                "This offer is no longer available for acceptance. Ask the shop to update it.",
              )
            : tr(
                "Cette demande ne peut pas être acceptée dans son état actuel.",
                "This request cannot be accepted in its current state.",
              )}
        </p>
      )}
      {needsLogin && (
        <p>
          <Link to={`/login?returnTo=${encodeURIComponent(route)}`}>
            {tr("Se reconnecter pour reprendre", "Sign in again to resume")}
          </Link>
        </p>
      )}
      <p>
        <Link to="/contact">
          {tr(
            "Une question sur cette proposition ? Contacter la boutique",
            "Questions about this offer? Contact the shop",
          )}
        </Link>
      </p>
    </section>
  );
}
