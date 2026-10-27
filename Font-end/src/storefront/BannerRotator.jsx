import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useMotionPreferences } from './motionPreferences';

// Small, editorial rotation. No slider dependency, off-screen timer or autoplay
// after an interaction. The user can explicitly resume it.
export default function BannerRotator({ slides, initial = 0 }) {
  const root = useRef(null), touch = useRef(null);
  const [active, setActive] = useState(initial), [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false), [hovered, setHovered] = useState(false);
  // Stable initial markup for prerendered home HTML and client hydration.
  const [hidden, setHidden] = useState(false), [reduced, setReduced] = useState(false);
  const { lang } = useI18n();
  const motion = useMotionPreferences();
  const tr = (fr, en) => lang === "fr" ? fr : en;
  useEffect(() => {
    const node = root.current;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .35 });
    observer.observe(node);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches), visibility = () => setHidden(document.hidden);
    motion(); visibility();
    if (media.addEventListener) media.addEventListener("change", motion); else media.addListener(motion);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); if (media.removeEventListener) media.removeEventListener("change", motion); else media.removeListener(motion); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (!motion.ready || motion.paused || motion.reduced || !playing || !visible || hovered || hidden || reduced || slides.length < 2) return;
    const timer = setTimeout(() => setActive(i => (i + 1) % slides.length), 9000);
    return () => clearTimeout(timer);
  }, [active, playing, visible, hovered, hidden, reduced, slides.length, motion.ready, motion.paused, motion.reduced]);
  function choose(index) { setPlaying(false); setActive((index + slides.length) % slides.length); }
  return <section ref={root} className="e-banner-rotator" data-rotation={motion.ready && !motion.paused && !motion.reduced && playing && visible && !hovered && !hidden && !reduced ? "running" : "paused"} role="region" aria-roledescription={tr("carrousel", "carousel")} aria-label={tr("À découvrir en boutique", "Explore the shop")}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={event => { if (!event.target.closest('[data-rotation-toggle]')) setPlaying(false); }}
    onTouchStart={event => { setPlaying(false); if (event.touches.length === 1) touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
    onTouchEnd={event => {
      if (touch.current && event.changedTouches.length === 1) {
        const dx = event.changedTouches[0].clientX - touch.current.x, dy = event.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)*1.5) choose(active + (dx < 0 ? 1 : -1));
      }
      touch.current = null;
    }}>
    <div className="e-banner-slides" aria-live={playing && !reduced ? "off" : "polite"}>
      {slides.map((slide, i) => <div key={i} className={"e-banner-slide" + (active === i ? " is-active" : "")} aria-hidden={i !== active} inert={i !== active} role="group" aria-label={`${i + 1} / ${slides.length}`}>{slide}</div>)}
    </div>
    <div className="e-banner-controls">
      <button type="button" onClick={() => choose(active - 1)} aria-label={tr("Bannière précédente", "Previous banner")}><ChevronLeft size={18} /></button>
      <div className="e-banner-dots">{slides.map((_, i) => <button type="button" key={i} onClick={() => choose(i)} aria-label={tr("Afficher la bannière ", "Show banner ") + (i+1)} aria-pressed={active === i}><span /></button>)}</div>
      <button type="button" onClick={() => choose(active + 1)} aria-label={tr("Bannière suivante", "Next banner")}><ChevronRight size={18} /></button>
      {!reduced && <button type="button" data-rotation-toggle disabled={!motion.ready || motion.paused} aria-label={playing ? tr("Suspendre les bannières", "Pause banners") : tr("Reprendre les bannières", "Resume banners")} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>}
    </div>
  </section>;
}
