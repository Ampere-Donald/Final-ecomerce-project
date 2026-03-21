import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, ArrowDownRight, ArrowUpRight, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mouvementStockApi, produitApi } from '../services/api';

const TYPES_MOUVEMENT = ['ENTREE', 'SORTIE', 'AJUSTEMENT', 'RETOUR'];

export const MouvementsStock = () => {
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    produitId: '',
    typeMouvement: 'ENTREE',
    quantite: '',
    motif: '',
  });

  const fetchData = async () => {
    try {
      const [m, p] = await Promise.all([mouvementStockApi.getAll(), produitApi.getAll()]);
      setMouvements(m);
      setProduits(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await mouvementStockApi.create({
        ...formData,
        quantite: parseInt(formData.quantite, 10),
      });
      await fetchData();
      setIsModalOpen(false);
      setFormData({ produitId: '', typeMouvement: 'ENTREE', quantite: '', motif: '' });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du mouvement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = mouvements.filter(m =>
    (m.produit?.nomProduit || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.motif || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mouvements de Stock</h1>
          <p className="text-sm text-slate-500 mt-1">Traçabilité complète des entrées, sorties et ajustements d'inventaire.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <Activity size={18} /><span>Saisir un mouvement</span>
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Saisir un mouvement de stock</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Produit concerné *</label>
                  <select required value={formData.produitId} onChange={e => setFormData({ ...formData, produitId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">Sélectionner un produit...</option>
                    {produits.map(p => <option key={p.id} value={p.id}>{p.nomProduit || 'N/A'} - {p.marque}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type de mouvement *</label>
                    <select required value={formData.typeMouvement} onChange={e => setFormData({ ...formData, typeMouvement: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                      {TYPES_MOUVEMENT.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantité *</label>
                    <input type="number" required min="1" value={formData.quantite} onChange={e => setFormData({ ...formData, quantite: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motif *</label>
                  <input type="text" required value={formData.motif} onChange={e => setFormData({ ...formData, motif: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Ex: Réception commande fournisseur, Vente au comptoir..." />
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
            <input type="text" placeholder="Rechercher par produit ou motif..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Date & Heure</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Quantité</th>
                <th className="px-6 py-4">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <Activity size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun mouvement récent enregistré.</p>
                </td></tr>
              ) : (
                filtered.map(m => {
                  const isPositive = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'RETOUR';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(m.dateMouvement).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {isPositive ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          {m.typeMouvement}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">{m.produit?.nomProduit || 'N/A'}</td>
                      <td className={`px-6 py-4 font-bold text-lg ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : '-'}{m.quantite}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{m.motif || '-'}</td>
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
