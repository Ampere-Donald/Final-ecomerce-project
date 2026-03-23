import React, { useEffect, useState, useMemo } from 'react';
import { PlusCircle, Search, ArrowUpRight, ArrowDownRight, Wallet, X, TrendingUp, TrendingDown, Pencil, Trash2, Download, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { caisseApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

const TYPES_OPERATION = ['ENTREE', 'SORTIE'];

export const Caisse = () => {
  const { admin } = useAdminAuth();
  const canDelete = can.deleteEntities(admin?.role);
  const canExport = can.exportCsv(admin?.role);

  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [solde, setSolde] = useState(0);
  const [totalEntrees, setTotalEntrees] = useState(0);
  const [totalSorties, setTotalSorties] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ typeOperation: 'ENTREE', montant: '', motif: '' });
  const [editingOperation, setEditingOperation] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const resetForm = () => {
    setFormData({ typeOperation: 'ENTREE', montant: '', motif: '' });
    setEditingOperation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = { typeOperation: formData.typeOperation, montant: parseFloat(formData.montant), motif: formData.motif };
      if (editingOperation) {
        await caisseApi.update(editingOperation.id, payload);
      } else {
        await caisseApi.create(payload);
      }
      await fetchCaisse();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(editingOperation ? 'Erreur lors de la mise à jour.' : 'Erreur lors de la création.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (op: any) => {
    setFormData({ typeOperation: op.typeOperation, montant: String(op.montant), motif: op.motif || '' });
    setEditingOperation(op);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette opération de caisse ?')) return;
    try {
      await caisseApi.delete(id);
      await fetchCaisse();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression.');
    }
  };

  const filtered = useMemo(() => {
    let result = operations;
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      result = result.filter(op => new Date(op.dateOperation) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      result = result.filter(op => new Date(op.dateOperation) <= to);
    }
    if (search.trim()) {
      result = result.filter(op => (op.motif || '').toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [operations, search, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Date', 'Type', 'Motif', 'Montant', 'Lien'];
    const rows = filtered.map(op => [
      new Date(op.dateOperation).toLocaleString('fr-FR'),
      op.typeOperation,
      `"${op.motif || ''}"`,
      `${op.typeOperation === 'ENTREE' ? '+' : '-'}${op.montant}`,
      op.venteId ? `Vente:${op.venteId.substring(0, 8)}` : op.achatId ? `Achat:${op.achatId.substring(0, 8)}` : '-',
    ]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `caisse_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal de Caisse</h1>
          <p className="text-sm text-slate-500 mt-1">Suivi financier et liquidités de l'entreprise.</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }}
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
          <p className="text-3xl font-black mt-2">{loading ? '...' : solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Entrées</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">{loading ? '...' : `+${totalEntrees.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`} FCFA</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><TrendingDown size={20} /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sorties</span>
          </div>
          <p className="text-2xl font-black text-red-600">{loading ? '...' : `-${totalSorties.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`} FCFA</p>
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
                <h2 className="text-xl font-bold text-slate-800">{editingOperation ? 'Modifier l\'opération' : 'Opération manuelle de caisse'}</h2>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant (FCFA) *</label>
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
                  <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'Enregistrement...' : editingOperation ? 'Mettre à jour' : 'Enregistrer'}
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
              <input type="text" placeholder="Rechercher un motif d'opération..." value={search} onChange={e => setSearch(e.target.value)}
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
                <th className="px-6 py-4">Motif</th>
                <th className="px-6 py-4">Lien (Vente/Achat)</th>
                <th className="px-6 py-4 text-right">Montant</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
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
                        {isEntree ? '+' : '-'}{op.montant} FCFA
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(op)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"><Pencil size={16} /></button>
                          {canDelete && (
                            <button onClick={() => handleDelete(op.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
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
              <Wallet size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucune opération en caisse.</p>
            </div>
          ) : (
            filtered.map(op => {
              const isEntree = op.typeOperation === 'ENTREE';
              return (
                <div key={op.id} className="p-4 flex items-center gap-3">
                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${isEntree ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {isEntree ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{op.motif}</p>
                    <p className="text-xs text-slate-500">{new Date(op.dateOperation).toLocaleString()}</p>
                    <p className={`text-sm font-bold mt-0.5 ${isEntree ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isEntree ? '+' : '-'}{op.montant} FCFA
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(op)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg"><Pencil size={16} /></button>
                    {canDelete && (
                      <button onClick={() => handleDelete(op.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
