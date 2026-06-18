import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { factureVirtuelleApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

interface FVAlert {
  id: string;
  numero: string;
  pourcentageMajoration: number;
  totalTTC: number;
  margeDemarcheur: number;
  vendeur?: { nom: string } | null;
}

const fmtFCFA = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(/ |\s/g, ' ') + ' FCFA';

export const FVAlertPopup: React.FC = () => {
  const { admin } = useAdminAuth();
  const [alerts, setAlerts] = useState<FVAlert[]>([]);
  const [refusing, setRefusing] = useState<Record<string, boolean>>({});
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (admin?.role !== 'SUPER_ADMIN') return;

    const token = localStorage.getItem('newoteg_admin_token');
    const rawUrl = import.meta.env.VITE_API_URL || '/api';
    const baseUrl = rawUrl.endsWith('/api') ? rawUrl.replace(/\/api$/, '') : rawUrl;
    const es = new EventSource(`${baseUrl}/api/facture-virtuelle/pending?token=${token}`);

    es.onmessage = (e) => {
      try {
        const fv: FVAlert = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        setAlerts((prev) => {
          if (prev.some((a) => a.id === fv.id)) return prev;
          return [fv, ...prev];
        });
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => { es.close(); };
    esRef.current = es;

    return () => { es.close(); };
  }, [admin?.role]);

  const dismiss = (id: string) =>
    setAlerts((prev) => prev.filter((a) => a.id !== id));

  const handleApprouver = async (id: string) => {
    setLoading((p) => ({ ...p, [id]: true }));
    try {
      await factureVirtuelleApi.approuver(id);
      dismiss(id);
    } catch { /* silently ignore — user can retry via invoices page */ }
    finally { setLoading((p) => ({ ...p, [id]: false })); }
  };

  const handleRefuser = async (id: string) => {
    const motif = motifs[id]?.trim() || '';
    setLoading((p) => ({ ...p, [id]: true }));
    try {
      await factureVirtuelleApi.refuser(id, motif);
      dismiss(id);
    } catch { /* silently ignore */ }
    finally { setLoading((p) => ({ ...p, [id]: false })); }
  };

  if (admin?.role !== 'SUPER_ADMIN' || alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="pointer-events-auto bg-white border-2 border-orange-400 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 bg-orange-50 px-4 py-3 border-b border-orange-200">
              <AlertTriangle size={18} className="text-orange-500 shrink-0 animate-pulse" />
              <p className="text-sm font-bold text-orange-700 flex-1">Demande FV — Action requise</p>
              <button
                onClick={() => dismiss(alert.id)}
                className="p-1 rounded-lg hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-1">
              <p className="text-base font-bold text-slate-900">{alert.numero}</p>
              {alert.vendeur?.nom && (
                <p className="text-xs text-slate-500">
                  Demandé par <span className="font-semibold text-slate-700">{alert.vendeur.nom}</span>
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  +{alert.pourcentageMajoration}%
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  +{fmtFCFA(alert.margeDemarcheur)}
                </span>
                <span className="text-xs text-slate-400">
                  Total : {fmtFCFA(alert.totalTTC)}
                </span>
              </div>
            </div>

            {/* Refus motif */}
            {refusing[alert.id] && (
              <div className="px-4 pb-2">
                <textarea
                  autoFocus
                  value={motifs[alert.id] || ''}
                  onChange={(e) => setMotifs((p) => ({ ...p, [alert.id]: e.target.value }))}
                  placeholder="Motif du refus (optionnel)..."
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-4">
              {!refusing[alert.id] ? (
                <>
                  <button
                    onClick={() => handleApprouver(alert.id)}
                    disabled={loading[alert.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-bold py-2 rounded-xl transition-colors"
                  >
                    <CheckCircle size={15} />
                    Approuver
                  </button>
                  <button
                    onClick={() => setRefusing((p) => ({ ...p, [alert.id]: true }))}
                    disabled={loading[alert.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold py-2 rounded-xl transition-colors"
                  >
                    <XCircle size={15} />
                    Refuser
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleRefuser(alert.id)}
                    disabled={loading[alert.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold py-2 rounded-xl transition-colors"
                  >
                    <XCircle size={15} />
                    {loading[alert.id] ? 'En cours...' : 'Confirmer le refus'}
                  </button>
                  <button
                    onClick={() => setRefusing((p) => ({ ...p, [alert.id]: false }))}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
