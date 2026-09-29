import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ImageOff, ShoppingCart, Heart, X } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { formatFCFA } from "../utils/formatFCFA";
import { stockState, canBuy } from "./productData";

export function Copy({ fr, en }) {
  const { lang } = useI18n();
  return lang === "en" ? en : fr;
}
export function Photo({ product, eager = false }) {
  const [failed, setFailed] = useState("");
  return product.image && failed !== product.image ? (
    <img
      src={product.image}
      alt={product.model}
      loading={eager ? "eager" : "lazy"}
      width="400"
      height="400"
      onError={() => setFailed(product.image)}
    />
  ) : (
    <div className="e-placeholder">
      <ImageOff aria-hidden="true" />
      <span>
        <Copy fr="Visuel en préparation" en="Image coming soon" />
      </span>
    </div>
  );
}
export function Price({ value }) {
  return (
    <span className="e-price">
      {value > 0 ? (
        formatFCFA(value)
      ) : (
        <Copy fr="Prix à confirmer" en="Price to confirm" />
      )}
    </span>
  );
}
export function Stock({ product }) {
  const state = stockState(product);
  const names = {
    ok: ["En stock", "In stock"],
    low: ["Stock faible", "Low stock"],
    out: ["Rupture", "Out of stock"],
    unknown: ["À confirmer", "To confirm"],
  };
  return (
    <span className={`e-stock e-stock--${state}`}>
      <Copy fr={names[state][0]} en={names[state][1]} />
    </span>
  );
}
export function Modal({ open, onClose, title, children }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (dialog.open) dialog.close();
      if (opener?.isConnected && typeof opener.focus === "function")
        opener.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="e-modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="e-modal-head">
        <h2>{title}</h2>
        <button
          className="e-icon"
          onClick={onClose}
          aria-label="Fermer / Close"
        >
          <X />
        </button>
      </div>
      <div className="e-modal-body">{children}</div>
    </dialog>
  );
}
export function State({ loading, error, retry, children }) {
  if (loading)
    return (
      <div className="e-state" role="status">
        <Copy fr="Chargement des références…" en="Loading products…" />
        <div className="e-skeleton" />
      </div>
    );
  if (error)
    return (
      <div className="e-state" role="alert">
        <h2>
          <Copy
            fr="Impossible de charger le catalogue"
            en="Unable to load the catalogue"
          />
        </h2>
        <p>
          <Copy
            fr="Vérifiez votre connexion puis réessayez. Votre recherche est conservée."
            en="Check your connection and try again. Your search has been kept."
          />
        </p>
        <button className="e-btn" onClick={retry}>
          <Copy fr="Réessayer" en="Try again" />
        </button>
      </div>
    );
  return children;
}
export function Crumbs({ title }) {
  return (
    <nav className="e-crumbs" aria-label="Breadcrumb">
      <Link to="/">
        <Copy fr="Accueil" en="Home" />
      </Link>
      <span>/</span>
      <span>{title}</span>
    </nav>
  );
}
export function Card({ product }) {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { lang } = useI18n();
  const name =
    lang === "en" && product.englishName ? product.englishName : product.model;
  return (
    <article className="e-card">
      <div className="e-card-image">
        <Link to={`/product/${product.id}`}>
          <Photo product={product} />
        </Link>
        <button
          className="e-favorite"
          aria-label={
            lang === "fr" ? `Favoris : ${name}` : `Favourite: ${name}`
          }
          aria-pressed={isFavorite(product.code)}
          onClick={() => toggleFavorite(product)}
        >
          <Heart
            size={18}
            fill={isFavorite(product.code) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="e-card-body">
        <Stock product={product} />
        <h3>
          <Link to={`/product/${product.id}`}>{name}</Link>
        </h3>
        <p className="e-reference">
          {product.reference || product.brand || product.categoryName}
        </p>
        {product.attributes?.[0] && (
          <p className="e-attribute">{product.attributes[0].join(" : ")}</p>
        )}
        <div className="e-card-buy">
          <Price value={product.retailPrice} />
          {canBuy(product) ? (
            <button
              className="e-icon e-add"
              aria-label={`${lang === "fr" ? "Ajouter" : "Add"} ${name}`}
              onClick={() => addToCart(product, 1)}
            >
              <ShoppingCart size={18} />
            </button>
          ) : (
            <Link className="e-card-help" to="/contact">
              <Copy fr="Se renseigner" en="Ask us" />
            </Link>
          )}
        </div>
        {product.wholesalePrice > 0 && (
          <p className="e-volume">
            <Copy
              fr="Conditions par quantité sur la fiche"
              en="Volume terms on the product page"
            />
          </p>
        )}
      </div>
    </article>
  );
}
