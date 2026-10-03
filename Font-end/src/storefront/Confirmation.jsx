import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Copy } from "./Elements";
import Footer from "./Footer";
import { privateTrackingLink } from "./guestAccess";
import { useState } from "react";
export default function Confirmation({
  number,
  orderId,
  canTrack = false,
  guestKey,
  guestAccess,
}) {
  const [copied, setCopied] = useState(false);
  const guestLink = guestKey ? privateTrackingLink(guestKey) : "";
  return (
    <>
      <div className="e-wrap e-confirmation-page">
        <div className="e-page-lead">
          <h1>
            <Copy fr="Commande enregistrée" en="Order recorded" />
          </h1>
        </div>
        <div className="e-confirmation-layout">
          <section className="e-confirmation-note">
            <div className="e-success-icon">
              <Check size={32} />
            </div>
            <h2>
              <Copy
                fr="Votre sélection a bien été reçue"
                en="Your order has been received"
              />
            </h2>
            <p>
              <Copy
                fr="La boutique doit encore vérifier la disponibilité et les modalités de réception."
                en="The shop still needs to confirm availability and delivery arrangements."
              />
            </p>
            <div className="e-order-id">
              <small>
                <Copy fr="Numéro de commande" en="Order number" />
              </small>
              <strong>{number}</strong>
              <span className="e-stock e-stock--low">
                <Copy
                  fr="En attente de validation"
                  en="Awaiting confirmation"
                />
              </span>
            </div>
            <div className="e-note e-gold-note">
              <Copy
                fr={
                  canTrack
                    ? "Enregistrement, validation et paiement sont trois étapes distinctes. Consultez votre compte pour connaître l’état de votre commande."
                    : "Enregistrement, validation et paiement sont trois étapes distinctes. Gardez votre numéro de commande et contactez la boutique pour connaître la suite."
                }
                en={
                  canTrack
                    ? "Recording, confirmation and payment are separate steps. Check your account for your order status."
                    : "Recording, confirmation and payment are separate steps. Keep your order number and contact the shop for updates."
                }
              />
            </div>
            <div className="e-actions">
              {guestKey ? (
                <Link className="e-btn" to={`/suivi-invite#acces=${guestKey}`}>
                  <Copy
                    fr="Voir mon suivi privé"
                    en="View my private tracking"
                  />
                </Link>
              ) : canTrack ? (
                <Link
                  className="e-btn"
                  to={orderId ? `/commandes/${orderId}` : "/commandes"}
                >
                  <Copy fr="Voir le suivi" en="Track order" />
                </Link>
              ) : (
                <Link className="e-btn" to="/contact">
                  <Copy fr="Contacter la boutique" en="Contact the shop" />
                </Link>
              )}
              <Link to="/catalogue">
                <Copy fr="Retour au catalogue" en="Back to catalogue" />
              </Link>
            </div>
            {guestKey && (
              <div className="e-private-link">
                <p>
                  <Copy
                    fr="Gardez ce lien privé : toute personne qui le possède peut consulter vos articles et le suivi. Il ne permet aucun paiement."
                    en="Keep this link private: anyone with it can see your items and tracking. It cannot make a payment."
                  />
                </p>
                <label className="e-field">
                  <Copy fr="Votre lien de suivi" en="Your tracking link" />
                  <input
                    readOnly
                    value={guestLink}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <button
                  className="e-text-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(guestLink);
                      setCopied(true);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  <Copy
                    fr={copied ? "Lien copié" : "Copier le lien"}
                    en={copied ? "Link copied" : "Copy link"}
                  />
                </button>
                {guestAccess?.expiresAt && (
                  <small>
                    <Copy
                      fr="Accès valable jusqu’au "
                      en="Access valid until "
                    />
                    {new Date(guestAccess.expiresAt).toLocaleDateString(
                      "fr-FR",
                    )}
                  </small>
                )}
              </div>
            )}
          </section>
          <section className="e-next-steps">
            <h2>
              <Copy fr="La suite, simplement" en="What happens next" />
            </h2>
            <ol>
              <li>
                <strong>
                  <Copy
                    fr="Vérification par la boutique"
                    en="The shop checks your order"
                  />
                </strong>
                <p>
                  <Copy
                    fr="Disponibilité, références et frais éventuels."
                    en="Availability, references and any fees."
                  />
                </p>
              </li>
              <li>
                <strong>
                  <Copy fr="Votre accord" en="Your agreement" />
                </strong>
                <p>
                  <Copy
                    fr="Vérifiez le montant final et les modalités de règlement."
                    en="Check the final amount and payment arrangements."
                  />
                </p>
              </li>
              <li>
                <strong>
                  <Copy
                    fr="Préparation et réception"
                    en="Preparation and delivery"
                  />
                </strong>
                <p>
                  <Copy
                    fr="Attendez l’avis de disponibilité avant votre déplacement."
                    en="Wait for confirmation before collecting your order."
                  />
                </p>
              </li>
            </ol>
            <Link to="/contact">
              <Copy
                fr="Une question sur votre commande ?"
                en="A question about your order?"
              />
            </Link>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
