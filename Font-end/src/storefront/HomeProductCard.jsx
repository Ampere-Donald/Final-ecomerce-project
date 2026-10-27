import "./home-selection-premium.css";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, ArrowRight, Search } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useFavorites } from "../context/FavoritesContext";
import { Copy, Photo, Price } from "./ProductPrimitives";
import { stockState } from "./productData";
import { selectionAction, selectionPrice } from "./homeSelectionData";

import { formatFCFA } from "../utils/formatFCFA";
export default function HomeProductCard({ product }) {
  const { lang } = useI18n();
  const { toggleFavorite, isFavorite } = useFavorites();
  const name = lang === "en" && product.englishName ? product.englishName : product.model;
  const state = stockState(product);
  const labels = { ok: ["En stock", "In stock"], low: ["Stock faible", "Low stock"], out: ["Rupture de stock", "Out of stock"], unknown: ["À confirmer", "To confirm"] };
  const action = selectionAction(product);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const end = Date.parse(product.offer?.end);
    if (!Number.isFinite(end) || end <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(end - Date.now() + 1, 1), 2147483647));
    return () => clearTimeout(timer);
  }, [product.offer?.end, now]);
  const price = selectionPrice(product, now);
  const offer = product.offer && price === product.offer.price && Date.parse(product.offer.end) > now && product.offer.cataloguePrice > price ? product.offer : null;
  return <article className="e-selection-card">
    <div className="e-selection-photo">
      <Link to={"/product/" + product.id} aria-label={name}><Photo product={product} thumbnail sizes="(max-width: 760px) 45vw, (max-width: 1199px) 30vw, 260px" /></Link>
      <button className="e-selection-heart" aria-label={(lang === "fr" ? "Favoris : " : "Favourite: ") + name} aria-pressed={isFavorite(product.code)} onClick={() => toggleFavorite(product)}><Heart size={18} fill={isFavorite(product.code) ? "currentColor" : "none"} /></button>
    </div>
    <div className="e-selection-body">
      <span className={"e-selection-stock e-selection-stock-" + state}><i aria-hidden="true" /><Copy fr={labels[state][0]} en={labels[state][1]} /></span>
      <h3 title={name}><Link to={"/product/" + product.id}>{name}</Link></h3>
      <p className="e-selection-reference">{product.reference ? <><Copy fr="Réf. " en="Ref. " />{product.reference}</> : product.brand || product.categoryName || <Copy fr="Référence à confirmer" en="Reference to confirm" />}</p>
      <div className="e-selection-prices">
        <div className="e-selection-promo">{offer && <><del aria-label={(lang === "fr" ? "Prix catalogue hors offre : " : "Catalogue price outside offer: ") + formatFCFA(offer.cataloguePrice)}>{formatFCFA(offer.cataloguePrice)}</del><span>−{Math.round((1 - price / offer.cataloguePrice) * 100)} %</span></>}</div>
        <Price value={price} />
      </div>
      <Link className={"e-selection-cta" + (action.equivalent ? " e-selection-equivalent" : "")} to={action.to}>{action.equivalent ? <Search size={16} /> : <ShoppingCart size={16} />}<Copy fr={action.equivalent ? "Voir les équivalents" : "Voir le produit"} en={action.equivalent ? "View alternatives" : "View product"} /><ArrowRight size={16} /></Link>
      
    </div>
  </article>;
}

