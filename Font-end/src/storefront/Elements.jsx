import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Copy } from "./ProductPrimitives";
import { stockState } from "./productData";
import './commercial.css';

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

export { Copy, Photo, Price } from "./ProductPrimitives";
export { default as Card } from "./ProductCard";
