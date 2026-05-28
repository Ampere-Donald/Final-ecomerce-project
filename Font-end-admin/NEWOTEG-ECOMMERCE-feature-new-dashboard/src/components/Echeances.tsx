import React, { useEffect, useState } from 'react';
import {
  AlarmClock,
  BellRing,
  Calendar,
  PlusCircle,
  Power,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { coffreApi, echeanceApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

type Recurrence = 'UNIQUE' | 'MENSUELLE' | 'TRIMESTRIELLE' | 'ANNUELLE';

type Echeance = {
  id: string;
  titre: string;
  description?: string | null;
  coffreId?: string | null;
  montantCible?: number | string | null;
  dateEcheance: string;
  recurrence: Recurrence;
  joursAlerteAvant?: number[];
  active: boolean;
  coffre?: { id: string; nom: string } | null;
  soldeCoffre?: number | null;
  manque?: number | null;
  alertes?: any[];
};

type Coffre = { id: string; nom: string; statut: string };

const ALERT_CHOICES = [1, 3, 7, 14, 30];

const emptyForm = {
  titre: '',
  description: '',
  coffreId: '',
  montantCible: '',
  dateEcheance: '',
  recurrence: 'UNIQUE' as Recurrence,
  joursAlerteAvant: [7, 3, 1] as number[],
};

const formatNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed).toLocaleString('fr-FR') : '0';
};
const formatFCFA = (value: unknown) => `${formatNumber(value)} FCFA`;

const toValidDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysUntil = (value: string): number => {
  const target = toValidDate(value);
  if (!target) return 0;
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const now = new Date();
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((t - n) / 86_400_000);
};

const urgencyBadge = (value: string) => {
  const d = daysUntil(value);
  if (d < 0) return { label: 'En retard', cls: 'bg-red-50 text-red-700' };
  if (d === 0) return { label: "Aujourd'hui", cls: 'bg-amber-50 text-amber-700' };
  if (d <= 3) return { label: `Dans ${d} j`, cls: 'bg-orange-50 text-orange-700' };
  return { label: `Dans ${d} j`, cls: 'bg-emerald-50 text-emerald-700' };
};

