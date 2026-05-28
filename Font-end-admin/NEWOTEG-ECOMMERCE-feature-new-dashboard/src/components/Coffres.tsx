import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Landmark,
  Lock,
  PlusCircle,
  Target,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { caisseApi, coffreApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

type Coffre = {
  id: string;
  nom: string;
  description?: string | null;
  objectifMontant?: number | string | null;
  dateEcheance?: string | null;
  statut: 'ACTIF' | 'ATTEINT' | 'CLOTURE';
  soldeActuel: number;
  progression?: number | null;
  operations?: any[];
};

const emptyCoffreForm = {
  nom: '',
  description: '',
  objectifMontant: '',
  dateEcheance: '',
};

const formatNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed).toLocaleString('fr-FR') : '0';
};

const formatFCFA = (value: unknown) => `${formatNumber(value)} FCFA`;

const statusClasses: Record<Coffre['statut'], string> = {
  ACTIF: 'bg-emerald-50 text-emerald-700',
  ATTEINT: 'bg-blue-50 text-blue-700',
  CLOTURE: 'bg-slate-100 text-slate-500',
};

export const Coffres = () => {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const [coffres, setCoffres] = useState<Coffre[]>([]);
  const [selected, setSelected] = useState<Coffre | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | 'transfer' | 'sortie' | null>(null);
  const [coffreForm, setCoffreForm] = useState(emptyCoffreForm);
  const [movementForm, setMovementForm] = useState({ montant: '', motif: '', beneficiaire: '' });
  const [warning, setWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const actifs = useMemo(() => coffres.filter(c => c.statut === 'ACTIF'), [coffres]);

  const fetchCoffres = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await coffreApi.getAll();
      setCoffres(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les coffres.');
    } finally {
      setLoading(false);
    }
  };

  const refreshSelected = async (id: string) => {
    const data = await coffreApi.getOne(id);
    setSelected(data);
    await fetchCoffres();
  };

  useEffect(() => {
    fetchCoffres();
  }, []);

  const openDetail = async (coffre: Coffre) => {
    try {
      const data = await coffreApi.getOne(coffre.id);
      setSelected(data);
    } catch {
      setError('Impossible de charger le detail du coffre.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await coffreApi.create({
        nom: coffreForm.nom,
        description: coffreForm.description || undefined,
        objectifMontant: coffreForm.objectifMontant ? Number(coffreForm.objectifMontant) : undefined,
        dateEcheance: coffreForm.dateEcheance || undefined,
      });
      setModal(null);
      setCoffreForm(emptyCoffreForm);
      await fetchCoffres();
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setSubmitting(true);
      await caisseApi.transferer({
        coffreId: selected.id,
        montant: Number(movementForm.montant),
        motif: movementForm.motif || undefined,
      });
      setModal(null);
      setMovementForm({ montant: '', motif: '', beneficiaire: '' });
      await refreshSelected(selected.id);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSortie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setSubmitting(true);
      await coffreApi.sortie(selected.id, {
        montant: Number(movementForm.montant),
        motif: movementForm.motif,
        beneficiaire: movementForm.beneficiaire || undefined,
      });
      setModal(null);
      setMovementForm({ montant: '', motif: '', beneficiaire: '' });
      await refreshSelected(selected.id);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloture = async (force = false) => {
    if (!selected) return;
    try {
      setSubmitting(true);
      setWarning(null);
      await coffreApi.cloturer(selected.id, force);
      await refreshSelected(selected.id);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.requireForce) setWarning(data.warning || 'Confirmation requise.');
      else setError(data?.message || 'Impossible de cloturer le coffre.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coffres virtuels</h1>
          <p className="text-sm text-slate-500 mt-1">Objectifs, reserves et sorties dediees.</p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold shadow-sm"
        >
          <PlusCircle size={18} />
          <span>Nouveau coffre</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-slate-500">Chargement...</div>
      ) : coffres.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Landmark size={42} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Aucun coffre pour le moment.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coffres.map(coffre => {
            const objectif = Number(coffre.objectifMontant ?? 0);
            const progress = objectif > 0 ? Math.min(100, Math.max(0, Number(coffre.progression ?? 0))) : 0;
            return (
              <button
                key={coffre.id}
                onClick={() => openDetail(coffre)}
                className="text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{coffre.nom}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{coffre.description || 'Aucune description'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusClasses[coffre.statut]}`}>
                    {coffre.statut}
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-5">{formatFCFA(coffre.soldeActuel)}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Objectif</span>
                    <span>{objectif > 0 ? formatFCFA(objectif) : '-'}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar size={13} />
                    <span>{coffre.dateEcheance ? new Date(coffre.dateEcheance).toLocaleDateString('fr-FR') : 'Sans echeance'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      )}

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="bg-white rounded-2xl shadow-xl w-full max-w-5xl mx-auto my-8 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.nom}</h2>
                  <p className="text-sm text-slate-500">{selected.description || 'Aucune description'}</p>
                </div>
                <button onClick={() => { setSelected(null); setWarning(null); }} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                  <X size={22} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Solde</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatFCFA(selected.soldeActuel)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Objectif</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{selected.objectifMontant ? formatFCFA(selected.objectifMontant) : '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Echeance</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{selected.dateEcheance ? new Date(selected.dateEcheance).toLocaleDateString('fr-FR') : '-'}</p>
                  </div>
                </div>

                {warning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm font-medium text-amber-800">{warning}</p>
                    <button onClick={() => handleCloture(true)} disabled={submitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold">
                      Confirmer
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selected.statut === 'ACTIF' && (
                    <button onClick={() => setModal('transfer')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">
                      Alimenter
                    </button>
                  )}
                  {selected.statut !== 'CLOTURE' && (
                    <button onClick={() => setModal('sortie')} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">
                      Sortie / Payer
                    </button>
                  )}
                  {isSuperAdmin && selected.statut !== 'CLOTURE' && (
                    <button onClick={() => handleCloture(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2">
                      <Lock size={16} /> Cloturer
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Motif</th>
                        <th className="px-4 py-3 text-right">Montant</th>
                        <th className="px-4 py-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selected.operations || []).length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucune ecriture.</td></tr>
                      ) : (
                        selected.operations?.map(op => {
                          const entree = op.typeOperation === 'ENTREE';
                          return (
                            <tr key={op.id} className={op.annulee ? 'bg-slate-50 text-slate-400 line-through' : ''}>
                              <td className="px-4 py-3 text-sm">{new Date(op.dateOperation).toLocaleString('fr-FR')}</td>
                              <td className="px-4 py-3 text-sm">{op.typeOperation}</td>
                              <td className="px-4 py-3 text-sm">{op.motif}</td>
                              <td className={`px-4 py-3 text-right font-bold ${entree ? 'text-emerald-600' : 'text-red-600'}`}>
                                {entree ? '+' : '-'}{formatFCFA(op.montant)}
                              </td>
                              <td className="px-4 py-3 text-sm">{op.annulee ? 'Annulee' : 'Valide'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {modal === 'create' && (
          <Modal title="Nouveau coffre" onClose={() => setModal(null)}>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input label="Nom" value={coffreForm.nom} onChange={v => setCoffreForm(f => ({ ...f, nom: v }))} required />
              <Input label="Description" value={coffreForm.description} onChange={v => setCoffreForm(f => ({ ...f, description: v }))} />
              <Input label="Objectif (FCFA)" type="number" value={coffreForm.objectifMontant} onChange={v => setCoffreForm(f => ({ ...f, objectifMontant: v }))} />
              <Input label="Date echeance" type="date" value={coffreForm.dateEcheance} onChange={v => setCoffreForm(f => ({ ...f, dateEcheance: v }))} />
              <Submit disabled={submitting} label="Creer" />
            </form>
          </Modal>
        )}

        {modal === 'transfer' && selected && (
          <Modal title={`Alimenter ${selected.nom}`} onClose={() => setModal(null)}>
            <form onSubmit={handleTransfer} className="space-y-4">
              <Input label="Montant (FCFA)" type="number" value={movementForm.montant} onChange={v => setMovementForm(f => ({ ...f, montant: v }))} required />
              <Input label="Motif" value={movementForm.motif} onChange={v => setMovementForm(f => ({ ...f, motif: v }))} />
              {actifs.length === 0 && <p className="text-xs text-amber-600">Aucun coffre actif disponible.</p>}
              <Submit disabled={submitting} label="Transferer" />
            </form>
          </Modal>
        )}

        {modal === 'sortie' && selected && (
          <Modal title={`Sortie depuis ${selected.nom}`} onClose={() => setModal(null)}>
            <form onSubmit={handleSortie} className="space-y-4">
              <Input label="Montant (FCFA)" type="number" value={movementForm.montant} onChange={v => setMovementForm(f => ({ ...f, montant: v }))} required />
              <Input label="Motif" value={movementForm.motif} onChange={v => setMovementForm(f => ({ ...f, motif: v }))} required />
              <Input label="Beneficiaire" value={movementForm.beneficiaire} onChange={v => setMovementForm(f => ({ ...f, beneficiaire: v }))} />
              <Submit disabled={submitting} label="Enregistrer la sortie" />
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
          <X size={20} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  </div>
);

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
  <div className="pt-3 flex justify-end">
    <button disabled={disabled} type="submit" className="px-5 py-2 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50">
      {disabled ? 'Enregistrement...' : label}
    </button>
  </div>
);
