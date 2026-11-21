import EquivalenceEntry from "./EquivalenceEntry";
import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "./LocaleRouter";
import PageMeta from "./PageMeta";
import { ShoppingCart, ZoomIn, FileText } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useCart } from "../context/CartContext";
import { resolveImageUrl } from "../utils/mapProduct";
import { formatFCFA } from "../utils/formatFCFA";
import { adaptProduct, canBuy, stockState } from "./productData";
import useResource from "./useResource";
import {
  Card,
  Copy,
  Crumbs,
  Photo,
  Price,
  State,
  Stock,
} from "./Elements";
import Footer from "./Footer";
import ProductAdvice from "./ProductAdvice";
import { ReceptionSummary } from "./ReceptionChoice";
import ComparisonAction, { ComparisonLink } from "./ComparisonAction";
import OfferDetails from "./OfferDetails";
import ProductReviews from "./ProductReviews";
import TechnicalSource from "./TechnicalSource";
import ProductEditorial from './ProductEditorial.jsx';
import { isWebsiteHomepage } from './productEditorial.js';
import { useJourneyObservation } from "./useJourney.js";
import { productSchemaJSON } from './productSchema.js';
import { seoFamilies, familyPath } from './seoFamilies.js';
import { productText, getProductTranslation } from './productTranslation.js';
const ProductViewer = lazy(() => import("./ProductViewer"));

