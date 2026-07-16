import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs?: number;
  dedupeKey?: string;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, durationMs?: number, dedupeKey?: string) => void;
  success: (message: string, durationMs?: number, dedupeKey?: string) => void;
  error: (message: string, durationMs?: number, dedupeKey?: string) => void;
  info: (message: string, durationMs?: number, dedupeKey?: string) => void;
  warning: (message: string, durationMs?: number, dedupeKey?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const styles: Record<ToastType, { bg: string; text: string; border: string; icon: React.ComponentType<any> }> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: Info,
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: AlertTriangle,
  },
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 4000, dedupeKey?: string) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [
        ...prev.filter((toast) => !dedupeKey || toast.dedupeKey !== dedupeKey),
        { id, type, message, durationMs, dedupeKey },
      ].slice(-5));
      if (durationMs > 0) {
        setTimeout(() => remove(id), durationMs);
      }
    },
    [remove],
  );

  const api = useMemo<ToastContextValue>(() => ({
    show,
    success: (m, d, key) => show(m, 'success', d, key),
    error: (m, d, key) => show(m, 'error', d ?? 6000, key),
    info: (m, d, key) => show(m, 'info', d, key),
    warning: (m, d, key) => show(m, 'warning', d ?? 5000, key),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4" aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {toasts.map((t) => {
            const s = styles[t.type];
            const Icon = s.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${s.bg} ${s.text} ${s.border} shadow-lg max-w-md`}
              >
                <Icon size={18} className="flex-shrink-0 mt-0.5" />
                <p className="flex-1 text-sm font-medium">{t.message}</p>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  aria-label="Fermer la notification"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback : si pas de provider, no-op silencieux
    const noop = () => {};
    return { show: noop, success: noop, error: noop, info: noop, warning: noop };
  }
  return ctx;
};

// Petit utilitaire : convertir une erreur axios en message lisible.
export const errorMessage = (err: any): string => {
  const msg = err?.response?.data?.message || err?.message || 'Erreur inconnue';
  return Array.isArray(msg) ? msg.join(', ') : String(msg);
};

// Pour compat avec d'éventuels imports qui veulent juste le hook React
export { useEffect, useState };