export const Echeances = () => {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [coffres, setCoffres] = useState<Coffre[]>([]);
  const [selected, setSelected] = useState<Echeance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const extractError = (err: any, fallback: string) => {
    const msg = err?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    return msg || err?.message || fallback;
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ech, cof] = await Promise.all([
        echeanceApi.getAll(),
        coffreApi.getAll().catch(() => []),
      ]);
      setEcheances(Array.isArray(ech) ? ech : []);
      setCoffres(Array.isArray(cof) ? cof.filter((c: Coffre) => c.statut !== 'CLOTURE') : []);
    } catch {
      setError('Impossible de charger les echeances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openDetail = async (echeance: Echeance) => {
    try {
      const data = await echeanceApi.getOne(echeance.id);
      setSelected(data);
    } catch {
      setError('Impossible de charger le detail.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError(null);
      await echeanceApi.create({
        titre: form.titre,
        description: form.description || undefined,
        coffreId: form.coffreId || undefined,
        montantCible: form.montantCible ? Number(form.montantCible) : undefined,
        dateEcheance: form.dateEcheance,
        recurrence: form.recurrence,
        joursAlerteAvant: form.joursAlerteAvant,
      });
      setModalOpen(false);
      setForm(emptyForm);
      await fetchAll();
    } catch (err: any) {
      setFormError(extractError(err, 'Creation impossible.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclencher = async (id: string) => {
    try {
      setFeedback(null);
      const res = await echeanceApi.declencher(id);
      setFeedback(`Alerte ${res?.type || ''} envoyee (notification + email SUPER_ADMIN).`);
      if (selected?.id === id) await openDetail(selected);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Echec du declenchement de l'alerte.");
    }
  };

  const handleToggleActive = async (echeance: Echeance) => {
    await echeanceApi.update(echeance.id, { active: !echeance.active });
    await fetchAll();
    if (selected?.id === echeance.id) await openDetail(echeance);
  };

  const handleDelete = async (id: string) => {
    await echeanceApi.delete(id);
    setSelected(null);
    await fetchAll();
  };

  const toggleAlertDay = (day: number) => {
    setForm(f => ({
      ...f,
      joursAlerteAvant: f.joursAlerteAvant.includes(day)
        ? f.joursAlerteAvant.filter(d => d !== day)
        : [...f.joursAlerteAvant, day].sort((a, b) => b - a),
    }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Echeances &amp; alertes</h1>
          <p className="text-sm text-slate-500 mt-1">Tontines, Advans, salaires, fournisseurs et rappels.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold shadow-sm"
        >
          <PlusCircle size={18} />
          <span>Nouvelle echeance</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">{error}</div>
      )}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm font-medium">{feedback}</div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-slate-500">Chargement...</div>
      ) : echeances.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <AlarmClock size={42} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Aucune echeance enregistree.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {echeances.map(echeance => {
            const badge = urgencyBadge(echeance.dateEcheance);
            return (
              <div
                key={echeance.id}
                className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${echeance.active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => openDetail(echeance)} className="text-left min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{echeance.titre}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{echeance.description || (echeance.coffre ? `Coffre: ${echeance.coffre.nom}` : 'Rappel simple')}</p>
                  </button>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs text-slate-400">
                  <Calendar size={13} />
                  <span>{toValidDate(echeance.dateEcheance)?.toLocaleDateString('fr-FR') || '-'}</span>
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 font-medium">{echeance.recurrence}</span>
                </div>

                {echeance.coffreId && echeance.manque != null && echeance.manque > 0 && (
                  <p className="mt-3 text-xs font-medium text-amber-600">Il manque {formatFCFA(echeance.manque)}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDeclencher(echeance.id)}
                    disabled={!echeance.active}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    <BellRing size={14} /> Declencher
                  </button>
                  <button
                    onClick={() => handleToggleActive(echeance)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    <Power size={14} /> {echeance.active ? 'Desactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-auto my-8 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.titre}</h2>
                  <p className="text-sm text-slate-500">{selected.description || (selected.coffre ? `Coffre: ${selected.coffre.nom}` : 'Rappel simple')}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                  <X size={22} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Echeance</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{toValidDate(selected.dateEcheance)?.toLocaleDateString('fr-FR') || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Recurrence</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{selected.recurrence}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Cible / Solde</p>
                    <p className="text-lg font-black text-slate-900 mt-1">
                      {selected.coffreId
                        ? `${formatFCFA(selected.soldeCoffre)} / ${selected.montantCible ? formatFCFA(selected.montantCible) : '-'}`
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleDeclencher(selected.id)} disabled={!selected.active} className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50">
                    <BellRing size={16} /> Declencher l'alerte
                  </button>
                  <button onClick={() => handleToggleActive(selected)} className="flex items-center gap-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold">
                    <Power size={16} /> {selected.active ? 'Desactiver' : 'Activer'}
                  </button>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(selected.id)} className="flex items-center gap-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold">
                      <Trash2 size={16} /> Supprimer
                    </button>
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">Historique des alertes</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Message</th>
                          <th className="px-4 py-3">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selected.alertes || []).length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucune alerte emise.</td></tr>
                        ) : (
                          selected.alertes?.map(a => (
                            <tr key={a.id}>
                              <td className="px-4 py-3 text-sm">{toValidDate(a.createdAt)?.toLocaleString('fr-FR') || '-'}</td>
                              <td className="px-4 py-3 text-sm font-semibold">{a.type}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{a.message}</td>
                              <td className="px-4 py-3 text-sm">{a.emailEnvoye ? 'Oui' : 'Non'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Nouvelle echeance</h2>
                <button onClick={() => { setModalOpen(false); setFormError(null); }} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm font-medium">{formError}</div>
                )}
                <Field label="Titre" required>
                  <input value={form.titre} required onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Description">
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Lier a un coffre (optionnel)">
                  <select value={form.coffreId} onChange={e => setForm(f => ({ ...f, coffreId: e.target.value }))} className={inputCls}>
                    <option value="">Aucun (rappel simple)</option>
                    {coffres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </Field>
                {form.coffreId && (
                  <Field label="Montant cible (FCFA)">
                    <input type="number" min="0" value={form.montantCible} onChange={e => setForm(f => ({ ...f, montantCible: e.target.value }))} className={inputCls} />
                  </Field>
                )}
                <Field label="Date d'echeance" required>
                  <input type="date" required value={form.dateEcheance} onChange={e => setForm(f => ({ ...f, dateEcheance: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Recurrence">
                  <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as Recurrence }))} className={inputCls}>
                    <option value="UNIQUE">Unique</option>
                    <option value="MENSUELLE">Mensuelle</option>
                    <option value="TRIMESTRIELLE">Trimestrielle</option>
                    <option value="ANNUELLE">Annuelle</option>
                  </select>
                </Field>
                <Field label="Alerter X jours avant">
                  <div className="flex flex-wrap gap-2">
                    {ALERT_CHOICES.map(day => (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleAlertDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${form.joursAlerteAvant.includes(day) ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                      >
                        J-{day}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="pt-3 flex justify-end">
                  <button disabled={submitting} type="submit" className="px-5 py-2 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50">
                    {submitting ? 'Enregistrement...' : 'Creer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const inputCls = 'w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none';

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-sm font-medium text-slate-700 mb-1">{label}{required ? ' *' : ''}</span>
    {children}
  </label>
);
