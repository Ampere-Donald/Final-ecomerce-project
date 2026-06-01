import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  /** Si défini, l'utilisateur doit saisir EXACTEMENT cette valeur pour confirmer. */
  requireType?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  requireType,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => {
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTyped('');
      setSubmitting(false);
    }
  }, [open]);

  const canConfirm = requireType ? typed === requireType : true;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !submitting && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  {description && (
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => !submitting && onClose()}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {requireType && (
              <div className="p-5 space-y-2">
                <p className="text-sm text-slate-600">
                  Pour confirmer, tapez{' '}
                  <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-800">
                    {requireType}
                  </code>{' '}
                  ci-dessous :
                </p>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  autoFocus
                />
              </div>
            )}

            <div className="p-5 border-t border-slate-100 flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                {cancelLabel}
              </Button>
              <Button
                variant={variant}
                onClick={handleConfirm}
                disabled={!canConfirm}
                loading={submitting}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
