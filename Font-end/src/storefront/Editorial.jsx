import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { Copy, Crumbs } from "./Elements";
import Footer from "./Footer";
export default function Editorial() {
  const { pathname } = useLocation();
  const { lang } = useI18n();
  const delivery = pathname === "/livraison",
    faq = pathname === "/faq";
  const title = delivery
    ? ["Livraison et retrait", "Delivery and pickup"]
    : faq
      ? ["Questions fréquentes", "Frequently asked questions"]
      : ["Les bons repères pour choisir", "Useful guidance before choosing"];
  return (
    <>
      <div className="e-wrap e-editorial">
        <Crumbs title={title[lang === "fr" ? 0 : 1]} />
        <h1>{title[lang === "fr" ? 0 : 1]}</h1>
        {delivery ? (
          <div className="e-editorial-layout">
            <img src="/images/7.jpeg" alt="Boutique NEWOTEG à Douala" />
            <section>
              <h2>
                <Copy fr="Retrouvez-nous à Akwa" en="Find us in Akwa" />
              </h2>
              <p>Camp Yabassi, Douala.</p>
              <p>
                <Copy
                  fr="Attendez la confirmation de préparation avant votre déplacement. Pour une livraison, indiquez votre ville et votre quartier : les frais et le délai doivent être confirmés pour votre commande."
                  en="Wait until the shop confirms your order is ready before travelling. For delivery, provide your city and neighbourhood: cost and timing need confirmation for your order."
                />
              </p>
              <Link className="e-btn" to="/contact">
                <Copy
                  fr="Préparer ma réception"
                  en="Plan my delivery or pickup"
                />
              </Link>
            </section>
          </div>
        ) : faq ? (
          <div className="e-faq">
            {[
              [
                "Comment commander ?",
                "How do I order?",
                "Recherchez votre référence, vérifiez la disponibilité puis ajoutez-la au panier. Le récapitulatif permet de préparer la réception.",
                "Find your reference, check availability and add it to the cart. Review the summary before choosing delivery or pickup.",
              ],
              [
                "Une pièce ressemblante est-elle compatible ?",
                "Does a similar-looking part work?",
                "Une photo ne suffit pas. Comparez les références et les caractéristiques de votre appareil, puis demandez conseil.",
                "A photo is not enough. Compare references and specifications for your device, then ask for advice.",
              ],
              [
                "Comment connaître les frais de livraison ?",
                "How much does delivery cost?",
                "Indiquez votre destination à la boutique. Les frais doivent être communiqués et acceptés avant le règlement.",
                "Tell the shop your destination. Delivery fees must be communicated and agreed before payment.",
              ],
              [
                "Que faire en cas de rupture ?",
                "What if an item is out of stock?",
                "Une rupture ne signifie pas une précommande. Contactez la boutique pour faire vérifier votre besoin.",
                "Out of stock does not mean available to pre-order. Contact the shop to discuss your needs.",
              ],
            ].map(([fr, en, answer, answerEn]) => (
              <details key={fr}>
                <summary>
                  <Copy fr={fr} en={en} />
                </summary>
                <p>
                  <Copy fr={answer} en={answerEn} />
                </p>
              </details>
            ))}
            <Link className="e-btn" to="/contact">
              <Copy fr="Une autre question ?" en="Another question?" />
            </Link>
          </div>
        ) : (
          <div className="e-editorial-layout">
            <img src="/design-e/hdmi-5m.webp" alt="Câble HDMI" />
            <section>
              <h2>
                <Copy
                  fr="Avant de choisir votre câble"
                  en="Before choosing your cable"
                />
              </h2>
              <p>
                <Copy
                  fr="Notez les modèles de vos deux appareils, photographiez les connecteurs et mesurez le trajet réel du câble."
                  en="Note the models of both devices, photograph the connectors and measure the actual cable route."
                />
              </p>
              <p>
                <Copy
                  fr="Décrivez votre usage au conseiller. L’apparence d’un câble ne garantit pas ses performances : faites vérifier la référence exacte."
                  en="Describe your needs to the adviser. A cable’s appearance does not guarantee performance: check the exact reference."
                />
              </p>
              <div className="e-actions">
                <Link className="e-btn" to="/catalogue?search=HDMI">
                  <Copy fr="Voir les câbles HDMI" en="View HDMI cables" />
                </Link>
                <Link to="/contact">
                  <Copy fr="Demander conseil" en="Ask for advice" />
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
