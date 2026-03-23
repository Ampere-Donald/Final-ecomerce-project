import React, { useEffect, useState, useMemo } from 'react';
import { PlusCircle, Search, Download, ShoppingBag, X, Pencil, Trash2, Eye, Package, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { achatApi, fournisseurApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

const METHODES_PAIEMENT = ['ESPECES', 'VIREMENT', 'CHEQUE', 'MOBILE_MONEY'];
const STATUTS_PAIEMENT = ['PAYE', 'EN_ATTENTE', 'PARTIEL'];

const FORM_INITIAL = {
  fournisseurId: '',
  montantTotal: '',
  methodePaiement: 'ESPECES',
  statutPaiement: 'PAYE',
  notes: '',
};

export const Achats = () => {
  const { admin } = useAdminAuth();
  const canDelete = can.deleteEntities(admin?.role);
  const canExport = can.exportCsv(admin?.role);

  const [achats, setAchats] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAchat, setEditingAchat] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ ...FORM_INITIAL });
  const [selectedAchat, setSelectedAchat] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const formatProduitsShort = (lignes: any[]) => {
    if (!lignes || lignes.length === 0) return '—';
    const first = lignes[0];
    const txt = `${first.produit?.nomProduit || 'Produit'} x${first.quantite}`;
    if (lignes.length === 1) return txt;
    return `${txt} +${lignes.length - 1} autre${lignes.length > 2 ? 's' : ''}`;
  };

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

  const openCreateModal = () => {
    setEditingAchat(null);
    setFormData({ ...FORM_INITIAL });
    setIsModalOpen(true);
  };

  const openEditModal = (achat: any) => {
    setEditingAchat(achat);
    setFormData({
      fournisseurId: achat.fournisseurId || achat.fournisseur?.id || '',
      montantTotal: String(achat.montantTotal || ''),
      methodePaiement: achat.methodePaiement || 'ESPECES',
      statutPaiement: achat.statutPaiement || 'PAYE',
      notes: achat.notes || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAchat(null);
    setFormData({ ...FORM_INITIAL });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        montantTotal: parseFloat(formData.montantTotal),
      };

      if (editingAchat) {
        const updated = await achatApi.update(editingAchat.id, payload);
        setAchats(prev => prev.map(a => a.id === editingAchat.id ? { ...a, ...updated } : a));
      } else {
        await achatApi.create(payload);
        await fetchData();
      }
      closeModal();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message;
      alert('Erreur : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet achat ?')) return;
    setAchats(prev => prev.filter(a => a.id !== id));
    try {
      await achatApi.delete(id);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression.');
      await fetchData();
    }
  };

  const filtered = useMemo(() => {
    let result = achats;
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      result = result.filter(a => new Date(a.dateAchat) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      result = result.filter(a => new Date(a.dateAchat) <= to);
    }
    if (search.trim()) {
      result = result.filter(a =>
        (a.fournisseur?.nomEntreprise || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    return result;
  }, [achats, search, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['ID', 'Fournisseur', 'Produits', 'Date', 'Montant Total', 'Méthode Paiement', 'Statut'];
    const rows = filtered.map(a => [
      a.id.substring(0, 8),
      `"${a.fournisseur?.nomEntreprise || 'N/A'}"`,
      `"${(a.lignesAchat || []).map((l: any) => `${l.produit?.nomProduit || 'Produit'} x${l.quantite}`).join(', ')}"`,
      new Date(a.dateAchat).toLocaleDateString('fr-FR'),
      a.montantTotal,
      a.methodePaiement,
      a.statutPaiement,
    ]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `achats_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const statutBadge = (statut: string) => {
    const cls = statut === 'PAYE' ? 'bg-emerald-100 text-emerald-800' :
      statut === 'PARTIEL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{statut}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des Achats</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez vos réapprovisionnements auprès de vos fournisseurs.</p>
        </div>
        <button onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouvel Achat (Réappro)</span>
        </button>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAchat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Détail Achat #{selectedAchat.id.substring(0, 8)}</h2>
                <button onClick={() => setSelectedAchat(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Fournisseur</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedAchat.fournisseur?.nomEntreprise || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Date</p>
                    <p className="font-bold text-slate-900 text-sm">{new Date(selectedAchat.dateAchat).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Statut</p>
                    {statutBadge(selectedAchat.statutPaiement)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total</p>
                    <p className="font-bold text-primary text-sm">{Number(selectedAchat.montantTotal).toLocaleString()} FCFA</p>
                  </div>
                </div>
                {selectedAchat.lignesAchat && selectedAchat.lignesAchat.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Package size={16} />Produits achetés</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead><tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                          <th className="px-4 py-3">Produit</th><th className="px-4 py-3 text-center">Qté</th>
                          <th className="px-4 py-3 text-right">Prix Unit.</th><th className="px-4 py-3 text-right">Sous-total</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedAchat.lignesAchat.map((l: any, i: number) => (
                            <tr key={l.id || i}>
                              <td className="px-4 py-3 font-medium text-slate-900 text-sm">{l.produit?.nomProduit || 'Produit'}</td>
                              <td className="px-4 py-3 text-center text-sm">{l.quantite}</td>
                              <td className="px-4 py-3 text-right text-sm">{Number(l.prixUnitaire).toLocaleString()} FCFA</td>
                              <td className="px-4 py-3 text-right font-bold text-sm">{Number(l.sousTotal).toLocaleString()} FCFA</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Create/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingAchat ? 'Modifier l\'achat' : 'Enregistrer un achat'}
                </h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
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
                  <button type="button" onClick={closeModal} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'Enregistrement...' : editingAchat ? 'Mettre à jour' : 'Enregistrer l\'achat'}
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
              <input type="text" placeholder="Rechercher par fournisseur..." value={search} onChange={e => setSearch(e.target.value)}
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

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ID Achat</th>
                <th className="px-6 py-4">Fournisseur</th>
                <th className="px-6 py-4">Produits</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Montant Total</th>
                <th className="px-6 py-4">Paiement</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center">
                  <ShoppingBag size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun achat trouvé.</p>
                </td></tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-600 text-sm">{a.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{a.fournisseur?.nomEntreprise || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate" title={a.lignesAchat?.map((l: any) => `${l.produit?.nomProduit || 'Produit'} x${l.quantite}`).join(', ') || '—'}>
                      {formatProduitsShort(a.lignesAchat)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(a.dateAchat).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{Number(a.montantTotal).toLocaleString()} FCFA</td>
                    <td className="px-6 py-4">{statutBadge(a.statutPaiement)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedAchat(a)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Voir détails">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openEditModal(a)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                          <Pencil size={16} />
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun achat trouvé.</p>
            </div>
          ) : (
            filtered.map(a => (
              <div key={a.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{a.fournisseur?.nomEntreprise || 'N/A'}</p>
                    <p className="text-xs text-slate-500 font-mono">{a.id.substring(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(a)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    {canDelete && (
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{Number(a.montantTotal).toLocaleString()} FCFA</span>
                  {statutBadge(a.statutPaiement)}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  <Package size={12} className="inline mr-1" />{formatProduitsShort(a.lignesAchat)}
                </p>
                <p className="text-xs text-slate-500">{new Date(a.dateAchat).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
