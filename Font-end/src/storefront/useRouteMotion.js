import { useEffect } from 'react';
import { useMotionPreferences } from './motionPreferences';

// Progressive enhancement: no hidden class, no content dependency on an observer.
export default function useRouteMotion(ref, path) {
  const { ready, reduced, paused } = useMotionPreferences();
  useEffect(() => {
    const root = ref.current;
    if (!root || !ready || reduced || paused || typeof IntersectionObserver !== 'function') return;
    const seen = new WeakSet(), animations = new Set();
    let frame;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (typeof entry.target.animate !== 'function' || document.hidden) continue;
        const animation = entry.target.animate([
          { transform: 'translateY(8px)', opacity: .86 },
          { transform: 'translateY(0)', opacity: 1 },
        ], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'none' });
        animations.add(animation);
        animation.onfinish = animation.oncancel = () => animations.delete(animation);
      }
    }, { threshold: .08 });
    function scan() {
      frame = undefined;
      for (const node of root.querySelectorAll('.e-section,.e-advice-ribbon,.e-local,.e-store-reassurance,.e-equivalence-help')) {
        if (seen.has(node)) continue;
        seen.add(node);
        // Do not animate already visible content or delay the first useful paint.
        if (node.getBoundingClientRect().top >= window.innerHeight) observer.observe(node);
      }
    }
    const mutation = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(scan); });
    mutation.observe(root, { childList: true, subtree: true });
    scan();
    const visibility = () => { if (document.hidden) for (const animation of [...animations]) animation.cancel(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect(); mutation.disconnect(); if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
      for (const animation of [...animations]) animation.cancel();
    };
  }, [ref, path, ready, reduced, paused]);
}