function Detail({ product }) {
  const [quantity, setQuantity] = useState(1),
    [active, setActive] = useState(0),
    [zoom, setZoom] = useState(false);
  const { addToCart } = useCart();
  const { lang } = useI18n();
  useJourneyObservation("FICHE_OUVERTE", Boolean(product.id), product.id, lang);
  const related = useResource(
    "/produits?limit=5" +
      (product.categoryId
        ? "&categoryId=" + encodeURIComponent(product.categoryId)
        : ""),
  );
  const relatedRows = (
    Array.isArray(related.data) ? related.data : related.data?.data || []
  )
    .filter((p) => p.id !== product.id)
    .slice(0, 4);
  const buy = canBuy(product);
  const stock = stockState(product);
  const { name, description } = productText(product, lang);
  const chosen = { ...product, image: product.images[active] || product.image };
  const family = seoFamilies.find(f => f.category === product.categoryId && f.subcategory === product.subcategoryId);
  const purchase = (
    <>
      {buy ? (
        <button className="e-btn" onClick={() => addToCart(product, quantity)}>
          <ShoppingCart size={19} />
          <Copy fr="Ajouter au panier" en="Add to cart" />
        </button>
      ) : (
        <Link className="e-btn e-secondary" to="/contact">
          <Copy
            fr={
              stock === "out"
                ? "Produit indisponible — nous contacter"
                : !(product.retailPrice > 0)
                  ? "Demander le prix"
                : "Faire confirmer la disponibilité"
            }
            en={
              stock === "out"
                ? "Unavailable — contact us"
                : !(product.retailPrice > 0)
                  ? "Ask for the price"
                : "Confirm availability"
            }
          />
        </Link>
      )}
    </>
  );
  return (
    <>
      <PageMeta translated={Boolean(getProductTranslation(product))} title={`${name} — X-Electronic`} description={description?.slice(0, 155) || `${name} — X-Electronic, ${lang === 'en' ? 'the NEWOTEG electronics shop.' : 'la boutique électronique de NEWOTEG.'}`} />
      <script type="application/ld+json" data-product-schema="true" dangerouslySetInnerHTML={{ __html: productSchemaJSON(product, lang) }} />
      <div className="e-wrap e-product-page">
        <Crumbs title={name} />
        <div className="e-product-layout">
          <section
            className="e-gallery"
            aria-label={lang === "fr" ? "Photos du produit" : "Product photos"}
          >
            <button
              className="e-main-photo"
              disabled={!chosen.image}
              onClick={() => setZoom(true)}
              aria-label={
                lang === "fr" ? "Agrandir le visuel" : "Enlarge image"
              }
            >
              <Photo product={{...chosen,model:name}} eager thumbnail detail sizes="(max-width: 760px) 95vw, 600px" />
              {chosen.image && (
                <span>
                  <ZoomIn size={17} />
                  <Copy fr="Agrandir" en="Enlarge" />
                </span>
              )}
            </button>
            {product.images.length > 1 && (
              <div className="e-thumbs">
                {product.images.map((image, i) => (
                  <button
                    key={image}
                    aria-label={`${lang === "fr" ? "Vue" : "View"} ${i + 1}`}
                    aria-pressed={active === i}
                    onClick={() => setActive(i)}
                  >
                    <Photo product={{ ...product, model:name, image }} thumbnail sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="e-product-info">
            <Stock product={product} />
            <h1>{name}</h1>
            <p className="e-reference">
              {product.reference
                ? `${lang === "fr" ? "Référence" : "Reference"} : ${product.reference}`
                : product.brand || product.categoryName}
            </p>
            {description && (
              <p className="e-description">{description}</p>
            )}
            {product.categoryId && <nav className="e-catalogue-subfamilies" aria-label={lang === "fr" ? "Classement du produit" : "Product categories"}>
              <Link to={`/catalogue?category=${encodeURIComponent(product.categoryId)}`}>{product.categoryName}</Link>
              {product.subcategoryId && <Link to={family ? familyPath(family) : `/catalogue?category=${encodeURIComponent(product.categoryId)}&sub=${encodeURIComponent(product.subcategoryId)}`}>{product.subcategoryName}</Link>}
            </nav>}
            <section className="e-specs">
              <h2>
                <Copy fr="Les repères essentiels" en="Key specifications" />
              </h2>
              <dl>
                {[
                  [
                    lang === "fr" ? "Famille" : "Category",
                    product.categoryName,
                  ],
                  [lang === "fr" ? "Marque" : "Brand", product.brand],
                ]
                  .filter(([, v]) => v)
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                {(product.technicalAttributes || []).map((a, i) => (
                  <div key={`${a.label}-${i}`}>
                    <dt>{a.label}</dt>
                    <dd>{a.values.map((v, j) => <div className="e-technical-value" key={j}>{v.value}<TechnicalSource source={v.source} /></div>)}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <div className="e-product-price">
              <Price value={product.retailPrice} />
              <span>
                <Copy fr="Prix unitaire" en="Unit price" />
              </span>
            </div>
            <OfferDetails product={product} />
            {product.wholesalePrice > 0 && (
              <p className="e-note e-volume-note">
                <Copy fr="Tarif gros" en="Wholesale price" /> :{" "}
                {formatFCFA(product.wholesalePrice)}
                {product.wholesaleMinimum
                  ? ` · ${lang === "fr" ? "Dès" : "From"} ${product.wholesaleMinimum} ${lang === "fr" ? "unités" : "units"}`
                  : null}
                .{" "}
                <Copy
                  fr="Faites confirmer les conditions auprès de la boutique avant l’achat. Le panier utilise le prix unitaire affiché."
                  en="Confirm volume terms with the shop before purchasing. The cart uses the displayed unit price."
                />
              </p>
            )}
            <div className="e-purchase">
              <div className="e-quantity">
                <button
                  disabled={!buy || quantity <= 1}
                  aria-label={
                    lang === "fr" ? "Diminuer la quantité" : "Decrease quantity"
                  }
                  onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                >
                  −
                </button>
                <output>{quantity}</output>
                <button
                  disabled={!buy || quantity >= product.stock}
                  aria-label={
                    lang === "fr"
                      ? "Augmenter la quantité"
                      : "Increase quantity"
                  }
                  onClick={() =>
                    setQuantity((n) => Math.min(product.stock, n + 1))
                  }
                >
                  +
                </button>
              </div>
              {purchase}
            </div>
            <ReceptionSummary />
            <ProductAdvice product={product} quantity={quantity} />
            <div className="e-product-comparison">
              <ComparisonAction product={product} />
              <ComparisonLink />
            </div>
            {product.urlDatasheet && (
              <a
                className="e-datasheet"
                href={product.urlDatasheet}
                target="_blank"
                rel="noreferrer"
              >
                <FileText size={20} />
                {isWebsiteHomepage(product.urlDatasheet)
                  ? <Copy fr="Consulter le site indiqué" en="Open listed website" />
                  : <Copy fr="Voir la fiche technique" en="View datasheet" />}
              </a>
            )}
          </section>
        </div>
        <ProductEditorial product={product} />
        <EquivalenceEntry query={name} productId={product.id} />
        <ProductReviews key={product.id} productId={product.id} />
        {relatedRows.length > 0 && (
          <section className="e-section">
            <h2>
              <Copy fr="Dans la même famille" en="In the same category" />
            </h2>
            <p>
              <Copy
                fr="Comparez les caractéristiques : ces articles ne sont pas des équivalents garantis."
                en="Compare specifications: these products are not guaranteed equivalents."
              />
            </p>
            <div className="e-product-grid">
              {relatedRows.map((raw) => (
                <Card
                  key={raw.id}
                  product={adaptProduct(raw, resolveImageUrl)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <aside className="e-buy-fixed">
        <Price value={product.retailPrice} />
        {purchase}
      </aside>
      {zoom && <Suspense fallback={<div className="e-viewer-loading" role="status"><Copy fr="Ouverture de l’image…" en="Opening image…" /></div>}>
        <ProductViewer product={product} initial={active} onSelect={setActive} onClose={() => setZoom(false)} />
      </Suspense>}
      <Footer />
    </>
  );
}
export default function Product() {
  const { id } = useParams();
  const { lang } = useI18n();
  const resource = useResource("/produits/" + encodeURIComponent(id), true);
  const missing = resource.error?.response?.status === 404 || (lang === 'en' && resource.data &&
    !getProductTranslation(adaptProduct(resource.data, resolveImageUrl)));
  return missing ? (
    <>
      <PageMeta title={`${lang === "en" ? "Product not found" : "Produit introuvable"} — X-Electronic`} noindex />
      <div className="e-wrap e-state">
        <h1>
          <Copy fr="Ce produit est introuvable" en="Product not found" />
        </h1>
        <Link className="e-btn" to="/catalogue">
          <Copy fr="Retour au catalogue" en="Back to catalogue" />
        </Link>
      </div>
      <Footer />
    </>
  ) : (
    <State {...resource}>
      {resource.data && (
        <Detail
          key={id}
          product={adaptProduct(resource.data, resolveImageUrl)}
        />
      )}
    </State>
  );
}
