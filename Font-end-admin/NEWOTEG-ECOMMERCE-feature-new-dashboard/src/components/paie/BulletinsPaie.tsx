import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  X,
  Printer,
  RefreshCw,
  FileText,
  CheckCircle2,
  Banknote,
  Ban,
  Trash2,
} from 'lucide-react';
import { paieApi } from '../../services/api';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useToast, errorMessage } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { fmtFCFA } from '../../utils/format';
import { can } from '../../utils/permissions';
import { BulletinPrintable } from './BulletinPrintable';
import {
  Bulletin,
  Salarie,
  ParametresEmployeur,
  PrimeDefaut,
  STATUT_META,
  StatutBulletin,
  MODE_PAIEMENT_OPTIONS,
  formatPeriode,
  periodeCourante,
} from './types';

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

const nomComplet = (s: Partial<Salarie> | undefined) =>
  s ? [s.nom, s.prenom].filter(Boolean).join(' ') : '';

export const BulletinsPaie = ({ role }: { role?: string }) => {
  const toast = useToast();
  const canValider = can.validerBulletin(role);

  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [parametres, setParametres] = useState<ParametresEmployeur | null>(null);
  const [loading, setLoading] = useState(true);
  const [fPeriode, setFPeriode] = useState('');
  const [fSalarie, setFSalarie] = useState('');
  const [fStatut, setFStatut] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [printing, setPrinting] = useState<Bulletin | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'annuler' | 'supprimer'; b: Bulletin } | null>(null);

  const charger = async () => {
    setLoading(true);
    try {
      const data = await paieApi.listBulletins({
        periode: fPeriode || undefined,
        salarieId: fSalarie || undefined,
        statut: fStatut || undefined,
      });
      setBulletins(data);
    } catch (e: any) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    paieApi.listSalaries().then(setSalaries).catch(() => {});
    paieApi.getParametres().then(setParametres).catch(() => {});
  }, []);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fPeriode, fSalarie, fStatut]);

  const ouvrirImpression = async (b: Bulletin) => {
    try {
      const full = await paieApi.getBulletin(b.id); // inclut les lignes
      setPrinting(full);
    } catch (e: any) {
      toast.error(errorMessage(e));
    }
  };

  const action = async (fn: () => Promise<any>, okMsg: string) => {
    try {
      await fn();
      toast.success(okMsg);
      charger();
    } catch (e: any) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Période</label>
          <input type="month" value={fPeriode} onChange={(e) => setFPeriode(e.target.value)} className={inputClass} />
        </div>
        <div className="min-w-[180px]">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Salarié</label>
          <select value={fSalarie} onChange={(e) => setFSalarie(e.target.value)} className={inputClass}>
            <option value="">Tous</option>
            {salaries.map((s) => (
              <option key={s.id} value={s.id}>{nomComplet(s)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Statut</label>
          <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} className={inputClass}>
            <option value="">Tous</option>
            {(Object.keys(STATUT_META) as StatutBulletin[]).map((s) => (
              <option key={s} value={s}>{STATUT_META[s].label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={charger} icon={<RefreshCw size={14} />}>Rafraîchir</Button>
        <Button onClick={() => setShowNew(true)} icon={<Plus size={14} />}>Nouveau bulletin</Button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Chargement…</div>
      ) : bulletins.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun bulletin"
          description="Cliquez sur « Nouveau bulletin » pour générer le premier bulletin de paie."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Salarié</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3 text-right">Brut</th>
                <th className="px-4 py-3 text-right">Net à payer</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bulletins.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{b.numero}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{b.salarieNom || nomComplet(b.salarie)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatPeriode(b.periode)}</td>
                  <td className="px-4 py-3 text-right text-sm">{fmtFCFA(b.brutTotal)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{fmtFCFA(b.netAPayer)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUT_META[b.statut].color}`}>
                      {STATUT_META[b.statut].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => ouvrirImpression(b)} className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded" title="Voir / Imprimer">
                        <Printer size={14} />
                      </button>
                      {canValider && b.statut === 'BROUILLON' && (
                        <button onClick={() => action(() => paieApi.validerBulletin(b.id), 'Bulletin validé.')} className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded" title="Valider">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {canValider && b.statut === 'VALIDE' && (
                        <button onClick={() => action(() => paieApi.payerBulletin(b.id), 'Bulletin marqué payé.')} className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Marquer payé">
                          <Banknote size={14} />
                        </button>
                      )}
                      {canValider && (b.statut === 'BROUILLON' || b.statut === 'VALIDE') && (
                        <button onClick={() => setConfirm({ type: 'annuler', b })} className="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded" title="Annuler">
                          <Ban size={14} />
                        </button>
                      )}
                      {canValider && b.statut === 'BROUILLON' && (
                        <button onClick={() => setConfirm({ type: 'supprimer', b })} className="px-2 py-1 text-red-500 hover:bg-red-50 rounded" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewBulletinModal
          salaries={salaries.filter((s) => s.actif)}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            charger();
          }}
        />
      )}

      {printing && (
        <BulletinPrintable bulletin={printing} parametres={parametres} onClose={() => setPrinting(null)} />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'supprimer' ? 'Supprimer ce bulletin ?' : 'Annuler ce bulletin ?'}
        description={
          confirm?.type === 'supprimer'
            ? `Le brouillon ${confirm?.b.numero} sera définitivement supprimé.`
            : `Le bulletin ${confirm?.b.numero} sera marqué comme annulé.`
        }
        confirmLabel={confirm?.type === 'supprimer' ? 'Supprimer' : 'Annuler le bulletin'}
        variant="danger"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.type === 'supprimer') await action(() => paieApi.removeBulletin(confirm.b.id), 'Bulletin supprimé.');
          else await action(() => paieApi.annulerBulletin(confirm.b.id), 'Bulletin annulé.');
        }}
      />
    </motion.div>
  );
};

/* ─── Modal nouveau bulletin (avec aperçu live) ──────────────────────── */
type MontantRow = { libelle: string; montant: number | string };

const NewBulletinModal = ({
  salaries,
  onClose,
  onCreated,
}: {
  salaries: Salarie[];
  onClose: () => void;
  onCreated: () => void;
}) => {
  const toast = useToast();
  const [salarieId, setSalarieId] = useState('');
  const [periode, setPeriode] = useState(periodeCourante());
  const [jours, setJours] = useState('30');
  const [gains, setGains] = useState<MontantRow[]>([]);
  const [retenues, setRetenues] = useState<MontantRow[]>([]);
  const [modePaiement, setModePaiement] = useState('VIREMENT');
  const [calc, setCalc] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const salarie = useMemo(() => salaries.find((s) => s.id === salarieId), [salaries, salarieId]);

  // Pré-remplir les gains à la sélection du salarié
  useEffect(() => {
    if (!salarie) {
      setGains([]);
      return;
    }
    const primes = (salarie.primesParDefaut as PrimeDefaut[]) || [];
    setGains([
      { libelle: 'Salaire de base', montant: Number(salarie.salaireBase) || 0 },
      ...primes.map((p) => ({ libelle: p.libelle, montant: p.montant })),
    ]);
    setModePaiement(salarie.modePaiement || 'VIREMENT');
  }, [salarieId]);

  // Aperçu live (debounce)
  useEffect(() => {
    if (!salarieId) {
      setCalc(null);
      return;
    }
    const t = setTimeout(() => {
      paieApi
        .previewBulletin({
          salarieId,
          gains: gains.map((g) => ({ libelle: g.libelle, montant: Number(g.montant) || 0 })),
          retenuesManuelles: retenues
            .filter((r) => String(r.libelle).trim())
            .map((r) => ({ libelle: r.libelle, montant: Number(r.montant) || 0 })),
        })
        .then((res) => setCalc(res.result))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [salarieId, gains, retenues]);

  const submit = async () => {
    if (!salarieId) {
      toast.error('Sélectionnez un salarié.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(periode)) {
      toast.error('Période invalide.');
      return;
    }
    setSubmitting(true);
    try {
      await paieApi.createBulletin({
        salarieId,
        periode,
        joursTravailles: Number(jours) || 30,
        modePaiement,
        gains: gains
          .filter((g) => String(g.libelle).trim())
          .map((g) => ({ libelle: g.libelle, montant: Number(g.montant) || 0 })),
        retenuesManuelles: retenues
          .filter((r) => String(r.libelle).trim())
          .map((r) => ({ libelle: r.libelle, montant: Number(r.montant) || 0 })),
      });
      toast.success('Bulletin généré (brouillon).');
      onCreated();
    } catch (e: any) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-auto p-4"
      onClick={() => !submitting && onClose()}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-900">Nouveau bulletin de paie</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Colonne saisie */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Salarié *</label>
                <select value={salarieId} onChange={(e) => setSalarieId(e.target.value)} className={inputClass}>
                  <option value="">— Choisir —</option>
                  {salaries.map((s) => (
                    <option key={s.id} value={s.id}>{[s.nom, s.prenom].filter(Boolean).join(' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Période *</label>
                <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Jours travaillés</label>
                <input type="number" min={0} max={31} value={jours} onChange={(e) => setJours(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Mode de paiement</label>
                <select value={modePaiement} onChange={(e) => setModePaiement(e.target.value)} className={inputClass}>
                  {MODE_PAIEMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Gains (salaire + primes)</p>
              {salarieId ? <MontantEditor rows={gains} setRows={setGains} placeholder="Libellé du gain" /> : <p className="text-xs text-slate-400">Sélectionnez un salarié pour pré-remplir.</p>}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Retenues supplémentaires (acompte, RAV…)</p>
              <MontantEditor rows={retenues} setRows={setRetenues} placeholder="Libellé de la retenue" />
            </div>
          </div>

          {/* Colonne aperçu */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 self-start">
            <p className="text-sm font-bold text-slate-800 mb-3">Aperçu du calcul</p>
            {!calc ? (
              <p className="text-sm text-slate-400">Sélectionnez un salarié pour voir le net à payer.</p>
            ) : (
              <div className="space-y-1.5 text-sm">
                <Line label="Salaire brut" value={fmtFCFA(calc.brutTotal)} bold />
                <div className="border-t border-slate-200 my-2" />
                <Line label="CNPS (PVID)" value={`- ${fmtFCFA(calc.cnps)}`} />
                <Line label="IRPP" value={`- ${fmtFCFA(calc.irpp)}`} />
                <Line label="CAC" value={`- ${fmtFCFA(calc.cac)}`} />
                <Line label="Crédit Foncier (CFC)" value={`- ${fmtFCFA(calc.cfc)}`} />
                {Number(calc.autresRetenues) > 0 && <Line label="Autres retenues" value={`- ${fmtFCFA(calc.autresRetenues)}`} />}
                <Line label="Total retenues" value={`- ${fmtFCFA(calc.totalRetenues)}`} />
                <div className="border-t-2 border-slate-300 my-2" />
                <div className="flex justify-between items-center bg-primary/10 rounded-lg px-3 py-2">
                  <span className="font-bold text-slate-800">Net à payer</span>
                  <span className="font-bold text-primary text-lg">{fmtFCFA(calc.netAPayer)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button onClick={submit} loading={submitting} disabled={!salarieId}>Générer le bulletin</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Line = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex justify-between">
    <span className={bold ? 'font-semibold text-slate-800' : 'text-slate-600'}>{label}</span>
    <span className={bold ? 'font-semibold text-slate-900' : 'text-slate-700'}>{value}</span>
  </div>
);

const MontantEditor = ({
  rows,
  setRows,
  placeholder,
}: {
  rows: MontantRow[];
  setRows: React.Dispatch<React.SetStateAction<MontantRow[]>>;
  placeholder: string;
}) => (
  <div className="space-y-2">
    {rows.map((r, i) => (
      <div key={i} className="flex items-center gap-2">
        <input className={`${inputClass} flex-1`} placeholder={placeholder} value={r.libelle} onChange={(e) => setRows((arr) => arr.map((x, j) => (j === i ? { ...x, libelle: e.target.value } : x)))} />
        <input type="number" className={`${inputClass} w-32`} value={r.montant} onChange={(e) => setRows((arr) => arr.map((x, j) => (j === i ? { ...x, montant: e.target.value } : x)))} />
        <button type="button" onClick={() => setRows((arr) => arr.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded">
          <Trash2 size={14} />
        </button>
      </div>
    ))}
    <Button type="button" size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setRows((arr) => [...arr, { libelle: '', montant: 0 }])}>
      Ajouter une ligne
    </Button>
  </div>
);
