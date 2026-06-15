import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { factureApi, factureVirtuelleApi, getApiErrorMessage } from '../services/api';

interface Ligne {
  id: string;
  nomProduit: string;
  quantite: number;
  prixUnitaireTTC: number;
  sousTotalTTC: number;
}

interface Props {
  factureReelleId: string;
  onClose: () => void;
  onSuccess: (pending: boolean) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v)) + ' F';

export const FactureVirtuelleModal: React.FC<Props> = ({ factureReelleId, onClose, onSuccess }) => {
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [loadingFacture, setLoadingFacture] = useState(true);

  const [mode, setMode] = useState<'GLOBAL' | 'PAR_LIGNE'>('GLOBAL');
  const [pctGlobal, setPctGlobal] = useState(20);
  const [pctParLigne, setPctParLigne] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les lignes de la facture réelle
  useEffect(() => {
    (async () => {
      setLoadingFacture(true);
      try {
        const facture = await factureApi.getOne(factureReelleId);
        const ls: Ligne[] = (facture.lignes || []).map((l: any) => ({
          id: l.id,
          nomProduit: l.nomProduit,
          quantite: Number(l.quantite),
          prixUnitaireTTC: l.quantite > 0
            ? Math.round(Number(l.sousTotalTTC) / Number(l.quantite))
            : Number(l.prixUnitaireTTC || 0),
          sousTotalTTC: Number(l.sousTotalTTC),
        }));
        setLignes(ls);
        // Initialiser les % PAR_LIGNE à 20 pour chaque ligne
        const init: Record<string, number> = {};
        ls.forEach(l => { init[l.id] = 20; });
        setPctParLigne(init);
      } catch {
        setError('Impossible de charger les produits de la facture.');
      } finally {
        setLoadingFacture(false);
      }
    })();
  }, [factureReelleId]);

  // Calcul du % max (pour vérifier si approbation nécessaire)
  const pctMax = mode === 'GLOBAL'
    ? pctGlobal
    : Math.max(...lignes.map(l => pctParLigne[l.id] || 0), 0);

  const needsApproval = pctMax >= 50;

  // Aperçu des prix
  const apercu = lignes.map(l => {
    const pct = mode === 'GLOBAL' ? pctGlobal : (pctParLigne[l.id] || 0);
    const prixVirtuel = Math.round(l.prixUnitaireTTC * (1 + pct / 100));
    return {
      ...l,
      pct,
      prixVirtuel,
      sousTotalVirtuel: prixVirtuel * l.quantite,
    };
  });

  const totalReel = lignes.reduce((s, l) => s + l.sousTotalTTC, 0);
  const totalVirtuel = apercu.reduce((s, l) => s + l.sousTotalVirtuel, 0);
  const marge = totalVirtuel - totalReel;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = mode === 'GLOBAL'
        ? { factureReelleId, mode: 'GLOBAL', pourcentageMajoration: pctGlobal }
        : {
            factureReelleId,
            mode: 'PAR_LIGNE',
            majorationsParLigne: lignes.map(l => ({
              factureReelleLigneId: l.id,
              pourcentage: pctParLigne[l.id] || 0,
            })),
          };
      await factureVirtuelleApi.create(payload);
      onSuccess(needsApproval);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erreur lors de la création'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Facture virtuelle</h3>
            <p className="text-xs text-slate-500">Document avec prix majorés pour le démarcheur</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}

          {loadingFacture ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 size={20} className="animate-spin mr-2" /> Chargement des produits…
            </div>
          ) : (
            <>
              {/* Toggle mode */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mode de majoration</p>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setMode('GLOBAL')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'GLOBAL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                  >
                    Un seul % pour tout
                  </button>
                  <button
                    onClick={() => setMode('PAR_LIGNE')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'PAR_LIGNE' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                  >
                    % par produit
                  </button>
                </div>
              </div>

              {/* Mode GLOBAL */}
              {mode === 'GLOBAL' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Majoration globale</p>
                    <span className="text-lg font-bold text-blue-600">+{pctGlobal}%</span>
                  </div>
                  <input
                    type="range" min={1} max={200} value={pctGlobal}
                    onChange={e => setPctGlobal(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex gap-2">
                    {[10, 20, 30, 50].map(p => (
                      <button
                        key={p}
                        onClick={() => setPctGlobal(p)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${pctGlobal === p ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        +{p}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode PAR_LIGNE */}
              {mode === 'PAR_LIGNE' && (
                <div className="space-y-3">
                  {lignes.map(l => (
                    <div key={l.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800 truncate">{l.nomProduit} <span className="text-slate-400 font-normal">×{l.quantite}</span></p>
                        <span className="text-sm font-bold text-blue-600 ml-2 whitespace-nowrap">+{pctParLigne[l.id] || 0}%</span>
                      </div>
                      <input
                        type="range" min={1} max={200}
                        value={pctParLigne[l.id] || 0}
                        onChange={e => setPctParLigne(prev => ({ ...prev, [l.id]: Number(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex gap-2">
                        {[10, 20, 30, 50].map(p => (
                          <button
                            key={p}
                            onClick={() => setPctParLigne(prev => ({ ...prev, [l.id]: p }))}
                            className={`flex-1 py-1 rounded text-xs font-semibold border transition ${(pctParLigne[l.id] || 0) === p ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                          >
                            +{p}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Aperçu des prix */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Aperçu</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400">
                      <th className="px-3 py-2 text-left">Produit</th>
                      <th className="px-3 py-2 text-right">Prix réel</th>
                      <th className="px-3 py-2 text-center">%</th>
                      <th className="px-3 py-2 text-right">Prix majoré</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {apercu.map(l => (
                      <tr key={l.id}>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[140px]">{l.nomProduit} ×{l.quantite}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{fmt(l.sousTotalTTC)}</td>
                        <td className="px-3 py-2 text-center text-blue-600 font-medium">+{l.pct}%</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">{fmt(l.sousTotalVirtuel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Marge démarcheur */}
                <div className="border-t border-slate-200 bg-emerald-50 px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-700">Marge démarcheur</span>
                  <span className="text-base font-bold text-emerald-700">+{fmt(marge)}</span>
                </div>
              </div>

              {/* Alerte approbation */}
              {needsApproval && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Majoration ≥ 50% — la facture sera soumise au <strong>SUPER_ADMIN</strong> pour approbation avant impression.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loadingFacture || lignes.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Génération…' : needsApproval ? 'Envoyer au SUPER_ADMIN' : 'Générer et imprimer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
