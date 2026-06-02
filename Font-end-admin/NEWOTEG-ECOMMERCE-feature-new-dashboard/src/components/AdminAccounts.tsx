import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, X, Pencil, Trash2, UserCog, Key, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { adminAccountApi, adminRoleApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CAISSIER', 'VENDEUR'];

const roleBadge = (role: string) => {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-violet-100 text-violet-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    MANAGER: 'bg-slate-100 text-slate-700',
    CAISSIER: 'bg-amber-100 text-amber-700',
    VENDEUR: 'bg-emerald-100 text-emerald-700',
  };
  return colors[role] || 'bg-slate-100 text-slate-600';
};

export const AdminAccounts = () => {
  const { admin: currentAdmin } = useAdminAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    nom: '', email: '', motDePasse: '', role: 'ADMIN',
  });

  const fetchAdmins = async () => {
    try {
      const data = await adminAccountApi.getAll();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingAdmin) {
        const { motDePasse, ...updateData } = formData;
        const updated = await adminAccountApi.update(editingAdmin.id, updateData);
        setAdmins(prev => prev.map(a => a.id === editingAdmin.id ? { ...a, ...updated } : a));
      } else {
        await adminAccountApi.create(formData);
        await fetchAdmins();
      }
      setIsModalOpen(false);
      setEditingAdmin(null);
      setFormData({ nom: '', email: '', motDePasse: '', role: 'ADMIN' });
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur lors de l\'opération.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (a: any) => {
    setEditingAdmin(a);
    setFormData({ nom: a.nom || '', email: a.email || '', motDePasse: '', role: a.role || 'ADMIN' });
    setIsModalOpen(true);
  };

  const handleDelete = async (a: any) => {
    if (a.id === currentAdmin?.id) return alert('Vous ne pouvez pas supprimer votre propre compte.');
    if (!confirm(`Supprimer le compte "${a.nom}" ? Cette action est irréversible.`)) return;
    try {
      setAdmins(prev => prev.filter(item => item.id !== a.id));
      await adminAccountApi.delete(a.id);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression.');
      await fetchAdmins();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget || !newPassword) return;
    try {
      setIsSubmitting(true);
      await adminAccountApi.resetPassword(passwordTarget.id, newPassword);
      alert('Mot de passe réinitialisé avec succès.');
      setIsPasswordModalOpen(false);
      setPasswordTarget(null);
      setNewPassword('');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la réinitialisation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (a: any) => {
    if (a.id === currentAdmin?.id) return;
    try {
      const updated = await adminAccountApi.update(a.id, { isActive: !a.isActive });
      setAdmins(prev => prev.map(item => item.id === a.id ? { ...item, ...updated } : item));
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangerRoleInline = async (a: any, newRole: string) => {
    if (a.id === currentAdmin?.id) return;
    if (newRole === a.role) return;
    try {
      await adminRoleApi.changerRole(a.id, newRole);
      setAdmins(prev => prev.map(item => item.id === a.id ? { ...item, role: newRole } : item));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors du changement de rôle.');
    }
  };

  const filtered = admins.filter(a =>
    a.nom?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comptes Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les comptes administrateurs et managers.</p>
        </div>
        <button onClick={() => { setEditingAdmin(null); setFormData({ nom: '', email: '', motDePasse: '', role: 'ADMIN' }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouveau Compte</span>
        </button>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">{editingAdmin ? 'Modifier le compte' : 'Créer un compte'}</h2>
                <button onClick={() => { setIsModalOpen(false); setEditingAdmin(null); }} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
                  <input type="text" required value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Nom Prénom" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" placeholder="admin@newoteg.com" />
                </div>
                {!editingAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe *</label>
                    <input type="password" required={!editingAdmin} minLength={6} value={formData.motDePasse} onChange={e => setFormData({ ...formData, motDePasse: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Min. 6 caractères" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rôle *</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                    {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingAdmin(null); }} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'En cours...' : (editingAdmin ? 'Modifier' : 'Créer le compte')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && passwordTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Réinitialiser le mot de passe</h2>
                <button onClick={() => { setIsPasswordModalOpen(false); setPasswordTarget(null); setNewPassword(''); }} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                <p className="text-sm text-slate-500">Compte : <strong>{passwordTarget.nom}</strong> ({passwordTarget.email})</p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe *</label>
                  <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Min. 6 caractères" />
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => { setIsPasswordModalOpen(false); setPasswordTarget(null); setNewPassword(''); }} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'En cours...' : 'Réinitialiser'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher un compte..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nom</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Dernière connexion</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <UserCog size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun compte trouvé.</p>
                </td></tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {(a.nom || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="font-bold text-slate-900">{a.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{a.email}</td>
                    <td className="px-6 py-4">
                      {a.id === currentAdmin?.id ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleBadge(a.role)}`}>{a.role}</span>
                      ) : (
                        <select
                          value={a.role}
                          onChange={e => handleChangerRoleInline(a, e.target.value)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold border-0 outline-none cursor-pointer ${roleBadge(a.role)}`}
                        >
                          {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggleActive(a)} disabled={a.id === currentAdmin?.id}
                        className={`flex items-center gap-1.5 text-xs font-semibold ${a.isActive ? 'text-green-600' : 'text-red-500'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {a.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {a.isActive ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(a.lastLoginAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(a)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => { setPasswordTarget(a); setIsPasswordModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Réinitialiser MDP">
                          <Key size={16} />
                        </button>
                        <button onClick={() => handleDelete(a)} disabled={a.id === currentAdmin?.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <UserCog size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun compte trouvé.</p>
            </div>
          ) : (
            filtered.map(a => (
              <div key={a.id} className="p-4 flex items-start gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {(a.nom || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{a.nom}</p>
                      <p className="text-xs text-slate-500">{a.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${roleBadge(a.role)}`}>{a.role}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-semibold ${a.isActive ? 'text-green-600' : 'text-red-500'}`}>{a.isActive ? 'Actif' : 'Inactif'}</span>
                    <span className="text-xs text-slate-400">| {formatDate(a.lastLoginAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <button onClick={() => handleEdit(a)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => { setPasswordTarget(a); setIsPasswordModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Key size={14} /></button>
                    <button onClick={() => handleToggleActive(a)} disabled={a.id === currentAdmin?.id} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30">
                      {a.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => handleDelete(a)} disabled={a.id === currentAdmin?.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
