import { useI18n } from "../context/I18nContext";
import { formatFCFA } from "../utils/formatFCFA";
export default function OfferDetails({ product }) {
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  if (!product.offer) return null;
  const { cataloguePrice, end } = product.offer;
  return (
    <div className="e-offer-details">
      <p>
        {tr("Prix catalogue : ", "Catalogue price: ")}
        {formatFCFA(cataloguePrice)}
      </p>
      <p>
        {tr("Offre jusqu’au ", "Offer until ")}
        <time dateTime={end}>
          {new Intl.DateTimeFormat(lang === "fr" ? "fr-CM" : "en-CM", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Africa/Douala",
          }).format(new Date(end))}
        </time>{" "}
        {tr("(heure de Douala)", "(Douala time)")}
      </p>
    </div>
  );
}
