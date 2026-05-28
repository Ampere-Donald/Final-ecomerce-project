import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Download,
  Landmark,
  PlusCircle,
  RotateCcw,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { caisseApi, coffreApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

const TYPES_OPERATION = ['ENTREE', 'SORTIE'];

type OperationCaisse = {
  id: string;
  dateOperation: string;
  typeOperation: 'ENTREE' | 'SORTIE';
  montant: number | string;
  motif: string;
  venteId?: string | null;
  achatId?: string | null;
  coffreId?: string | null;
  transfertGroupId?: string | null;
  annulee?: boolean;
  motifAnnulation?: string | null;
  coffre?: { id: string; nom: string } | null;
};

type CoffreOption = {
  id: string;
  nom: string;
  statut: string;
};

const formatNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed).toLocaleString('fr-FR') : '0';
};

const formatFCFA = (value: unknown) => `${formatNumber(value)} FCFA`;

export const Caisse = () => {
  const { admin } = useAdminAuth();
  const canExport = can.exportCsv(admin?.role);
  const canCancel = admin?.role === 'SUPER_ADMIN';

  const [operations, setOperations] = useState<OperationCaisse[]>([]);
  const [coffres, setCoffres] = useState<CoffreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [soldeGlobal, setSoldeGlobal] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'manual' | 'transfer' | 'cancel'>('manual');
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ typeOperation: 'ENTREE', montant: '', motif: '' });
  const [transferData, setTransferData] = useState({ coffreId: '', montant: '', motif: '' });
  const [cancelData, setCancelData] = useState({ operationId: '', motifAnnulation: '' });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeCoffres = useMemo(() => coffres.filter(c => c.statut === 'ACTIF'), [coffres]);

  const fetchCaisse = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, global, coffreList] = await Promise.all([
        caisseApi.getAll(),
        caisseApi.soldeGlobal(),
        coffreApi.getAll(),
      ]);
      setOperations(data);
      setSoldeGlobal(global);
      setCoffres(Array.isArray(coffreList) ? coffreList : []);
    } catch (err: any) {
      console.error(err);
      setError('Impossible de charger la caisse.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCaisse(); }, []);

  const mainOperations = useMemo(
    () => operations.filter(op => !op.coffreId && !op.annulee),
    [operations],
  );

  const totalEntrees = useMemo(() =>
    mainOperations.reduce((sum, op) => op.typeOperation === 'ENTREE' ? sum + Number(op.montant || 0) : sum, 0),
    [mainOperations],
  );
  const totalSorties = useMemo(() =>
    mainOperations.reduce((sum, op) => op.typeOperation === 'SORTIE' ? sum + Number(op.montant || 0) : sum, 0),
    [mainOperations],
  );

  const resetForm = () => {
    setFormData({ typeOperation: 'ENTREE', montant: '', motif: '' });
    setTransferData({ coffreId: activeCoffres[0]?.id || '', montant: '', motif: '' });
    setCancelData({ operationId: '', motifAnnulation: '' });
  };

  const openModal = (type: 'manual' | 'transfer' | 'cancel', operation?: OperationCaisse) => {
    setModalType(type);
    resetForm();
    if (type === 'transfer') {
      setTransferData({ coffreId: activeCoffres[0]?.id || '', montant: '', motif: '' });
    }
    if (type === 'cancel' && operation) {
      setCancelData({ operationId: operation.id, motifAnnulation: '' });
    }
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await caisseApi.create({
        typeOperation: formData.typeOperation,
        montant: Number(formData.montant),
        motif: formData.motif,
      });
      await fetchCaisse();
      setIsModalOpen(false);
      resetForm();
    } catch {
      alert('Erreur lors de la creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await caisseApi.transferer({
        coffreId: transferData.coffreId,
        montant: Number(transferData.montant),
        motif: transferData.motif || undefined,
      });
      await fetchCaisse();
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erreur lors du transfert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await caisseApi.annuler(cancelData.operationId, cancelData.motifAnnulation);
      await fetchCaisse();
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Erreur lors de l'annulation.");
    } finally {
      setIsSubmitting(false);
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
      const q = search.toLowerCase();
      result = result.filter(op =>
        (op.motif || '').toLowerCase().includes(q) ||
        (op.coffre?.nom || '').toLowerCase().includes(q) ||
        (op.transfertGroupId || '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [operations, search, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Date', 'Type', 'Motif', 'Montant', 'Lien', 'Statut'];
    const rows = filtered.map(op => [
      new Date(op.dateOperation).toLocaleString('fr-FR'),
      op.typeOperation,
      `"${op.motif || ''}"`,
      `${op.typeOperation === 'ENTREE' ? '+' : '-'}${op.montant}`,
      `"${getOperationLink(op)}"`,
      op.annulee ? 'Annulee' : 'Valide',
    ]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `caisse_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const caissePrincipale = soldeGlobal?.caissePrincipale ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal de Caisse</h1>
          <p className="text-sm text-slate-500 mt-1">Ecritures immuables, transferts et annulations controlees.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openModal('transfer')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-semibold shadow-sm">
            <Landmark size={18} /><span>Transferer vers un coffre</span>
          </button>
          <button onClick={() => openModal('manual')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold shadow-sm">
            <PlusCircle size={18} /><span>Operation manuelle</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-sm font-semibold text-red-700">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-primary rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><Wallet size={20} /></div>
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Solde caisse principale</span>
          </div>
          <p className="text-3xl font-black mt-2">{loading ? '...' : formatFCFA(caissePrincipale)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ArrowDownRight size={20} /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Entrees</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">{loading ? '...' : `+${formatFCFA(totalEntrees)}`}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ArrowUpRight size={20} /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sorties</span>
          </div>
          <p className="text-2xl font-black text-red-600">{loading ? '...' : `-${formatFCFA(totalSorties)}`}</p>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">
                  {modalType === 'manual' && 'Operation manuelle'}
                  {modalType === 'transfer' && 'Transferer vers un coffre'}
                  {modalType === 'cancel' && 'Annuler une ecriture'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>

              {modalType === 'manual' && (
                <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type d'operation *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {TYPES_OPERATION.map(t => (
                        <button key={t} type="button" onClick={() => setFormData({ ...formData, typeOperation: t })}
                          className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                            formData.typeOperation === t
                              ? t === 'ENTREE' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}>
                          {t === 'ENTREE' ? 'Entree' : 'Sortie'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input label="Montant (FCFA)" type="number" value={formData.montant} onChange={v => setFormData({ ...formData, montant: v })} required />
                  <Input label="Motif" value={formData.motif} onChange={v => setFormData({ ...formData, motif: v })} required />
                  <Submit disabled={isSubmitting} label="Enregistrer" />
                </form>
              )}

              {modalType === 'transfer' && (
                <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700 mb-1">Coffre actif *</span>
                    <select required value={transferData.coffreId} onChange={e => setTransferData({ ...transferData, coffreId: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="">Choisir un coffre</option>
                      {activeCoffres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </label>
                  <Input label="Montant (FCFA)" type="number" value={transferData.montant} onChange={v => setTransferData({ ...transferData, montant: v })} required />
                  <Input label="Motif" value={transferData.motif} onChange={v => setTransferData({ ...transferData, motif: v })} />
                  <Submit disabled={isSubmitting || activeCoffres.length === 0} label="Transferer" />
                </form>
              )}

              {modalType === 'cancel' && (
                <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
                  <Input label="Motif d'annulation" value={cancelData.motifAnnulation} onChange={v => setCancelData({ ...cancelData, motifAnnulation: v })} required />
                  <Submit disabled={isSubmitting} label="Annuler l'ecriture" />
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Rechercher motif, coffre ou transfert..." value={search} onChange={e => setSearch(e.target.value)}
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
            <span className="text-sm text-slate-400">a</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Reinitialiser</button>
            )}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Date & Heure</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Motif</th>
                <th className="px-6 py-4">Lien</th>
                <th className="px-6 py-4 text-right">Montant</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Aucune operation en caisse.</td></tr>
              ) : filtered.map(op => {
                const isEntree = op.typeOperation === 'ENTREE';
                return (
                  <tr key={op.id} className={`hover:bg-slate-50 transition-colors ${op.annulee ? 'bg-slate-50 text-slate-400' : ''}`}>
                    <td className={`px-6 py-4 text-sm ${op.annulee ? 'line-through' : 'text-slate-500'}`}>{new Date(op.dateOperation).toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isEntree ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {isEntree ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        {op.typeOperation}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-medium ${op.annulee ? 'line-through' : 'text-slate-700'}`}>
                      {op.motif}
                      {op.annulee && <span title={op.motifAnnulation || ''} className="ml-2 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold no-underline">Annulee</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{getOperationLink(op)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${isEntree ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isEntree ? '+' : '-'}{formatFCFA(op.montant)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canCancel && !op.annulee && (
                        <button onClick={() => openModal('cancel', op)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100">
                          <RotateCcw size={14} /> Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-slate-500">Aucune operation en caisse.</p>
          ) : filtered.map(op => {
            const isEntree = op.typeOperation === 'ENTREE';
            return (
              <div key={op.id} className={`p-4 flex items-center gap-3 ${op.annulee ? 'bg-slate-50 opacity-70' : ''}`}>
                <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${isEntree ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {isEntree ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-slate-900 truncate ${op.annulee ? 'line-through' : ''}`}>{op.motif}</p>
                  <p className="text-xs text-slate-500">{new Date(op.dateOperation).toLocaleString('fr-FR')} - {getOperationLink(op)}</p>
                  <p className={`text-sm font-bold mt-0.5 ${isEntree ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isEntree ? '+' : '-'}{formatFCFA(op.montant)}
                  </p>
                </div>
                {canCancel && !op.annulee && (
                  <button onClick={() => openModal('cancel', op)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg">
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

const getOperationLink = (op: OperationCaisse) => {
  if (op.transfertGroupId) return `Transfert ${op.transfertGroupId.substring(0, 8)}`;
  if (op.coffreId) return `Coffre: ${op.coffre?.nom || op.coffreId.substring(0, 8)}`;
  if (op.venteId) return `Vente: ${op.venteId.substring(0, 8)}`;
  if (op.achatId) return `Achat: ${op.achatId.substring(0, 8)}`;
  return 'Caisse principale';
};

const Input = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) => (
  <label className="block">
    <span className="block text-sm font-medium text-slate-700 mb-1">{label}{required ? ' *' : ''}</span>
    <input
      type={type}
      required={required}
      min={type === 'number' ? '0' : undefined}
      step={type === 'number' ? '0.01' : undefined}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
    />
  </label>
);

const Submit = ({ disabled, label }: { disabled: boolean; label: string }) => (
  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
    <button type="submit" disabled={disabled} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
      {disabled ? 'Enregistrement...' : label}
    </button>
  </div>
);
