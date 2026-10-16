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
    let frame;
    const update = () => { frame = undefined; const start = node.scrollLeft <= 2, end = node.scrollLeft + node.clientWidth >= node.scrollWidth - 2; setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end }); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(node); window.addEventListener("resize", schedule); node.addEventListener("scroll", schedule, { passive: true });
    node.scrollLeft = 0; update();
    return () => { observer?.disconnect(); window.removeEventListener("resize", schedule); node.removeEventListener("scroll", schedule); if (frame) cancelAnimationFrame(frame); };
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
    <div ref={ref} id={id} className="e-carousel-track" role="region" aria-label={label} tabIndex={0} onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      if (["ArrowRight", "ArrowLeft"].includes(event.key)) { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
      if (["Home", "End"].includes(event.key)) { event.preventDefault(); ref.current.scrollTo({ left: event.key === "Home" ? 0 : ref.current.scrollWidth, behavior: "auto" }); }
    }}>
      {products.map(p => <div className="e-carousel-item" key={p.id}>
        {arrival && p.arrivalDate && <p className="e-arrival-date"><time dateTime={p.arrivalDate}>{new Intl.DateTimeFormat(lang === "fr" ? "fr-CM" : "en-CM", { dateStyle: "medium", timeZone: "Africa/Douala" }).format(new Date(p.arrivalDate))}</time></p>}
        <ProductCard product={p} compare={false} imageSizes="(max-width: 760px) 80vw, (max-width: 1199px) 33vw, 260px" />
      </div>)}
    </div>
  </div>;
}
