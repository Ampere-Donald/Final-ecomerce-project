import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, ArrowRight, Search } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useFavorites } from "../context/FavoritesContext";
import { Copy, Photo, Price } from "./Elements";
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
  const price = selectionPrice(product);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const end = Date.parse(product.offer?.end);
    if (!Number.isFinite(end) || end <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(end - Date.now() + 1, 1), 2147483647));
    return () => clearTimeout(timer);
  }, [product.offer?.end, now]);
  const offer = product.offer && price === product.offer.price && Date.parse(product.offer.end) > now && product.offer.cataloguePrice > price ? product.offer : null;
  return <article className="e-home-product">
    <div className="e-home-product-photo">
      <Link to={"/product/" + product.id} aria-label={name}><Photo product={product} thumbnail /></Link>
      <button className="e-home-product-heart" aria-label={(lang === "fr" ? "Favoris : " : "Favourite: ") + name} aria-pressed={isFavorite(product.code)} onClick={() => toggleFavorite(product)}><Heart size={18} fill={isFavorite(product.code) ? "currentColor" : "none"} /></button>
    </div>
    <div className="e-home-product-body">
      <span className={"e-home-stock e-home-stock-" + state}><i aria-hidden="true" /><Copy fr={labels[state][0]} en={labels[state][1]} /></span>
      <h3><Link to={"/product/" + product.id}>{name}</Link></h3>
      <p className="e-home-product-reference">{product.reference ? <><Copy fr="Réf. " en="Ref. " />{product.reference}</> : product.brand || product.categoryName || <Copy fr="Référence à confirmer" en="Reference to confirm" />}</p>
      <div className="e-home-product-prices">
        <div className="e-home-product-promo">{offer && <><del>{formatFCFA(offer.cataloguePrice)}</del><span>−{Math.round((1 - price / offer.cataloguePrice) * 100)} %</span></>}</div>
        <Price value={price} />
      </div>
      <Link className={"e-home-product-cta" + (action.equivalent ? " e-home-product-equivalent" : "")} to={action.to}>{action.equivalent ? <Search size={16} /> : <ShoppingCart size={16} />}<Copy fr={action.equivalent ? "Voir les équivalents" : "Voir le produit"} en={action.equivalent ? "View alternatives" : "View product"} /><ArrowRight size={16} /></Link>
    </div>
  </article>;
}
