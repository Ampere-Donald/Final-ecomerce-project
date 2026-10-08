import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import ProductCard from "./ProductCard";
import "./merchandising.css";
export default function ProductCarousel({ products, label, arrival = false }) {
  const ref = useRef(), id = useId();
  const { lang } = useI18n();
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const node = ref.current;
    const update = () => setEdges({ start: node.scrollLeft <= 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(node); node.addEventListener("scroll", update, { passive: true }); update();
    return () => { observer.disconnect(); node.removeEventListener("scroll", update); };
  }, [products]);
  function move(direction) {
    const node = ref.current, card = node.firstElementChild;
    if (!card) return;
    const step = card.getBoundingClientRect().width + (parseFloat(getComputedStyle(node).columnGap) || 0);
    const visible = Math.max(1, Math.floor((node.clientWidth + (parseFloat(getComputedStyle(node).columnGap) || 0) + 1) / step));
    node.scrollBy({ left: direction * step * visible, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return <div className="e-carousel">
    <div className="e-carousel-controls" aria-label={lang === "fr" ? "Navigation des produits" : "Product navigation"}>
      <button type="button" aria-controls={id} aria-label={lang === "fr" ? "Produits précédents" : "Previous products"} disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={19} /></button>
      <button type="button" aria-controls={id} aria-label={lang === "fr" ? "Produits suivants" : "Next products"} disabled={edges.end} onClick={() => move(1)}><ChevronRight size={19} /></button>
    </div>
    <div ref={ref} id={id} className="e-carousel-track" role="region" aria-label={label} tabIndex={0}>
      {products.map(p => <div className="e-carousel-item" key={p.id}>
        {arrival && p.arrivalDate && <p className="e-arrival-date"><time dateTime={p.arrivalDate}>{new Intl.DateTimeFormat(lang === "fr" ? "fr-CM" : "en-CM", { dateStyle: "medium", timeZone: "Africa/Douala" }).format(new Date(p.arrivalDate))}</time></p>}
        <ProductCard product={p} compare={false} imageSizes="(max-width: 760px) 80vw, (max-width: 1199px) 33vw, 260px" />
      </div>)}
    </div>
  </div>;
}
