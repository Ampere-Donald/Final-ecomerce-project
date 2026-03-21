import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Filter, Download, ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { achatApi, fournisseurApi } from '../services/api';

const METHODES_PAIEMENT = ['ESPECES', 'VIREMENT', 'CHEQUE', 'MOBILE_MONEY'];
const STATUTS_PAIEMENT = ['PAYE', 'EN_ATTENTE', 'PARTIEL'];

export const Achats = () => {
  const [achats, setAchats] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fournisseurId: '',
    montantTotal: '',
    methodePaiement: 'ESPECES',
    statutPaiement: 'PAYE',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [a, f] = await Promise.all([achatApi.getAll(), fournisseurApi.getAll()]);
      setAchats(a);
      setFournisseurs(f);
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
      await achatApi.create({
        ...formData,
        montantTotal: parseFloat(formData.montantTotal),
      });
      await fetchData();
      setIsModalOpen(false);
      setFormData({ fournisseurId: '', montantTotal: '', methodePaiement: 'ESPECES', statutPaiement: 'PAYE', notes: '' });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de l\'achat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = achats.filter(a =>
    (a.fournisseur?.nomEntreprise || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des Achats</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez vos réapprovisionnements auprès de vos fournisseurs.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouvel Achat (Réappro)</span>
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
                <h2 className="text-xl font-bold text-slate-800">Enregistrer un achat</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur *</label>
                  <select required value={formData.fournisseurId} onChange={e => setFormData({ ...formData, fournisseurId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">Sélectionner un fournisseur...</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nomEntreprise}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant Total (FCFA) *</label>
                  <input type="number" required min="0" step="0.01" value={formData.montantTotal} onChange={e => setFormData({ ...formData, montantTotal: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Méthode de paiement</label>
                    <select value={formData.methodePaiement} onChange={e => setFormData({ ...formData, methodePaiement: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                      {METHODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Statut paiement</label>
                    <select value={formData.statutPaiement} onChange={e => setFormData({ ...formData, statutPaiement: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                      {STATUTS_PAIEMENT.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optionnel)</label>
                  <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    placeholder="Informations complémentaires..." />
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer l\'achat'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher par fournisseur..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <div className="flex gap-2 ml-4">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"><Filter size={18} /></button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"><Download size={18} /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ID Achat</th>
                <th className="px-6 py-4">Fournisseur</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Montant Total</th>
                <th className="px-6 py-4">Paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <ShoppingBag size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun achat trouvé.</p>
                </td></tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-600 text-sm">{a.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{a.fournisseur?.nomEntreprise || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(a.dateAchat).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{a.montantTotal} FCFA</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        a.statutPaiement === 'PAYE' ? 'bg-emerald-100 text-emerald-800' :
                        a.statutPaiement === 'PARTIEL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>{a.statutPaiement}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
