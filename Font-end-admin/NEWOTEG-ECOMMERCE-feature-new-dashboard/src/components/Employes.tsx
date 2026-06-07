import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  Users as UsersIcon,
  Search,
  Eye,
  EyeOff,
  Power,
  RefreshCw,
  X,
  History,
  ListChecks,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { adminAccountApi, caisseJourApi, primeApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { fmtDateCourt, fmtRelatif } from '../utils/format';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { useToast, errorMessage } from './ui/Toast';
import { ConfirmDialog } from './ui/ConfirmDialog';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'VENDEUR' | 'MANAGER';

interface Employe {
  id: string;
  username: string;
  nom: string;
  email?: string | null;
  role: Role;
  isActive: boolean;
  photoUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface RoleHistoryItem {
  id: string;
  oldRole: Role;
  newRole: Role;
  changedAt: string;
  motif?: string | null;
}

interface ActivityItem {
  id: string;
  action: string;
  createdAt: string;
  details?: any;
  ipAddress?: string | null;
}

const periodeCourante = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtFCFA = (value: number | string | undefined | null) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} FCFA`;

const ROLE_META: Record<Role, { label: string; icon: any; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', icon: ShieldCheck, color: 'bg-purple-100 text-purple-800' },
  ADMIN: { label: 'Admin', icon: UsersIcon, color: 'bg-blue-100 text-blue-800' },
  CAISSIER: { label: 'Caissier', icon: Wallet, color: 'bg-amber-100 text-amber-800' },
  VENDEUR: { label: 'Vendeur', icon: ShoppingBag, color: 'bg-emerald-100 text-emerald-800' },
  MANAGER: { label: 'Manager (legacy)', icon: UsersIcon, color: 'bg-slate-100 text-slate-700' },
};

const ROLES_DISPONIBLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR'];

const initialesDe = (nom: string) =>
  nom
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const Employes = () => {
  const { admin: currentAdmin } = useAdminAuth();
  const toast = useToast();
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [showOnlyInactive, setShowOnlyInactive] = useState(false);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Employe | null>(null);
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Employe | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Employe | null>(null);

  const charger = async () => {
    setLoading(true);
    try {
      const data = await adminAccountApi.getAll();
      setEmployes(data || []);
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
    return employes
      .filter((e) => filterRole === 'all' || e.role === filterRole)
      .filter((e) => (showOnlyInactive ? !e.isActive : true))
      .filter(
        (e) =>
          !q ||
          e.nom.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q),
      );
  }, [employes, search, filterRole, showOnlyInactive]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employés</h2>
          <p className="text-slate-500 text-sm">
            Gestion des comptes : créer, modifier, désactiver, changer de rôle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={charger} icon={<RefreshCw size={14} />}>
            Rafraîchir
          </Button>
          <Button onClick={() => setShowCreate(true)} icon={<UserPlus size={14} />}>
            Ajouter un employé
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, username ou email…"
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as Role | 'all')}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="all">Tous les rôles</option>
          {ROLES_DISPONIBLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_META[r].label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyInactive}
            onChange={(e) => setShowOnlyInactive(e.target.checked)}
            className="rounded"
          />
          Désactivés uniquement
        </label>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Chargement…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Aucun employé"
          description={
            search || filterRole !== 'all' || showOnlyInactive
              ? 'Essayez d\'élargir vos filtres.'
              : 'Cliquez sur « Ajouter un employé » pour créer le premier compte.'
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Employé</th>
                <th className="px-6 py-3">Rôle</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3">Dernière connexion</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const meta = ROLE_META[e.role];
                const Icon = meta.icon;
                const isMe = e.id === currentAdmin?.id;
                return (
                  <tr key={e.id} className={`hover:bg-slate-50 transition-colors ${!e.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {e.photoUrl ? (
                          <img src={e.photoUrl} alt={e.nom} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {initialesDe(e.nom)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {e.nom}{isMe && <span className="ml-2 text-xs text-primary">(vous)</span>}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            <span className="font-mono">{e.username}</span>
                            {e.email && ` · ${e.email}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
                        <Icon size={12} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {e.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 size={12} />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                          <EyeOff size={12} />
                          Désactivé
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {e.lastLoginAt ? fmtRelatif(e.lastLoginAt) : 'Jamais'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelected(e)}
                          className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded"
                          title="Voir le détail"
                        >
                          <Eye size={14} />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => setConfirmToggle(e)}
                            className="px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded"
                            title={e.isActive ? 'Désactiver' : 'Réactiver'}
                          >
                            <Power size={14} />
                          </button>
                        )}
                        {!isMe && (
                          <button
                            onClick={() => setConfirmDelete(e)}
                            className="px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création */}
      {showCreate && (
        <CreateEmployeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            toast.success('Employé créé.');
            charger();
          }}
          onError={(msg) => toast.error(msg)}
        />
      )}

      {/* Modal détail */}
      {selected && (
        <DetailEmployeModal
          employe={selected}
          isMe={selected.id === currentAdmin?.id}
          onClose={() => setSelected(null)}
          onChangeRole={() => setShowRoleChange(true)}
          onResetPwd={() => setShowResetPwd(true)}
          onDelete={() => setConfirmDelete(selected)}
          onUpdated={(updated) => {
            setSelected(updated);
            setEmployes((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            toast.success('Modifié.');
          }}
          onError={(msg) => toast.error(msg)}
        />
      )}

      {/* Modal changement de rôle */}
      {selected && showRoleChange && (
        <ChangeRoleModal
          employe={selected}
          onClose={() => setShowRoleChange(false)}
          onChanged={(updated) => {
            setSelected(updated);
            setEmployes((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setShowRoleChange(false);
            toast.success(`Rôle changé : ${ROLE_META[updated.role].label}`);
          }}
          onError={(msg) => toast.error(msg)}
        />
      )}

      {/* Modal reset password */}
      {selected && showResetPwd && (
        <ResetPasswordModal
          employe={selected}
          onClose={() => setShowResetPwd(false)}
          onDone={() => {
            setShowResetPwd(false);
            toast.success('Mot de passe réinitialisé.');
          }}
          onError={(msg) => toast.error(msg)}
        />
      )}

      {/* Confirmations */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isActive ? 'Désactiver le compte ?' : 'Réactiver le compte ?'}
        description={
          confirmToggle?.isActive
            ? `${confirmToggle?.nom} ne pourra plus se connecter tant que le compte n'est pas réactivé.`
            : `${confirmToggle?.nom} pourra de nouveau se connecter.`
        }
        confirmLabel={confirmToggle?.isActive ? 'Désactiver' : 'Réactiver'}
        variant={confirmToggle?.isActive ? 'danger' : 'primary'}
        onClose={() => setConfirmToggle(null)}
        onConfirm={async () => {
          if (!confirmToggle) return;
          try {
            const updated = await adminAccountApi.toggleActive(confirmToggle.id);
            setEmployes((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            toast.success(updated.isActive ? 'Compte réactivé.' : 'Compte désactivé.');
          } catch (e: any) {
            toast.error(errorMessage(e));
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Supprimer le compte "${confirmDelete?.nom}" ?`}
        description="Cette action est irréversible. L'historique de rôles et le journal d'activité seront supprimés."
        confirmLabel="Supprimer définitivement"
        variant="danger"
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await adminAccountApi.delete(confirmDelete.id);
            setEmployes((prev) => prev.filter((p) => p.id !== confirmDelete.id));
            setSelected(null);
            toast.success('Compte supprimé.');
          } catch (e: any) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </motion.div>
  );
};

/* ──── Modal Create ──────────────────────────────────────────────── */
const CreateEmployeModal = ({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) => {
  const [nom, setNom] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('CAISSIER');
  const [mdp, setMdp] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPinRole = role === 'CAISSIER' || role === 'VENDEUR';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAccountApi.create({
        nom: nom.trim(),
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        role,
        motDePasse: !isPinRole ? mdp : undefined,
        pin: isPinRole ? pin : undefined,
      });
      onCreated();
    } catch (e: any) {
      onError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => !submitting && onClose()}
    >
      <motion.form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-900">Nouvel employé</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Nom complet" required>
            <input
              required
              maxLength={100}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className={inputClass}
              placeholder="Ex : Jean Mbarga"
            />
          </Field>
          <Field label="Nom d'utilisateur" required>
            <input
              required
              minLength={3}
              maxLength={50}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`${inputClass} font-mono`}
              placeholder="Ex : jean_mbarga"
            />
          </Field>
          <Field label="Rôle" required>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              {ROLES_DISPONIBLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </select>
          </Field>
          {isPinRole ? (
            <Field label="PIN (4 à 6 chiffres)" required>
              <input
                required
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} text-center font-mono text-lg tracking-widest`}
                placeholder="1234"
              />
            </Field>
          ) : (
            <Field label="Mot de passe (min 8 caractères)" required>
              <input
                required
                type="password"
                minLength={8}
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Email (optionnel)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="optionnel@example.com"
            />
          </Field>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-2 justify-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting}>
            Créer
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
};

/* ──── Modal Detail ──────────────────────────────────────────────── */
const DetailEmployeModal = ({
  employe,
  isMe,
  onClose,
  onChangeRole,
  onResetPwd,
  onDelete,
  onUpdated,
  onError,
}: {
  employe: Employe;
  isMe: boolean;
  onClose: () => void;
  onChangeRole: () => void;
  onResetPwd: () => void;
  onDelete: () => void;
  onUpdated: (e: Employe) => void;
  onError: (msg: string) => void;
}) => {
  const meta = ROLE_META[employe.role];
  const Icon = meta.icon;
  const [tab, setTab] = useState<'info' | 'roles' | 'activity'>('info');
  const [roleHistory, setRoleHistory] = useState<RoleHistoryItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessStats, setBusinessStats] = useState<any>(null);
  const [editNom, setEditNom] = useState(employe.nom);
  const [editEmail, setEditEmail] = useState(employe.email || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tab === 'roles' && roleHistory.length === 0) {
      setHistoryLoading(true);
      adminAccountApi
        .getRoleHistory(employe.id)
        .then(setRoleHistory)
        .catch((e: any) => onError(errorMessage(e)))
        .finally(() => setHistoryLoading(false));
    }
    if (tab === 'activity' && activity.length === 0) {
      setActivityLoading(true);
      adminAccountApi
        .getActivity(employe.id, 50)
        .then(setActivity)
        .catch((e: any) => onError(errorMessage(e)))
        .finally(() => setActivityLoading(false));
    }
    if (tab === 'activity' && !businessStats && (employe.role === 'VENDEUR' || employe.role === 'CAISSIER')) {
      const periode = periodeCourante();
      setBusinessLoading(true);
      const request =
        employe.role === 'VENDEUR'
          ? primeApi.detailVendeur(employe.id, periode)
          : caisseJourApi.statsCaissier(employe.id, periode);
      request
        .then((data: any) => setBusinessStats({ role: employe.role, periode, data }))
        .catch((e: any) => onError(errorMessage(e)))
        .finally(() => setBusinessLoading(false));
    }
  }, [tab]);

  const sauverInfos = async () => {
    setSaving(true);
    try {
      const updated = await adminAccountApi.update(employe.id, {
        nom: editNom.trim(),
        email: editEmail.trim() || null,
      });
      onUpdated(updated);
    } catch (e: any) {
      onError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {employe.photoUrl ? (
              <img
                src={employe.photoUrl}
                alt={employe.nom}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {initialesDe(employe.nom)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg text-slate-900">{employe.nom}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
                <Icon size={12} />
                {meta.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          {(['info', 'roles', 'activity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'info' && (
                <span className="flex items-center justify-center gap-1.5">
                  <UsersIcon size={14} /> Infos
                </span>
              )}
              {t === 'roles' && (
                <span className="flex items-center justify-center gap-1.5">
                  <History size={14} /> Historique rôles
                </span>
              )}
              {t === 'activity' && (
                <span className="flex items-center justify-center gap-1.5">
                  <ListChecks size={14} /> Journal
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'info' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Username</p>
                  <p className="font-mono font-medium text-slate-900">{employe.username}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Statut</p>
                  <p className="font-medium text-slate-900">
                    {employe.isActive ? '✅ Actif' : '⏸ Désactivé'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Dernière connexion</p>
                  <p className="text-slate-900">
                    {employe.lastLoginAt ? fmtRelatif(employe.lastLoginAt) : 'Jamais'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Créé le</p>
                  <p className="text-slate-900">{fmtDateCourt(employe.createdAt)}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <Field label="Nom complet">
                  <input
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    maxLength={100}
                    className={inputClass}
                  />
                </Field>
                <Field label="Email (optionnel)">
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button onClick={sauverInfos} loading={saving}>
                    Enregistrer
                  </Button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={onChangeRole}>
                  Changer le rôle
                </Button>
                {employe.role !== 'CAISSIER' && employe.role !== 'VENDEUR' && (
                  <Button variant="secondary" onClick={onResetPwd}>
                    Réinitialiser mot de passe
                  </Button>
                )}
                {!isMe && (
                  <Button variant="danger" onClick={onDelete}>
                    Supprimer
                  </Button>
                )}
              </div>
            </>
          )}

          {tab === 'roles' && (
            <div>
              {historyLoading ? (
                <p className="text-center text-slate-400 py-6 text-sm">Chargement…</p>
              ) : roleHistory.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Aucun changement de rôle"
                  description="Ce compte n'a jamais changé de rôle depuis sa création."
                />
              ) : (
                <ul className="space-y-3">
                  {roleHistory.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="p-1.5 bg-white rounded text-slate-400">
                        <History size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">
                          <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">
                            {ROLE_META[h.oldRole]?.label}
                          </span>
                          {' → '}
                          <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {ROLE_META[h.newRole]?.label}
                          </span>
                        </p>
                        {h.motif && (
                          <p className="text-xs text-slate-600 mt-1 italic">« {h.motif} »</p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{fmtDateCourt(h.changedAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div>
              {(employe.role === 'VENDEUR' || employe.role === 'CAISSIER') && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">Activite du mois</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                      {businessStats?.periode || periodeCourante()}
                    </span>
                  </div>
                  {businessLoading ? (
                    <p className="py-3 text-sm text-slate-400">Chargement des statistiques...</p>
                  ) : employe.role === 'VENDEUR' ? (
                    (() => {
                      const tickets = Array.isArray(businessStats?.data) ? businessStats.data : [];
                      const montant = tickets.reduce((sum: number, t: any) => sum + Number(t.facture?.totalTTC ?? t.totalTTC ?? t.montantTotal ?? 0), 0);
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-white p-3">
                            <p className="text-xs text-slate-500">Tickets encaisses</p>
                            <p className="text-xl font-black text-primary">{tickets.length}</p>
                          </div>
                          <div className="rounded-lg bg-white p-3">
                            <p className="text-xs text-slate-500">Montant vendu</p>
                            <p className="text-xl font-black text-slate-900">{fmtFCFA(montant)}</p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs text-slate-500">Encaissements</p>
                        <p className="text-xl font-black text-primary">{businessStats?.data?.nbEncaissements ?? 0}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs text-slate-500">Montant encaisse</p>
                        <p className="text-lg font-black text-slate-900">{fmtFCFA(businessStats?.data?.montantTotal)}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs text-slate-500">Credits</p>
                        <p className="text-lg font-black text-amber-700">{fmtFCFA(businessStats?.data?.creditsAccordes)}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs text-slate-500">Ecarts</p>
                        <p className="text-lg font-black text-red-600">{fmtFCFA(businessStats?.data?.ecarts)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activityLoading ? (
                <p className="text-center text-slate-400 py-6 text-sm">Chargement…</p>
              ) : activity.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="Aucune activité enregistrée"
                  description="Le journal d'activité affichera ici les connexions et actions importantes."
                />
              ) : (
                <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {activity.map((a) => (
                    <li key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-mono text-xs font-semibold text-slate-700">{a.action}</p>
                        {a.details && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 whitespace-nowrap ml-2">
                        {fmtRelatif(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ──── Modal Change Role ─────────────────────────────────────────── */
const ChangeRoleModal = ({
  employe,
  onClose,
  onChanged,
  onError,
}: {
  employe: Employe;
  onClose: () => void;
  onChanged: (e: Employe) => void;
  onError: (msg: string) => void;
}) => {
  const [newRole, setNewRole] = useState<Role>(employe.role);
  const [motif, setMotif] = useState('');
  const [pinOrPwd, setPinOrPwd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const becomesPin =
    (newRole === 'CAISSIER' || newRole === 'VENDEUR') &&
    employe.role !== 'CAISSIER' &&
    employe.role !== 'VENDEUR';
  const becomesPwd =
    (newRole === 'SUPER_ADMIN' || newRole === 'ADMIN') &&
    (employe.role === 'CAISSIER' || employe.role === 'VENDEUR');

  const submit = async () => {
    if (newRole === employe.role) return;
    setSubmitting(true);
    try {
      const dto: any = { role: newRole, motifRole: motif.trim() || undefined };
      if (becomesPin) dto.pin = pinOrPwd;
      if (becomesPwd) dto.motDePasse = pinOrPwd;
      const updated = await adminAccountApi.update(employe.id, dto);
      onChanged(updated);
    } catch (e: any) {
      onError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={() => !submitting && onClose()}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-900">Changer le rôle</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{employe.nom}</span> est actuellement{' '}
            <span className="font-semibold">{ROLE_META[employe.role].label}</span>.
          </p>
          <Field label="Nouveau rôle">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className={inputClass}
            >
              {ROLES_DISPONIBLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </select>
          </Field>
          {becomesPin && (
            <Field label="Nouveau PIN (4-6 chiffres)" required>
              <input
                required
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                value={pinOrPwd}
                onChange={(e) => setPinOrPwd(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} text-center font-mono`}
                placeholder="1234"
              />
            </Field>
          )}
          {becomesPwd && (
            <Field label="Nouveau mot de passe (min 8 caractères)" required>
              <input
                required
                type="password"
                minLength={8}
                value={pinOrPwd}
                onChange={(e) => setPinOrPwd(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Motif (optionnel)">
            <input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              maxLength={255}
              className={inputClass}
              placeholder="Ex : promotion en charge de la boutique"
            />
          </Field>
        </div>
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            loading={submitting}
            disabled={newRole === employe.role || ((becomesPin || becomesPwd) && !pinOrPwd)}
          >
            Changer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ──── Modal Reset Password ───────────────────────────────────────── */
const ResetPasswordModal = ({
  employe,
  onClose,
  onDone,
  onError,
}: {
  employe: Employe;
  onClose: () => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) => {
  const [mdp, setMdp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminAccountApi.resetPassword(employe.id, mdp);
      onDone();
    } catch (err: any) {
      onError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={() => !submitting && onClose()}
    >
      <motion.form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-900">Réinitialiser le mot de passe</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-900 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Le nouveau mot de passe sera attribué à <strong>{employe.nom}</strong>. Communiquez-le
              en personne, ne l'envoyez pas par email.
            </span>
          </div>
          <Field label="Nouveau mot de passe (min 8 caractères)" required>
            <input
              required
              type="password"
              minLength={8}
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting} variant="danger">
            Réinitialiser
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
};

/* ──── Helpers UI ────────────────────────────────────────────────── */
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

// Silence lint pour AnimatePresence unused dans certains conteneurs
void AnimatePresence;
