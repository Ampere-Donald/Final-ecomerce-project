import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Edit2, Trash2, Tags, X, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { categorieApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

/* ── Standalone Modal Form ────────────────────────────────────────────
   Extracted OUTSIDE the Categories component so React doesn't unmount
   it on every parent state change (this was the root cause of the
   "one character at a time" input bug).
──────────────────────────────────────────────────────────────────────*/
interface ModalFormProps {
  title: string;
  formData: { nom: string; description: string };
  setFormData: React.Dispatch<React.SetStateAction<{ nom: string; description: string }>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageClear: () => void;
}

const ModalForm: React.FC<ModalFormProps> = ({ title, formData, setFormData, isSubmitting, onSubmit, onClose, imagePreview, onImageChange, onImageClear }) => (
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la categorie *</label>
          <input
            type="text" required maxLength={100}
            value={formData.nom}
            onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Ex: Electronique"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optionnel)</label>
          <textarea
            rows={3} value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            placeholder="Description de la categorie..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Image (Optionnel)</label>
          {imagePreview ? (
            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
              <img src={imagePreview} alt="Apercu" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={onImageClear}
                className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-full hover:bg-white transition-colors shadow-sm"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
              <ImagePlus size={24} className="text-slate-400 mb-1" />
              <span className="text-xs text-slate-500">Cliquez pour choisir une image</span>
              <input
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className="hidden"
              />
            </label>
          )}
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

export const Categories = () => {
  const { admin } = useAdminAuth();
  const canDelete = can.deleteEntities(admin?.role);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; cat: any }>({ open: false, cat: null });
  const [formData, setFormData] = useState({ nom: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const data = await categorieApi.getAll();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setFormData({ nom: '', description: '' });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const created = await categorieApi.create(formData);
      if (imageFile) {
        await categorieApi.uploadImage(created.id, imageFile);
      }
      await fetchCategories();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la creation de la categorie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.cat) return;
    try {
      setIsSubmitting(true);
      await categorieApi.update(editModal.cat.id, formData);
      if (imageFile) {
        await categorieApi.uploadImage(editModal.cat.id, imageFile);
      }
      await fetchCategories();
      setEditModal({ open: false, cat: null });
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise a jour.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette categorie ?')) return;
    try {
      await categorieApi.delete(id);
      await fetchCategories();
    } catch (err) {
      alert('Erreur lors de la suppression.');
    }
  };

  const openEdit = (cat: any) => {
    setFormData({ nom: cat.nom, description: cat.description || '' });
    setImageFile(null);
    setImagePreview(cat.imageUrl || null);
    setEditModal({ open: true, cat });
  };

  const filtered = categories.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories de Produits</h1>
          <p className="text-sm text-slate-500 mt-1">Gerez la classification de votre catalogue.</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouvelle Categorie</span>
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && <ModalForm title="Ajouter une categorie" formData={formData} setFormData={setFormData} isSubmitting={isSubmitting} onSubmit={handleSubmit} onClose={() => setIsModalOpen(false)} imagePreview={imagePreview} onImageChange={handleImageChange} onImageClear={clearImage} />}
        {editModal.open && <ModalForm title="Modifier la categorie" formData={formData} setFormData={setFormData} isSubmitting={isSubmitting} onSubmit={handleEdit} onClose={() => setEditModal({ open: false, cat: null })} imagePreview={imagePreview} onImageChange={handleImageChange} onImageClear={clearImage} />}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher une categorie..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>
        {/* ── Table (desktop) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nom de la categorie</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Produits</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center">
                  <Tags size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucune categorie trouvee.</p>
                </td></tr>
              ) : (
                filtered.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt={cat.nom} className="w-full h-full object-cover" />
                          ) : (
                            <Tags size={18} />
                          )}
                        </div>
                        <span className="font-bold text-slate-900">{cat.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{cat.description || <span className="italic text-slate-300">&mdash;</span>}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary">{cat._count?.produits ?? cat.produits?.length ?? 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(cat)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                        {canDelete && (<button onClick={() => handleDelete(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-slate-100 rounded-lg"><Trash2 size={16} /></button>)}
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
              <Tags size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucune categorie trouvee.</p>
            </div>
          ) : (
            filtered.map(cat => (
              <div key={cat.id} className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.nom} className="w-full h-full object-cover" />
                  ) : (
                    <Tags size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">{cat.nom}</p>
                  {cat.description && <p className="text-xs text-slate-500 truncate">{cat.description}</p>}
                  <p className="text-xs font-semibold text-primary mt-0.5">{cat._count?.produits ?? cat.produits?.length ?? 0} produit{(cat._count?.produits ?? 0) !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(cat)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                  {canDelete && (<button onClick={() => handleDelete(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
