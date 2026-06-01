import React, { useEffect, useState } from 'react';
import {
  Wallet,
  ChevronDown,
  ChevronRight,
  Plus,
  Ban,
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { clientApi, reglementApi } from '../services/api';
import { useToast, errorMessage } from './ui/Toast';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

const fmtFCFA = (n: number | string): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return (
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
      .format(v || 0)
      .replace(/\s/g, ' ') + ' FCFA'
  );
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

type Methode = 'ESPECES' | 'MOBILE_MONEY' | 'CARTE' | 'VIREMENT';
const METHODES: { value: Methode; label: string; icon: any }[] = [
  { value: 'ESPECES', label: 'Espèces', icon: Banknote },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { value: 'CARTE', label: 'Carte', icon: CreditCard },
  { value: 'VIREMENT', label: 'Virement', icon: Building2 },
];

const STATUT_CFG: Record<string, { label: string; bg: string; text: string }> = {
  NON_PAYE: { label: 'Non payé', bg: 'bg-red-100', text: 'text-red-700' },
  PARTIEL: { label: 'Partiel', bg: 'bg-amber-100', text: 'text-amber-700' },
  PAYE: { label: 'Payé', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

interface Props {
  clientId: string;
  onChanged?: () => void;
}

export const ClientCreditPanel = ({ clientId, onChanged }: Props) => {
  const toast = useToast();
  const { admin } = useAdminAuth();
  const canRegler = can.enregistrerReglement(admin?.role);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modalVente, setModalVente] = useState<any>(null);
  const [montant, setMontant] = useState('');
  const [methode, setMethode] = useState<Methode>('ESPECES');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const charger = async () => {
    try {
      const res = await clientApi.getClientCredits(clientId);
      setData(res);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const ouvrirReglement = (vente: any) => {
    setModalVente(vente);
    setMontant(String(Math.max(0, Math.round(vente.resteAPayer))));
    setMethode('ESPECES');
    setNote('');
  };

  const soumettreReglement = async () => {
    if (!modalVente) return;
    const m = parseFloat(montant);
    if (!Number.isFinite(m) || m <= 0) {
      toast.error('Montant invalide.');
      return;
    }
    setSubmitting(true);
    try {
      await reglementApi.create({
        venteId: modalVente.id,
        montant: m,
        methodePaiement: methode,
        note: note.trim() || undefined,
      });
      toast.success('Règlement enregistré.');
      setModalVente(null);
      await charger();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const annulerReglement = async (reglementId: string) => {
    const motif = window.prompt('Motif de l’annulation du règlement :');
    if (!motif || motif.trim().length < 3) {
      if (motif !== null) toast.error('Motif requis (3 caractères min).');
      return;
    }
    try {
      await reglementApi.annuler(reglementId, motif.trim());
      toast.success('Règlement annulé.');
      await charger();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400 py-4">Chargement du crédit…</p>;
  }

  const encours = data?.encours;
  const ventes: any[] = data?.ventes ?? [];

  return (
    <div className="space-y-4">
      {/* Encours résumé */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
          <Wallet size={14} /> Encours (dette en cours)
        </div>
        <p className={`text-3xl font-extrabold ${encours?.totalDu > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {fmtFCFA(encours?.totalDu ?? 0)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {encours?.nbVentes ?? 0} vente{(encours?.nbVentes ?? 0) !== 1 ? 's' : ''} non soldée
          {(encours?.nbVentes ?? 0) !== 1 ? 's' : ''}
          {encours?.plusAncienne ? ` · depuis le ${fmtDate(encours.plusAncienne)}` : ''}
        </p>
      </div>

      {ventes.length === 0 ? (
        <p className="text-sm text-slate-400 italic py-2">Aucune vente à crédit en cours. 🎉</p>
      ) : (
        <div className="space-y-3">
          {ventes.map((v) => {
            const open = expanded[v.id];
            const st = STATUT_CFG[v.statutPaiement] ?? STATUT_CFG.NON_PAYE;
            return (
              <div key={v.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [v.id]: !e[v.id] }))}
                      className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 min-w-0"
                    >
                      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className="truncate">Vente du {fmtDate(v.dateVente)}</span>
                    </button>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Total</p>
                      <p className="text-sm font-bold text-slate-800">{fmtFCFA(v.montantTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Payé</p>
                      <p className="text-sm font-bold text-emerald-600">{fmtFCFA(v.montantPaye)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Reste</p>
                      <p className="text-sm font-bold text-red-600">{fmtFCFA(v.resteAPayer)}</p>
                    </div>
                  </div>
                  {canRegler && v.resteAPayer > 0 && (
                    <button
                      onClick={() => ouvrirReglement(v)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-opacity-90"
                    >
                      <Plus size={15} /> Enregistrer un règlement
                    </button>
                  )}
                </div>

                {open && (
                  <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-3">
                    {/* Articles */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Articles pris</p>
                      <ul className="space-y-1">
                        {v.lignesVente?.map((l: any) => (
                          <li key={l.id} className="flex justify-between text-xs text-slate-600">
                            <span className="truncate pr-2">
                              {l.quantite}× {l.produit?.nomProduit ?? 'Produit'}
                              {l.produit?.marque ? ` (${l.produit.marque})` : ''}
                            </span>
                            <span className="font-medium text-slate-800 shrink-0">{fmtFCFA(l.sousTotal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Règlements */}
                    {v.reglements?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Règlements</p>
                        <ul className="space-y-1">
                          {v.reglements.map((r: any) => (
                            <li
                              key={r.id}
                              className={`flex items-center justify-between text-xs ${r.annulee ? 'opacity-50 line-through' : ''}`}
                            >
                              <span className="text-slate-600">
                                {fmtDate(r.dateReglement)} · {r.methodePaiement}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="font-semibold text-emerald-600">{fmtFCFA(r.montant)}</span>
                                {canRegler && !r.annulee && (
                                  <button
                                    onClick={() => annulerReglement(r.id)}
                                    title="Annuler ce règlement"
                                    className="text-slate-400 hover:text-red-500"
                                  >
                                    <Ban size={13} />
                                  </button>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal règlement */}
      {modalVente && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => !submitting && setModalVente(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Enregistrer un règlement</h3>
              <button onClick={() => !submitting && setModalVente(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                <span className="text-slate-500">Reste à payer</span>
                <span className="font-bold text-red-600">{fmtFCFA(modalVente.resteAPayer)}</span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Montant reçu</label>
                <input
                  type="number"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  min={1}
                  max={Math.round(modalVente.resteAPayer)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Méthode</p>
                <div className="grid grid-cols-2 gap-2">
                  {METHODES.map((m) => {
                    const Icon = m.icon;
                    const actif = methode === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMethode(m.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          actif ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={15} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Note (optionnel)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => !submitting && setModalVente(null)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={soumettreReglement}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {submitting ? 'Enregistrement…' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
