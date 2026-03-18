import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, ArrowUpRight, ArrowDownRight, Wallet, X, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { caisseApi } from '../services/api';

const TYPES_OPERATION = ['ENTREE', 'SORTIE'];

export const Caisse = () => {
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [solde, setSolde] = useState(0);
  const [totalEntrees, setTotalEntrees] = useState(0);
  const [totalSorties, setTotalSorties] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ typeOperation: 'ENTREE', montant: '', motif: '' });

  const fetchCaisse = async () => {
    try {
      const data = await caisseApi.getAll();
      setOperations(data);
      let entrees = 0, sorties = 0;
      data.forEach((op: any) => {
        const montant = parseFloat(op.montant);
        if (op.typeOperation === 'ENTREE') entrees += montant;
        else sorties += montant;
      });
      setTotalEntrees(entrees);
      setTotalSorties(sorties);
      setSolde(entrees - sorties);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCaisse(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      // Note: l'API caisse peut nécessiter un endpoint POST spécifique - à adapter selon le backend
      // Pour une opération manuelle on pourrait utiliser: POST /api/caisse avec le body
      // Si l'API n'a pas de POST, cela sera géré côté backend via les ventes/achats
      alert('Fonctionnalité d\'opération manuelle à connecter selon l\'endpoint backend disponible.');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = operations.filter(op =>
    (op.motif || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal de Caisse</h1>
          <p className="text-sm text-slate-500 mt-1">Suivi financier et liquidités de l'entreprise.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Opération Manuelle</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-primary rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><Wallet size={20} /></div>
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Solde Actuel</span>
          </div>
          <p className="text-3xl font-black mt-2">{loading ? '...' : solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Entrées</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">{loading ? '...' : `+${totalEntrees.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`} €</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><TrendingDown size={20} /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sorties</span>
          </div>
          <p className="text-2xl font-black text-red-600">{loading ? '...' : `-${totalSorties.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`} €</p>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Opération manuelle de caisse</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type d'opération *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {TYPES_OPERATION.map(t => (
                      <button
                        key={t} type="button"
                        onClick={() => setFormData({ ...formData, typeOperation: t })}
                        className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                          formData.typeOperation === t
                            ? t === 'ENTREE' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {t === 'ENTREE' ? '↓ Entrée' : '↑ Sortie'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant (€) *</label>
                  <input type="number" required min="0" step="0.01" value={formData.montant} onChange={e => setFormData({ ...formData, montant: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motif *</label>
                  <input type="text" required value={formData.motif} onChange={e => setFormData({ ...formData, motif: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Ex: Avance sur commande, Frais de transport..." />
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher un motif d'opération..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Date & Heure</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Motif</th>
                <th className="px-6 py-4">Lien (Vente/Achat)</th>
                <th className="px-6 py-4 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <Wallet size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucune opération en caisse.</p>
                </td></tr>
              ) : (
                filtered.map(op => {
                  const isEntree = op.typeOperation === 'ENTREE';
                  return (
                    <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(op.dateOperation).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isEntree ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {isEntree ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          {op.typeOperation}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">{op.motif}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {op.venteId ? `Vente: ${op.venteId.substring(0, 8)}` : op.achatId ? `Achat: ${op.achatId.substring(0, 8)}` : '-'}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${isEntree ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isEntree ? '+' : '-'}{op.montant} €
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
