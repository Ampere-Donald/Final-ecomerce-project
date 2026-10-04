import { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "./PageMeta";
import { X, RefreshCw } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Copy, Crumbs, Photo, Price, Stock } from "./Elements";
import useComparison, {
  clearComparison,
  removeComparedProduct,
} from "./useComparison";
import useComparisonProducts from "./useComparisonProducts";
import { comparisonRows } from "./comparisonData";
import Footer from "./Footer";

export default function Comparison() {
  const { selection, saved } = useComparison();
  const { entries, loading, retry } = useComparisonProducts(selection);
  const { lang } = useI18n();
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const products = entries.map((entry) => entry.product).filter(Boolean);
  const ready =
    !loading && entries.length >= 2 && products.length === entries.length;
  const rows = ready ? comparisonRows(products) : [];
  const differences = rows.filter((row) => row.different);
  const shownRows = onlyDifferences ? differences : rows;
  const categoryLink = selection.categoryId
    ? "/catalogue?category=" + encodeURIComponent(selection.categoryId)
    : "/catalogue";
  const title =
    lang === "fr" ? "Comparer les composants" : "Compare components";
  const missing = (
    <span className="e-compare-missing">
      <Copy fr="Non renseigné" en="Not provided" />
    </span>
  );
  const name = (p) =>
    lang === "en" && p.englishName ? p.englishName : p.model;
  const errorMessages = {
    unavailable: [
      "Cette référence n’est plus disponible au catalogue.",
      "This product is no longer available in the catalogue.",
    ],
    family: [
      "La famille a changé. Retirez cette référence pour poursuivre.",
      "The category has changed. Remove this product to continue.",
    ],
    invalid: [
      "Les caractéristiques de cette référence ne peuvent pas être lues.",
      "The specifications for this product cannot be read.",
    ],
    network: [
      "Impossible de relire cette référence. Réessayez.",
      "Unable to reload this product. Try again.",
    ],
  };
  return (
    <>
      <PageMeta title={`${title} — X-Electronic`} />
      <div className="e-wrap e-comparison-page">
        <Crumbs title={title} />
        <div className="e-comparison-lead">
          <div>
            <h1>{title}</h1>
            <p>
              <Copy
                fr="Deux ou trois articles d’une même famille, côte à côte."
                en="Two or three products from one category, side by side."
              />
            </p>
          </div>
          <Link className="e-btn e-secondary" to={categoryLink}>
            <Copy fr="Choisir au catalogue" en="Choose from the catalogue" />
          </Link>
        </div>
        <p className="e-comparison-note">
          <Copy
            fr="Même famille ne signifie pas remplacement compatible. Vérifiez la tension, le brochage et les exigences de votre montage avant de choisir."
            en="The same category does not guarantee a compatible replacement. Check voltage, pinout and your circuit requirements before choosing."
          />
        </p>
        {!saved && (
          <p className="e-note" role="status">
            <Copy
              fr="Cette sélection est conservée pour cette visite uniquement."
              en="This selection is kept for this visit only."
            />
          </p>
        )}
        {!selection.ids.length ? (
          <div className="e-state">
            <h2>
              <Copy
                fr="Quelles pièces souhaitez-vous comparer ?"
                en="Which products would you like to compare?"
              />
            </h2>
            <p>
              <Copy
                fr="Dans le catalogue ou sur une fiche, utilisez le bouton Comparer."
                en="Use the Compare button in the catalogue or on a product page."
              />
            </p>
            <Link className="e-btn" to="/catalogue">
              <Copy fr="Ouvrir le catalogue" en="Open the catalogue" />
            </Link>
          </div>
        ) : (
          <>
            <div className="e-comparison-toolbar">
              <span aria-live="polite">
                {selection.ids.length}/3{" "}
                <Copy fr="articles sélectionnés" en="products selected" />
              </span>
              <button className="e-view" onClick={clearComparison}>
                <Copy fr="Vider la sélection" en="Clear selection" />
              </button>
              <button className="e-view" disabled={loading} onClick={retry}>
                <RefreshCw size={15} aria-hidden="true" />
                <Copy fr="Actualiser" en="Refresh" />
              </button>
            </div>
            {loading ? (
              <p className="e-state" role="status">
                <Copy
                  fr="Vérification des prix, stocks et caractéristiques…"
                  en="Checking prices, stock and specifications…"
                />
              </p>
            ) : (
              <>
                {!ready && (
                  <div className="e-comparison-selection">
                    {entries.map((entry) => (
                      <div key={entry.id}>
                        <strong>
                          {entry.product
                            ? name(entry.product)
                            : lang === "fr"
                              ? "Référence à vérifier"
                              : "Product to check"}
                        </strong>
                        {entry.error && (
                          <p role="alert">
                            {errorMessages[entry.error][lang === "fr" ? 0 : 1]}
                          </p>
                        )}
                        {entry.product && (
                          <p>
                            {entry.product.reference || (
                              <Copy
                                fr="Référence non renseignée"
                                en="Reference not provided"
                              />
                            )}
                          </p>
                        )}
                        <button
                          className="e-compare-remove"
                          onClick={() => removeComparedProduct(entry.id)}
                        >
                          <X size={16} aria-hidden="true" />
                          <Copy fr="Retirer" en="Remove" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {selection.ids.length === 1 && (
                  <p role="status">
                    <Copy
                      fr="Choisissez un deuxième article dans cette famille pour commencer."
                      en="Choose a second product from this category to start."
                    />
                  </p>
                )}
                {ready && (
                  <>
                    <div className="e-comparison-options">
                      <label className="e-check">
                        <input
                          type="checkbox"
                          checked={onlyDifferences}
                          onChange={(e) => setOnlyDifferences(e.target.checked)}
                        />
                        <Copy
                          fr="Voir seulement les différences techniques renseignées"
                          en="Show only documented technical differences"
                        />
                      </label>
                      <span>
                        {differences.length}{" "}
                        <Copy
                          fr="critère(s) différent(s)"
                          en="differing specification(s)"
                        />
                      </span>
                    </div>
                    <p
                      id="compare-scroll-hint"
                      className="e-compare-scroll-hint"
                    >
                      <Copy
                        fr="Sur petit écran, faites défiler le tableau horizontalement pour voir chaque article."
                        en="On small screens, scroll the table horizontally to see each product."
                      />
                    </p>
                    <div
                      className="e-comparison-table-wrap"
                      role="region"
                      aria-label={title}
                      aria-describedby="compare-scroll-hint"
                      tabIndex={0}
                    >
                      <table className="e-comparison-table">
                        <caption className="sr-only">{title}</caption>
                        <thead>
                          <tr>
                            <th scope="col">
                              <Copy fr="Critères" en="Criteria" />
                              <p>{products[0].categoryName}</p>
                            </th>
                            {products.map((product) => (
                              <th scope="col" key={product.id}>
                                <div className="e-compare-photo">
                                  <Photo product={product} />
                                </div>
                                <Link
                                  className="e-compare-name"
                                  to={`/product/${product.id}`}
                                >
                                  {name(product)}
                                </Link>
                                <p className="e-reference">
                                  {product.reference || missing}
                                </p>
                                <button
                                  className="e-compare-remove"
                                  aria-label={`${lang === "fr" ? "Retirer" : "Remove"} ${name(product)}`}
                                  onClick={() =>
                                    removeComparedProduct(product.id)
                                  }
                                >
                                  <X size={15} aria-hidden="true" />
                                  <Copy fr="Retirer" en="Remove" />
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th scope="row">
                              <Copy fr="Prix détail" en="Retail price" />
                            </th>
                            {products.map((product) => (
                              <td key={product.id}>
                                <Price value={product.retailPrice} />
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <th scope="row">
                              <Copy fr="Disponibilité" en="Availability" />
                            </th>
                            {products.map((product) => (
                              <td key={product.id}>
                                <Stock product={product} />
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <th scope="row">
                              <Copy fr="Marque" en="Brand" />
                            </th>
                            {products.map((product) => (
                              <td key={product.id}>
                                {product.brand || missing}
                              </td>
                            ))}
                          </tr>
                          {shownRows.map((row) => (
                            <tr
                              key={row.label}
                              className={
                                row.different ? "e-compare-different" : ""
                              }
                            >
                              <th scope="row">
                                {row.label}
                                {row.incomplete && (
                                  <small>
                                    <Copy
                                      fr="Données incomplètes"
                                      en="Incomplete data"
                                    />
                                  </small>
                                )}
                              </th>
                              {row.values.map((value, i) => (
                                <td key={products[i].id}>{value ?? missing}</td>
                              ))}
                            </tr>
                          ))}
                          <tr>
                            <th scope="row">
                              <Copy fr="Documentation" en="Documentation" />
                            </th>
                            {products.map((product) => (
                              <td key={product.id}>
                                {product.urlDatasheet ? (
                                  <a
                                    href={product.urlDatasheet}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Copy fr="Fiche technique" en="Datasheet" />
                                  </a>
                                ) : (
                                  missing
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <th scope="row">
                              <Copy fr="Votre choix" en="Your choice" />
                            </th>
                            {products.map((product) => (
                              <td key={product.id}>
                                <Link
                                  className="e-btn e-secondary"
                                  to={`/product/${product.id}`}
                                >
                                  <Copy fr="Voir la pièce" en="View product" />
                                </Link>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {onlyDifferences && rows.some((row) => row.incomplete) && (
                      <p className="e-compare-scroll-hint">
                        <Copy
                          fr="Des champs sont incomplets et ne figurent pas dans ce filtre. Décochez-le pour voir les données manquantes."
                          en="Some fields are incomplete and are excluded by this filter. Uncheck it to see missing data."
                        />
                      </p>
                    )}
                    {!rows.length && (
                      <p role="status">
                        <Copy
                          fr="Aucune caractéristique technique renseignée pour ces articles. Consultez la boutique avant de choisir."
                          en="No technical specifications are provided for these products. Ask the shop before choosing."
                        />
                      </p>
                    )}
                    {onlyDifferences &&
                      rows.length > 0 &&
                      !differences.length && (
                        <p role="status">
                          <Copy
                            fr="Aucune différence technique établie dans les champs renseignés. Cela ne prouve pas la compatibilité."
                            en="No technical differences are established in the provided fields. This does not prove compatibility."
                          />
                        </p>
                      )}
                  </>
                )}
              </>
            )}
          </>
        )}
        <div className="e-comparison-end">
          <p>
            <Copy
              fr="Une caractéristique manque pour votre montage ?"
              en="Missing a specification for your circuit?"
            />
          </p>
          <Link to="/contact">
            <Copy
              fr="Demander conseil à la boutique"
              en="Ask the shop for advice"
            />
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
