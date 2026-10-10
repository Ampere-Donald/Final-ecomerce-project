import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Modal } from "./Elements";
import useReception, { setReception } from "./useReception";
import useBrowserReady from "./useBrowserReady";

export default function ReceptionChoice({ compact = false }) {
  const ready = useBrowserReady();
  const reception = useReception();
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(reception);
  const [error, setError] = useState("");
  const label =
    reception.mode === "RETRAIT_MAGASIN"
      ? tr("Retrait à Akwa", "Pickup at Akwa")
      : reception.ville
        ? tr("Livraison : ", "Delivery: ") + reception.ville
        : tr("Livraison : choisir la ville", "Delivery: choose town");
  function show() {
    setDraft(reception);
    setError("");
    setOpen(true);
  }
  function save(event) {
    event.preventDefault();
    if (draft.mode === "LIVRAISON" && !draft.ville.trim()) {
      setError(
        tr(
          "Indiquez votre ville pour préparer la demande de livraison.",
          "Enter your town to prepare delivery.",
        ),
      );
      return;
    }
    if (
      draft.ville.trim().length > 80 ||
      Array.from(draft.ville).some(
        (char) => char.codePointAt(0) < 32 || char.codePointAt(0) === 127,
      )
    ) {
      setError(
        tr(
          "Indiquez seulement le nom de la ville.",
          "Enter only the town name.",
        ),
      );
      return;
    }
    const saved = setReception(draft);
    if (!saved) {
      setError(
        tr(
          "Choix appliqué pour cette visite. Cet appareil ne permet pas de le conserver après rechargement.",
          "Choice applied for this visit. This device cannot save it after reload.",
        ),
      );
      return;
    }
    setOpen(false);
  }
  return (
    <>
      <button
        type="button"
        disabled={!ready}
        className={
          compact ? "e-destination-button" : "e-text-button e-reception-change"
        }
        onClick={show}
        aria-haspopup="dialog"
        aria-label={tr("Choisir la réception : ", "Choose reception: ") + label}
      >
        {compact && <MapPin size={17} aria-hidden="true" />}
        {compact ? (
          <strong>{label}</strong>
        ) : (
          tr("Modifier la réception", "Change reception")
        )}
      </button>
      {ready && createPortal(
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={tr(
            "Comment recevoir vos articles ?",
            "How would you like to receive your items?",
          )}
        >
          <form className="e-reception-form" onSubmit={save}>
            <p>
              {tr(
                "Choisissez librement. La boutique confirme la disponibilité avant le retrait ou l’expédition.",
                "Choose your preference. The shop confirms availability before pickup or dispatch.",
              )}
            </p>
            <fieldset>
              <legend>{tr("Votre préférence", "Your preference")}</legend>
              <label>
                <input
                  type="radio"
                  name="reception-mode"
                  value="RETRAIT_MAGASIN"
                  checked={draft.mode === "RETRAIT_MAGASIN"}
                  onChange={() =>
                    setDraft({ mode: "RETRAIT_MAGASIN", ville: "" })
                  }
                />
                {tr("Retrait à Akwa, Douala", "Pickup at Akwa, Douala")}
              </label>
              <label>
                <input
                  type="radio"
                  name="reception-mode"
                  value="LIVRAISON"
                  checked={draft.mode === "LIVRAISON"}
                  onChange={() => setDraft({ ...draft, mode: "LIVRAISON" })}
                />
                {tr("Demander une livraison", "Request delivery")}
              </label>
            </fieldset>
            {draft.mode === "LIVRAISON" && (
              <label className="e-field">
                {tr("Ville de livraison", "Delivery town")}
                <input
                  autoComplete="address-level2"
                  maxLength={80}
                  required
                  value={draft.ville}
                  onChange={(e) =>
                    setDraft({ ...draft, ville: e.target.value })
                  }
                  placeholder={tr("Exemple : Douala", "Example: Douala")}
                />
              </label>
            )}
            <p className="e-reception-policy">
              {tr(
                "Livraison : zone desservie, frais et délai à confirmer pour votre panier. Ce choix ne constitue pas une réservation.",
                "Delivery: coverage, fees and timing must be confirmed for your cart. This choice is not a reservation.",
              )}
            </p>
            {error && <p role="status">{error}</p>}
            <button className="e-btn" type="submit">
              {tr("Appliquer mon choix", "Apply my choice")}
            </button>
            <Link to="/livraison" onClick={() => setOpen(false)}>
              {tr(
                "Informations sur le retrait et la livraison",
                "Pickup and delivery information",
              )}
            </Link>
          </form>
        </Modal>,
        document.body,
      )}
    </>
  );
}

export function ReceptionSummary() {
  const { lang } = useI18n();
  const reception = useReception();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  return (
    <section
      className="e-reception-summary"
      aria-label={tr("Réception de vos articles", "Receiving your items")}
    >
      <h3>
        {reception.mode === "RETRAIT_MAGASIN"
          ? tr("Retrait à Akwa, Douala", "Pickup at Akwa, Douala")
          : reception.ville
            ? tr("Livraison demandée à ", "Delivery requested to ") +
              reception.ville
            : tr("Livraison demandée", "Delivery requested")}
      </h3>
      <p>
        {reception.mode === "RETRAIT_MAGASIN"
          ? tr(
              "Attendez la confirmation de la boutique avant de vous déplacer.",
              "Wait for the shop’s confirmation before travelling.",
            )
          : tr(
              "Zone desservie, frais et délai à confirmer avec la boutique pour votre panier.",
              "Confirm coverage, fees and timing for your cart with the shop.",
            )}
      </p>
      <ReceptionChoice />
      <Link to="/livraison">
        {tr("Voir les modalités", "See arrangements")}
      </Link>
    </section>
  );
}
