import { useRef, useCallback } from 'react';

/**
 * useSwipe — lightweight touch swipe detection
 * @param {Function} onSwipeLeft  — called on left swipe
 * @param {Function} onSwipeRight — called on right swipe
 * @param {number}   threshold    — minimum px to trigger (default 50)
 * @returns {{ onTouchStart, onTouchMove, onTouchEnd }} — spread onto the element
 */
const useSwipe = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    tracking.current = true;
  }, []);

  const onTouchMove = useCallback(() => {
    // We only need start/end, but keeping move to prevent jank
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!tracking.current) return;
    tracking.current = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) < threshold || Math.abs(dy) > Math.abs(dx)) return;

    if (dx < 0) {
      onSwipeLeft?.();
    } else {
      onSwipeRight?.();
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
};

export default useSwipe;
