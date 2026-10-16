import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Photo } from "./ProductPrimitives";
import "./product-viewer.css";

// Mounted only when opened: the original photo is downloaded on demand.
export default function ProductViewer({ product, initial = 0, onClose, onSelect }) {
  const dialog = useRef(null), stage = useRef(null), pointer = useRef(null);
  const [active, setActive] = useState(initial), [zoomed, setZoomed] = useState(false);
  const { lang } = useI18n();
  const images = product.images.length ? product.images : [product.image];
  const name = lang === "en" && product.englishName ? product.englishName : product.model;
  const tr = (fr, en) => lang === "fr" ? fr : en;
  useEffect(() => {
    const node = dialog.current, opener = document.activeElement;
    const previous = document.body.style.overflow;
    node.showModal(); document.body.style.overflow = "hidden";
    return () => {
      node.close(); document.body.style.overflow = previous;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  useEffect(() => {
    const node = stage.current;
    node.scrollTo({ left: zoomed ? (node.scrollWidth - node.clientWidth) / 2 : 0, top: zoomed ? (node.scrollHeight - node.clientHeight) / 2 : 0, behavior: "auto" });
  }, [zoomed, active]);
  function select(index) {
    setActive(index); setZoomed(false); onSelect(index);
  }
  const move = direction => select((active + direction + images.length) % images.length);
  return <dialog ref={dialog} className="e-product-viewer" aria-label={tr("Visionneuse : ", "Image viewer: ") + name}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (images.length > 1 && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1);
      }
    }}>
    <header className="e-viewer-head"><div><strong>{name}</strong><span aria-live="polite">{active + 1} / {images.length}</span></div>
      <button type="button" onClick={onClose} aria-label={tr("Fermer la visionneuse", "Close image viewer")}><X size={24} /></button>
    </header>
    <div ref={stage} className={"e-viewer-stage" + (zoomed ? " is-zoomed" : "")}
      onTouchStart={event => { if (event.touches.length === 1) pointer.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
      onTouchEnd={event => {
        if (!zoomed && images.length > 1 && pointer.current && event.changedTouches.length === 1) {
          const dx = event.changedTouches[0].clientX - pointer.current.x, dy = event.changedTouches[0].clientY - pointer.current.y;
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
        }
        pointer.current = null;
      }}>
      <div className="e-viewer-canvas"><Photo key={images[active]} product={{ ...product, image: images[active] }} eager /></div>
    </div>
    <footer className="e-viewer-controls">
      {images.length > 1 && <button type="button" onClick={() => move(-1)} aria-label={tr("Vue précédente", "Previous view")}><ChevronLeft /></button>}
      <button type="button" className="e-viewer-zoom" aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>{zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}{zoomed ? tr("Vue complète", "Fit image") : tr("Zoom 150 %", "Zoom 150%")}</button>
      {images.length > 1 && <button type="button" onClick={() => move(1)} aria-label={tr("Vue suivante", "Next view")}><ChevronRight /></button>}
    </footer>
    {images.length > 1 && <nav className="e-viewer-thumbs" aria-label={tr("Choisir une vue", "Choose a view")}>
      {images.map((image, index) => <button type="button" key={image} aria-label={tr("Vue ", "View ") + (index + 1)} aria-pressed={active === index} onClick={() => select(index)}>
        <Photo product={{ ...product, image }} thumbnail sizes="64px" />
      </button>)}
    </nav>}
  </dialog>;
}
