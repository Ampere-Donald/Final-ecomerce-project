import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Edit2, AlertTriangle, CheckCircle2, Layers, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { varianteApi, produitApi } from '../services/api';

export const Variantes = () => {
  const [variantes, setVariantes] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    codeVariante: '',
    codeBarre: '',
    produitId: '',
    prixVente: '',
    prixAchat: '',
    quantiteStock: '',
    seuilAlerte: '5',
  });

  const fetchData = async () => {
    try {
      const [v, p] = await Promise.all([varianteApi.getAll(), produitApi.getAll()]);
      setVariantes(v);
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
      await varianteApi.create({
        ...formData,
        prixVente: parseFloat(formData.prixVente),
        prixAchat: parseFloat(formData.prixAchat),
        quantiteStock: parseInt(formData.quantiteStock, 10),
        seuilAlerte: parseInt(formData.seuilAlerte, 10),
      });
      await fetchData();
      setIsModalOpen(false);
      setFormData({ codeVariante: '', codeBarre: '', produitId: '', prixVente: '', prixAchat: '', quantiteStock: '', seuilAlerte: '5' });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de la variante.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = variantes.filter(v =>
    (v.codeVariante || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.produit?.nomProduit || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Variantes et Stocks</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les codes-barres, les prix et surveillez les niveaux de stock.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouvelle Variante</span>
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Ajouter une variante</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Produit associé *</label>
                  <select required value={formData.produitId} onChange={e => setFormData({ ...formData, produitId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">Sélectionner un produit...</option>
                    {produits.map(p => <option key={p.id} value={p.id}>{p.nomProduit}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Code Variante *</label>
                    <input type="text" required value={formData.codeVariante} onChange={e => setFormData({ ...formData, codeVariante: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Ex: POMPE-500W-BLK" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Code-Barre (EAN)</label>
                    <input type="text" value={formData.codeBarre} onChange={e => setFormData({ ...formData, codeBarre: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="EAN13..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prix Vente (€) *</label>
                    <input type="number" required min="0" step="0.01" value={formData.prixVente} onChange={e => setFormData({ ...formData, prixVente: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prix Achat (€)</label>
                    <input type="number" min="0" step="0.01" value={formData.prixAchat} onChange={e => setFormData({ ...formData, prixAchat: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Stock initial *</label>
                    <input type="number" required min="0" value={formData.quantiteStock} onChange={e => setFormData({ ...formData, quantiteStock: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Seuil d'alerte</label>
                    <input type="number" min="0" value={formData.seuilAlerte} onChange={e => setFormData({ ...formData, seuilAlerte: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="5" />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'Création...' : 'Créer la variante'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher par code variante ou produit..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Code / Produit</th>
                <th className="px-6 py-4">Prix Vente</th>
                <th className="px-6 py-4">Stock Actuel</th>
                <th className="px-6 py-4">État</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <Layers size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucune variante trouvée.</p>
                </td></tr>
              ) : (
                filtered.map(v => {
                  const estEnAlerte = v.quantiteStock <= v.seuilAlerte;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{v.codeVariante}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Prod: {v.produit?.nomProduit || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">EAN: {v.codeBarre || '-'}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{v.prixVente} €</td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold">{v.quantiteStock}</span>
                        <span className="text-xs text-slate-400 ml-1">/ seuil: {v.seuilAlerte}</span>
                      </td>
                      <td className="px-6 py-4">
                        {estEnAlerte ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertTriangle size={14} /> Stock Bas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={14} /> Ok
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
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
