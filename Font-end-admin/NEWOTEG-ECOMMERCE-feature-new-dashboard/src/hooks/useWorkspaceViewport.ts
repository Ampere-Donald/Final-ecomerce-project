import { useEffect, useRef } from 'react';

/** The visible WebView shrinks when Android's numeric keyboard opens. */
export function useWorkspaceViewport() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const height = viewport?.height || window.innerHeight;
      ref.current?.style.setProperty('--workspace-height', `${Math.round(height)}px`);
      const editing = document.activeElement?.matches('input, textarea, select');
      ref.current?.setAttribute('data-keyboard-open', String(Boolean(editing && window.innerHeight - height > 120)));
    };
    update();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    document.addEventListener('focusout', update);
    return () => {
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  return ref;
}
