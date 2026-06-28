import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  UserPlus,
  Search,
  Power,
  Pencil,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Users as UsersIcon,
  Link2,
} from 'lucide-react';
import { paieApi, adminAccountApi } from '../../services/api';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useToast, errorMessage } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { fmtFCFA, fmtDateCourt } from '../../utils/format';
import {
  Salarie,
  PrimeDefaut,
  TYPE_CONTRAT_OPTIONS,
  MODE_PAIEMENT_OPTIONS,
} from './types';

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1 block">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

const nomComplet = (s: Salarie) => [s.nom, s.prenom].filter(Boolean).join(' ');

export const Salaries = ({ onChanged }: { onChanged?: () => void }) => {
  const toast = useToast();
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Salarie | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Salarie | null>(null);

  const charger = async () => {
    setLoading(true);
    try {
      setSalaries(await paieApi.listSalaries());
    } catch (e: any) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return salaries;
    return salaries.filter(
      (s) =>
        nomComplet(s).toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q) ||
        (s.poste || '').toLowerCase().includes(q),
    );
  }, [salaries, search]);

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };
  const openEdit = (s: Salarie) => {
    setEditing(s);
    setShowModal(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">
          Fiches du personnel payé : créer, modifier, activer/désactiver.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={charger} icon={<RefreshCw size={14} />}>
            Rafraîchir
          </Button>
          <Button onClick={openCreate} icon={<UserPlus size={14} />}>
            Ajouter un salarié
          </Button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, matricule ou poste…"
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Chargement…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Aucun salarié"
          description={search ? 'Aucun résultat pour cette recherche.' : 'Ajoutez votre premier salarié pour générer des bulletins.'}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Salarié</th>
                <th className="px-4 py-3">Poste</th>
                <th className="px-4 py-3">Contrat</th>
                <th className="px-4 py-3 text-right">Salaire base</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50 ${!s.actif ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs">{s.matricule}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{nomComplet(s)}</p>
                    {s.adminUser && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Link2 size={11} /> {s.adminUser.nom} ({s.adminUser.role})
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.poste}</td>
                  <td className="px-4 py-3 text-xs">{s.typeContrat}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">{fmtFCFA(s.salaireBase)}</td>
                  <td className="px-4 py-3">
                    {s.actif ? (
                      <span className="text-xs font-medium text-emerald-700">Actif</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Inactif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="px-2 py-1 text-primary hover:bg-primary/10 rounded" title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmToggle(s)} className="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded" title={s.actif ? 'Désactiver' : 'Réactiver'}>
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SalarieModal
          salarie={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            charger();
            onChanged?.();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.actif ? 'Désactiver ce salarié ?' : 'Réactiver ce salarié ?'}
        description={confirmToggle ? `${nomComplet(confirmToggle)} ${confirmToggle.actif ? 'n’apparaîtra plus dans la liste de génération des bulletins.' : 'redeviendra disponible.'}` : ''}
        confirmLabel={confirmToggle?.actif ? 'Désactiver' : 'Réactiver'}
        variant={confirmToggle?.actif ? 'danger' : 'primary'}
        onClose={() => setConfirmToggle(null)}
        onConfirm={async () => {
          if (!confirmToggle) return;
          try {
            await paieApi.toggleSalarieActif(confirmToggle.id);
            charger();
          } catch (e: any) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </motion.div>
  );
};

/* ─── Modal création / édition ──────────────────────────────────────── */
type FormState = Record<string, any>;

const initialForm = (s: Salarie | null): FormState => ({
  matricule: s?.matricule || '',
  nom: s?.nom || '',
  prenom: s?.prenom || '',
  poste: s?.poste || '',
  categorie: s?.categorie || '',
  echelon: s?.echelon || '',
  dateEmbauche: (s?.dateEmbauche || '').slice(0, 10),
  typeContrat: s?.typeContrat || 'CDI',
  dateFinContrat: (s?.dateFinContrat || '').slice(0, 10),
  salaireBase: s?.salaireBase != null ? String(s.salaireBase) : '',
  numeroCnps: s?.numeroCnps || '',
  niu: s?.niu || '',
  telephone: s?.telephone || '',
  email: s?.email || '',
  adresse: s?.adresse || '',
  dateNaissance: (s?.dateNaissance || '').slice(0, 10),
  lieuNaissance: s?.lieuNaissance || '',
  modePaiement: s?.modePaiement || 'VIREMENT',
  banque: s?.banque || '',
  compteBancaire: s?.compteBancaire || '',
  adminUserId: s?.adminUserId || '',
  actif: s?.actif ?? true,
});

const SalarieModal = ({
  salarie,
  onClose,
  onSaved,
}: {
  salarie: Salarie | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const toast = useToast();
  const isEdit = !!salarie;
  const [form, setForm] = useState<FormState>(initialForm(salarie));
  const [primes, setPrimes] = useState<PrimeDefaut[]>(
    (salarie?.primesParDefaut as PrimeDefaut[]) || [],
  );
  const [comptes, setComptes] = useState<{ id: string; nom: string; role: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminAccountApi
      .getAll()
      .then((data: any[]) => setComptes(data || []))
      .catch(() => {});
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const clean = (v: string) => (v && v.trim() ? v.trim() : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.poste.trim() || !form.dateEmbauche) {
      toast.error('Nom, poste et date d’embauche sont obligatoires.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        matricule: clean(form.matricule),
        nom: form.nom.trim(),
        prenom: clean(form.prenom),
        poste: form.poste.trim(),
        categorie: clean(form.categorie),
        echelon: clean(form.echelon),
        dateEmbauche: form.dateEmbauche,
        typeContrat: form.typeContrat,
        dateFinContrat: clean(form.dateFinContrat),
        salaireBase: Number(form.salaireBase) || 0,
        numeroCnps: clean(form.numeroCnps),
        niu: clean(form.niu),
        telephone: clean(form.telephone),
        email: clean(form.email),
        adresse: clean(form.adresse),
        dateNaissance: clean(form.dateNaissance),
        lieuNaissance: clean(form.lieuNaissance),
        modePaiement: form.modePaiement,
        banque: clean(form.banque),
        compteBancaire: clean(form.compteBancaire),
        adminUserId: form.adminUserId || undefined,
        actif: form.actif,
        primesParDefaut: primes
          .filter((p) => String(p.libelle).trim())
          .map((p) => ({ libelle: String(p.libelle).trim(), montant: Number(p.montant) || 0 })),
      };
      if (isEdit) await paieApi.updateSalarie(salarie!.id, payload);
      else await paieApi.createSalarie(payload);
      toast.success(isEdit ? 'Salarié modifié.' : 'Salarié créé.');
      onSaved();
    } catch (err: any) {
      toast.error(errorMessage(err));
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
      <motion.form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-900">{isEdit ? 'Modifier le salarié' : 'Nouveau salarié'}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nom" required>
              <input className={inputClass} value={form.nom} onChange={(e) => set('nom', e.target.value)} maxLength={150} />
            </Field>
            <Field label="Prénom">
              <input className={inputClass} value={form.prenom} onChange={(e) => set('prenom', e.target.value)} maxLength={150} />
            </Field>
            <Field label="Poste / qualification" required>
              <input className={inputClass} value={form.poste} onChange={(e) => set('poste', e.target.value)} maxLength={150} placeholder="Ex : Vendeur, Gardien…" />
            </Field>
            <Field label="Matricule (auto si vide)">
              <input className={`${inputClass} font-mono`} value={form.matricule} onChange={(e) => set('matricule', e.target.value)} maxLength={50} />
            </Field>
            <Field label="Catégorie">
              <input className={inputClass} value={form.categorie} onChange={(e) => set('categorie', e.target.value)} placeholder="Ex : VI" />
            </Field>
            <Field label="Échelon">
              <input className={inputClass} value={form.echelon} onChange={(e) => set('echelon', e.target.value)} />
            </Field>
            <Field label="Type de contrat">
              <select className={inputClass} value={form.typeContrat} onChange={(e) => set('typeContrat', e.target.value)}>
                {TYPE_CONTRAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Date d'embauche" required>
              <input type="date" className={inputClass} value={form.dateEmbauche} onChange={(e) => set('dateEmbauche', e.target.value)} />
            </Field>
            {form.typeContrat === 'CDD' && (
              <Field label="Fin de contrat">
                <input type="date" className={inputClass} value={form.dateFinContrat} onChange={(e) => set('dateFinContrat', e.target.value)} />
              </Field>
            )}
            <Field label="Salaire de base (FCFA / mois)" required>
              <input type="number" min={0} className={inputClass} value={form.salaireBase} onChange={(e) => set('salaireBase', e.target.value)} />
            </Field>
            <Field label="N° CNPS (assuré)">
              <input className={inputClass} value={form.numeroCnps} onChange={(e) => set('numeroCnps', e.target.value)} />
            </Field>
            <Field label="NIU">
              <input className={inputClass} value={form.niu} onChange={(e) => set('niu', e.target.value)} />
            </Field>
            <Field label="Téléphone">
              <input className={inputClass} value={form.telephone} onChange={(e) => set('telephone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Date de naissance">
              <input type="date" className={inputClass} value={form.dateNaissance} onChange={(e) => set('dateNaissance', e.target.value)} />
            </Field>
            <Field label="Lieu de naissance">
              <input className={inputClass} value={form.lieuNaissance} onChange={(e) => set('lieuNaissance', e.target.value)} />
            </Field>
            <Field label="Mode de paiement">
              <select className={inputClass} value={form.modePaiement} onChange={(e) => set('modePaiement', e.target.value)}>
                {MODE_PAIEMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Banque">
              <input className={inputClass} value={form.banque} onChange={(e) => set('banque', e.target.value)} />
            </Field>
            <Field label="N° de compte">
              <input className={inputClass} value={form.compteBancaire} onChange={(e) => set('compteBancaire', e.target.value)} />
            </Field>
            <Field label="Adresse">
              <input className={inputClass} value={form.adresse} onChange={(e) => set('adresse', e.target.value)} />
            </Field>
            <Field label="Lier à un compte (optionnel)">
              <select className={inputClass} value={form.adminUserId} onChange={(e) => set('adminUserId', e.target.value)}>
                <option value="">— Aucun —</option>
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom} ({c.role})</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Primes / indemnités par défaut */}
          <div className="border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Primes / indemnités récurrentes</p>
              <Button type="button" size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setPrimes((p) => [...p, { libelle: '', montant: 0 }])}>
                Ajouter
              </Button>
            </div>
            {primes.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune prime par défaut. Le salaire de base suffit.</p>
            ) : (
              <div className="space-y-2">
                {primes.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Libellé (ex : Prime de transport)"
                      value={p.libelle}
                      onChange={(e) => setPrimes((arr) => arr.map((x, j) => (j === i ? { ...x, libelle: e.target.value } : x)))}
                    />
                    <input
                      type="number"
                      className={`${inputClass} w-36`}
                      placeholder="Montant"
                      value={p.montant}
                      onChange={(e) => setPrimes((arr) => arr.map((x, j) => (j === i ? { ...x, montant: e.target.value } : x)))}
                    />
                    <button type="button" onClick={() => setPrimes((arr) => arr.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isEdit && (
            <p className="text-xs text-slate-400">Créé le {fmtDateCourt(salarie?.dateEmbauche)} · Matricule {salarie?.matricule}</p>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
};
