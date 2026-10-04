import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Modal } from "./Elements";
import { adviceMessage, adviceHref } from "./productAdviceData";
import { recordObservation } from "./journey.js";
export default function ProductAdvice({ product, quantity }) {
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const href = adviceHref(message);
  function show() {
    setMessage(adviceMessage(product, quantity, lang, window.location.origin));
    setOpen(true);
  }
  return (
    <>
      <button
        type="button"
        className="e-btn e-secondary e-help-product"
        onClick={show}
        aria-haspopup="dialog"
      >
        <MessageCircle size={20} />
        {tr("Conseil sur cette pièce", "Advice about this part")}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={tr("Parlons de votre pièce", "Let’s discuss your part")}
      >
        <div className="e-product-advice">
          <p className="e-advice-reference">
            <strong>
              {lang === "en" && product.englishName
                ? product.englishName
                : product.model}
            </strong>
            {product.reference && (
              <span>
                {tr("Référence : ", "Reference: ") + product.reference}
              </span>
            )}
          </p>
          <label htmlFor="e-product-question">
            {tr("Votre message à la boutique", "Your message to the shop")}
          </label>
          <textarea
            id="e-product-question"
            maxLength={1800}
            rows={10}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <p>
            {tr(
              "Ajoutez les contraintes de votre montage : tension, connecteur, dimensions ou référence à remplacer.",
              "Add your project requirements: voltage, connector, dimensions or the reference you need to replace.",
            )}
          </p>
          {href ? (
            <a
              className="e-btn e-advice-send"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordObservation("WHATSAPP_OUVERT", lang)}
            >
              {tr(
                "Ouvrir ce message dans WhatsApp",
                "Open this message in WhatsApp",
              )}
            </a>
          ) : (
            <button className="e-btn" disabled>
              {tr("Écrivez votre message", "Write your message")}
            </button>
          )}
          <small>
            {tr(
              "Relisez le texte. Vous l’envoyez vous-même depuis WhatsApp.",
              "Review the text. You send it yourself from WhatsApp.",
            )}
          </small>
        </div>
      </Modal>
    </>
  );
}
