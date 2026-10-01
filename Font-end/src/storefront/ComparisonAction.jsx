import { useState } from "react";
import { Link } from "react-router-dom";
import { Columns2, Check } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import useComparison, { toggleSelectedProduct } from "./useComparison";

export function ComparisonLink() {
  const { selection } = useComparison();
  const { lang } = useI18n();
  return (
    <Link className="e-compare-link" to="/comparer">
      <Columns2 size={18} aria-hidden="true" />
      {lang === "fr" ? "Comparateur" : "Compare products"} (
      {selection.ids.length}/3)
    </Link>
  );
}
export default function ComparisonAction({ product }) {
  const { selection, saved } = useComparison();
  const { lang } = useI18n();
  const [error, setError] = useState(null);
  const selected = selection.ids.includes(product.id);
  const name =
    lang === "en" && product.englishName ? product.englishName : product.model;
  const messages = {
    family: [
      "Choisissez des articles de la même famille, ou videz la sélection.",
      "Choose products from the same category, or clear the selection.",
    ],
    limit: [
      "Trois articles maximum. Retirez un article pour en choisir un autre.",
      "Up to three products. Remove a product to choose another.",
    ],
    unknown: [
      "La famille de cet article doit être renseignée pour le comparer.",
      "This product needs a category before it can be compared.",
    ],
  };
  return (
    <div className="e-comparison-action">
      <button
        className="e-compare-toggle"
        aria-pressed={selected}
        aria-label={`${lang === "fr" ? "Comparer" : "Compare"} : ${name}`}
        onClick={() => setError(toggleSelectedProduct(product))}
      >
        {selected ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Columns2 size={16} aria-hidden="true" />
        )}
        {lang === "fr"
          ? selected
            ? "Dans le comparateur"
            : "Comparer"
          : selected
            ? "Selected to compare"
            : "Compare"}
      </button>
      {(error || (!saved && selected)) && (
        <p className="e-compare-feedback" role="status">
          {error
            ? messages[error][lang === "fr" ? 0 : 1]
            : lang === "fr"
              ? "Sélection conservée pour cette visite uniquement."
              : "Selection kept for this visit only."}
          {error && (
            <Link to="/comparer">
              {lang === "fr" ? "Voir la sélection" : "View selection"}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
