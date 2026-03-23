import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Edit2, Trash2, Shield, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { roleApi } from '../services/api';

/* ── Standalone Modal Form ────────────────────────────────────────────
   Extracted OUTSIDE the Roles component so React doesn't unmount
   it on every parent state change (avoids the "one character at a
   time" input bug).
──────────────────────────────────────────────────────────────────────*/
interface ModalFormProps {
  title: string;
  formData: { nom: string };
  setFormData: React.Dispatch<React.SetStateAction<{ nom: string }>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const ModalForm: React.FC<ModalFormProps> = ({ title, formData, setFormData, isSubmitting, onSubmit, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
    >
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom du rôle *</label>
          <input
            type="text" required maxLength={100}
            value={formData.nom}
            onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Ex: Administrateur"
            autoFocus
          />
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-50">
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
);

export const Roles = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; role: any }>({ open: false, role: null });
  const [formData, setFormData] = useState({ nom: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const fetchRoles = async () => {
    try {
      const data = await roleApi.getAll();
      setRoles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const resetForm = () => {
    setFormData({ nom: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await roleApi.create(formData);
      await fetchRoles();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du rôle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.role) return;
    try {
      setIsSubmitting(true);
      await roleApi.update(editModal.role.id, formData);
      await fetchRoles();
      setEditModal({ open: false, role: null });
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce rôle ?')) return;
    const prev = roles;
    setRoles(roles.filter(r => r.id !== id));
    try {
      await roleApi.delete(id);
    } catch (err) {
      setRoles(prev);
      alert('Erreur lors de la suppression.');
    }
  };

  const openEdit = (role: any) => {
    setFormData({ nom: role.nom });
    setEditModal({ open: true, role });
  };

  const filtered = roles.filter(r => r.nom?.toLowerCase().includes(search.toLowerCase()));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Rôles</h1>
          <p className="text-sm text-slate-500 mt-1">Créez et gérez les rôles utilisateur.</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouveau Rôle</span>
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && <ModalForm title="Ajouter un rôle" formData={formData} setFormData={setFormData} isSubmitting={isSubmitting} onSubmit={handleSubmit} onClose={() => setIsModalOpen(false)} />}
        {editModal.open && <ModalForm title="Modifier le rôle" formData={formData} setFormData={setFormData} isSubmitting={isSubmitting} onSubmit={handleEdit} onClose={() => setEditModal({ open: false, role: null })} />}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher un rôle..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>

        {/* ── Table (desktop) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nom du rôle</th>
                <th className="px-6 py-4">Date de création</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center">
                  <Shield size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun rôle trouvé.</p>
                </td></tr>
              ) : (
                filtered.map(role => (
                  <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Shield size={18} />
                        </div>
                        <span className="font-bold text-slate-900">{role.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(role.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(role)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(role.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
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
              <Shield size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun rôle trouvé.</p>
            </div>
          ) : (
            filtered.map(role => (
              <div key={role.id} className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Shield size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">{role.nom}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(role.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(role)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(role.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
