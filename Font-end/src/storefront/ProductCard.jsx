import "./home-selection.css";
import "./product-card.css";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, ArrowRight, Search } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useFavorites } from "../context/FavoritesContext";
import { Copy, Photo, Price } from "./ProductPrimitives";
import { stockState } from "./productData";
import { selectionAction, selectionPrice } from "./homeSelectionData";
import ComparisonAction from "./ComparisonAction";
import { formatFCFA } from "../utils/formatFCFA";
import { InitialResourceContext } from "./initialResourceContext";
export default function ProductCard({ product, eager = false, compare = true, imageSizes }) {
  const { lang } = useI18n();
  const { toggleFavorite, isFavorite } = useFavorites();
  const name = lang === "en" && product.englishName ? product.englishName : product.model;
  const state = stockState(product);
  const labels = { ok: ["En stock", "In stock"], low: ["Stock faible", "Low stock"], out: ["Rupture de stock", "Out of stock"], unknown: ["Disponibilité à confirmer", "Availability to confirm"] };
  const action = selectionAction(product);
  const initial = useContext(InitialResourceContext);
  const [now, setNow] = useState(() => initial?.at ?? Date.now());
  const price = selectionPrice(product, now);
  useEffect(() => {
    const end = Date.parse(product.offer?.end);
    if (!Number.isFinite(end) || end <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(end - Date.now() + 1, 1), 2147483647));
    return () => clearTimeout(timer);
  }, [product.offer?.end, now]);
  const offer = product.offer && price === product.offer.price && Date.parse(product.offer.end) > now && product.offer.cataloguePrice > price ? product.offer : null;
  return <article className="e-card e-product-card e-home-product">
    <div className="e-home-product-photo">
      <Link to={"/product/" + product.id} aria-label={name}><Photo product={product} eager={eager} thumbnail sizes={imageSizes} /></Link>
      <button className="e-home-product-heart" aria-label={(lang === "fr" ? "Favoris : " : "Favourite: ") + name} aria-pressed={isFavorite(product.code)} onClick={() => toggleFavorite(product)}><Heart size={18} fill={isFavorite(product.code) ? "currentColor" : "none"} /></button>
    </div>
    <div className="e-home-product-body">
      <span className={"e-home-stock e-home-stock-" + state}><i aria-hidden="true" /><Copy fr={labels[state][0]} en={labels[state][1]} /></span>
      <h3 title={name}><Link to={"/product/" + product.id}>{name}</Link></h3>
      <p className="e-home-product-reference">{product.reference ? <><Copy fr="Réf. " en="Ref. " />{product.reference}</> : product.brand || product.categoryName || <Copy fr="Référence à confirmer" en="Reference to confirm" />}</p>
      <div className="e-home-product-prices">
        <div className="e-home-product-promo">{offer && <><small><Copy fr="Catalogue " en="Catalogue " /></small><del aria-label={(lang === "fr" ? "Prix catalogue hors offre : " : "Catalogue price outside offer: ") + formatFCFA(offer.cataloguePrice)}>{formatFCFA(offer.cataloguePrice)}</del><span>−{Math.round((1 - price / offer.cataloguePrice) * 100)} %</span></>}</div>
        <Price value={price} />
      </div>
      <Link className={"e-home-product-cta" + (action.equivalent ? " e-home-product-equivalent" : "")} to={action.to}>{action.equivalent ? <Search size={16} /> : <ShoppingCart size={16} />}<Copy fr={action.equivalent ? "Voir les équivalents" : "Voir le produit"} en={action.equivalent ? "View alternatives" : "View product"} /><ArrowRight size={16} /></Link>
      {compare && <ComparisonAction product={product} />}
    </div>
  </article>;
}
