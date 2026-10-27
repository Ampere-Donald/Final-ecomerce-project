import { Children, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useMotionPreferences } from './motionPreferences';
import './product-rail.css';

const dwellMs = 6500;
export default function ProductRail({ children, label, trackClass = '' }) {
  const root = useRef(null), track = useRef(null), id = useId();
  const items = Children.toArray(children), count = items.length;
  const { lang } = useI18n();
  const motion = useMotionPreferences();
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState({ start: true, end: true, first: 1, last: count });
  const allowed = motion.ready && !motion.reduced && !motion.paused;
  const running = allowed && playing && visible && !hidden && !hovered && !position.end;
  const tr = (fr, en) => lang === 'fr' ? fr : en;
  function halt() {
    const node = track.current;
    if (node) node.scrollTo({ left: node.scrollLeft, behavior: 'auto' });
  }
  function pause() { setPlaying(false); halt(); }
  function move(direction, automatic = false) {
    const node = track.current, card = node?.firstElementChild;
    if (!card) return;
    if (!automatic) pause();
    const style = getComputedStyle(node);
    const gap = parseFloat(style.columnGap) || parseFloat(style.gridColumnGap) || 0;
    const step = card.getBoundingClientRect().width + gap;
    node.scrollBy({ left: direction * step, behavior: allowed ? 'smooth' : 'auto' });
  }
  useEffect(() => {
    const node = track.current;
    let frame;
    const update = () => {
      frame = undefined;
      const card = node.firstElementChild;
      const style = getComputedStyle(node);
      const step = card ? card.getBoundingClientRect().width + (parseFloat(style.columnGap) || parseFloat(style.gridColumnGap) || 0) : 1;
      const first = Math.min(count, Math.max(1, Math.round(node.scrollLeft / step) + 1));
      const last = Math.min(count, Math.max(first, Math.floor((node.scrollLeft + node.clientWidth + 2) / step) + 1));
      const next = { start: node.scrollLeft <= 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2, first, last };
      setPosition(previous => Object.keys(next).every(key => previous[key] === next[key]) ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(node);
    node.scrollTo({ left: 0, behavior: 'auto' });
    update();
    node.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      observer?.disconnect(); node.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
      node.scrollTo({ left: node.scrollLeft, behavior: 'auto' });
    };
  }, [count]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    visibility(); document.addEventListener('visibilitychange', visibility);
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= .6), { threshold: [0, .6] }) : null;
    observer?.observe(root.current);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!running) { halt(); return; }
    const timer = setTimeout(() => move(1, true), dwellMs);
    return () => clearTimeout(timer);
    // Only a settled item/running state starts a new reading interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, position.first]);
  return <div ref={root} className="e-product-rail" data-rotation={running ? 'running' : 'paused'}
    role="region" aria-roledescription={tr('carrousel', 'carousel')} aria-label={label}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onFocusCapture={event => { if (!event.target.closest('[data-rail-play]')) pause(); }}>
    <div ref={track} id={id} className={`e-product-rail-track ${trackClass}`} tabIndex={0}
      role="group" aria-label={tr('Produits, défilement horizontal', 'Products, horizontal scrolling')}
      onPointerDown={pause} onWheel={pause} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
        if (['Home', 'End'].includes(event.key)) { event.preventDefault(); pause(); track.current.scrollTo({ left: event.key === 'Home' ? 0 : track.current.scrollWidth, behavior: 'auto' }); }
      }}>
      {items.map((item, index) => <div className="e-rail-item" key={item.key || index}>{item}</div>)}
    </div>
    <div className="e-rail-toolbar">
      <span className="e-rail-position" aria-live="off">{position.first}–{position.last} <span>/ {count}</span></span>
      <div className="e-rail-controls" aria-label={tr('Navigation des produits', 'Product navigation')}>
        {!motion.reduced && count > 2 && <button type="button" data-rail-play aria-controls={id}
          disabled={!motion.ready || motion.paused || (position.start && position.end)}
          aria-label={playing && !position.end ? tr('Suspendre le défilement', 'Pause product rotation') : tr('Reprendre le défilement', 'Resume product rotation')}
          onClick={() => {
            if (playing && !position.end) pause();
            else { if (position.end) track.current.scrollTo({ left: 0, behavior: 'auto' }); setPlaying(true); }
          }}>{playing && !position.end ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>}
        <button type="button" aria-controls={id} disabled={position.start} onClick={() => move(-1)} aria-label={tr('Produits précédents', 'Previous products')}><ChevronLeft size={19} aria-hidden="true" /></button>
        <button type="button" aria-controls={id} disabled={position.end} onClick={() => move(1)} aria-label={tr('Produits suivants', 'Next products')}><ChevronRight size={19} aria-hidden="true" /></button>
      </div>
    </div>
  </div>;
}
