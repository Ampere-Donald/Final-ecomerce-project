import React, { useEffect, useState, useMemo } from 'react';
import { PlusCircle, Search, ArrowDownRight, ArrowUpRight, Activity, X, Pencil, Trash2, Download, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mouvementStockApi, produitApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

const TYPES_MOUVEMENT = ['ENTREE', 'SORTIE', 'AJUSTEMENT', 'RETOUR'];

export const MouvementsStock = () => {
  const { admin } = useAdminAuth();
  const canDelete = can.deleteEntities(admin?.role);
  const canExport = can.exportCsv(admin?.role);

  const [mouvements, setMouvements] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMouvement, setEditingMouvement] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
      const payload = {
        ...formData,
        quantite: parseInt(formData.quantite, 10),
      };
      if (editingMouvement) {
        const updated = await mouvementStockApi.update(editingMouvement.id, payload);
        setMouvements(prev => prev.map(m => m.id === editingMouvement.id ? { ...m, ...updated } : m));
      } else {
        await mouvementStockApi.create(payload);
        await fetchData();
      }
      setIsModalOpen(false);
      setEditingMouvement(null);
      setFormData({ produitId: '', typeMouvement: 'ENTREE', quantite: '', motif: '' });
    } catch (err) {
      console.error(err);
      alert(editingMouvement ? 'Erreur lors de la modification du mouvement.' : 'Erreur lors de la création du mouvement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (m: any) => {
    setEditingMouvement(m);
    setFormData({
      produitId: m.produitId || m.produit?.id || '',
      typeMouvement: m.typeMouvement,
      quantite: String(m.quantite),
      motif: m.motif || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (m: any) => {
    if (!confirm(`Supprimer ce mouvement de stock (${m.typeMouvement} - ${m.quantite} unités) ?`)) return;
    try {
      setMouvements(prev => prev.filter(item => item.id !== m.id));
      await mouvementStockApi.delete(m.id);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression du mouvement.');
      await fetchData();
    }
  };

  const filtered = useMemo(() => {
    let result = mouvements;
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      result = result.filter(m => new Date(m.dateMouvement) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      result = result.filter(m => new Date(m.dateMouvement) <= to);
    }
    if (search.trim()) {
      result = result.filter(m =>
        (m.produit?.nomProduit || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.motif || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    return result;
  }, [mouvements, search, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Date', 'Type', 'Produit', 'Quantité', 'Motif'];
    const rows = filtered.map(m => [
      new Date(m.dateMouvement).toLocaleString('fr-FR'),
      m.typeMouvement,
      `"${m.produit?.nomProduit || 'N/A'}"`,
      `${m.typeMouvement === 'ENTREE' || m.typeMouvement === 'RETOUR' ? '+' : '-'}${m.quantite}`,
      `"${m.motif || ''}"`,
    ]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mouvements_stock_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

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
                <h2 className="text-xl font-bold text-slate-800">{editingMouvement ? 'Modifier le mouvement' : 'Saisir un mouvement de stock'}</h2>
                <button onClick={() => { setIsModalOpen(false); setEditingMouvement(null); setFormData({ produitId: '', typeMouvement: 'ENTREE', quantite: '', motif: '' }); }} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
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
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingMouvement(null); setFormData({ produitId: '', typeMouvement: 'ENTREE', quantite: '', motif: '' }); }} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'Enregistrement...' : editingMouvement ? 'Modifier' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Rechercher par produit ou motif..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            {canExport && (
              <button onClick={handleExportCSV} disabled={filtered.length === 0}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                <Download size={18} /><span>Exporter CSV</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            <span className="text-sm text-slate-400">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Réinitialiser</button>
            )}
          </div>
        </div>
        {/* ── Table (desktop) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Date & Heure</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Quantité</th>
                <th className="px-6 py-4">Motif</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(m)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                            <Pencil size={16} />
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDelete(m)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Cards (mobile) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Activity size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun mouvement enregistré.</p>
            </div>
          ) : (
            filtered.map(m => {
              const isPositive = m.typeMouvement === 'ENTREE' || m.typeMouvement === 'RETOUR';
              return (
                <div key={m.id} className="p-4 flex items-center gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {isPositive
                      ? <ArrowDownRight size={18} className="text-emerald-700" />
                      : <ArrowUpRight size={18} className="text-red-700" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono font-bold text-slate-900 text-sm truncate">{m.produit?.nomProduit || 'N/A'}</p>
                      <span className={`text-lg font-bold shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : '-'}{m.quantite}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {m.typeMouvement}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(m.dateMouvement).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {m.motif && <p className="text-xs text-slate-500 mt-0.5 truncate">{m.motif}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => handleEdit(m)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                      <Pencil size={16} />
                    </button>
                    {canDelete && (
                      <button onClick={() => handleDelete(m)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};
