import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PlusCircle, Search, Edit2, Trash2, Tag, X, Upload, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { produitApi, categorieApi } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Categorie {
  id: string;
  nom: string;
}

interface Produit {
  id: string;
  nomProduit: string;
  marque: string;
  description?: string;
  imageUrl?: string;
  prixDetail?: number;
  prixGros?: number;
  quantiteStock?: number;
  categorie?: Categorie;
}

// ─── État initial du formulaire isolé ─────────────────────────────────────────
const FORM_INITIAL = {
  nomProduit: '',
  marque: '',
  categorieId: '',
  description: '',
  prixDetail: '',
  prixGros: '',
  quantiteStock: '0',
};

// ─── Composant principal ──────────────────────────────────────────────────────
export const Produits = () => {
  // ─── State liste & recherche (état global stable) ─────────────────────────
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ─── State modale (état local isolé → pas de re-rendu du tableau) ─────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null);
  const [formData, setFormData] = useState({ ...FORM_INITIAL });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── State confirmation suppression ───────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Chargement initial unique ([] strict) ────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [produitsData, categoriesData] = await Promise.all([
          produitApi.getAll(),
          categorieApi.getAll(),
        ]);
        setProduits(produitsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Erreur chargement :', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []); // ← TABLEAU VIDE STRICT : un seul appel au montage

  // ─── Liste filtrée mémoïsée (0 appel API, insensible à la casse) ─────────
  const filteredProduits = useMemo(() => {
    if (!searchTerm.trim()) return produits;
    const term = searchTerm.toLowerCase();
    return produits.filter(
      (p) =>
        (p.nomProduit ?? '').toLowerCase().includes(term) ||
        (p.marque ?? '').toLowerCase().includes(term)
    );
  }, [produits, searchTerm]);

  // ─── Ouvrir modale Ajout ──────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingProduit(null);
    setFormData({ ...FORM_INITIAL });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  // ─── Ouvrir modale Édition (pré-remplissage) ──────────────────────────────
  const openEditModal = (prod: Produit) => {
    setEditingProduit(prod);
    setFormData({
      nomProduit: prod.nomProduit ?? '',
      marque: prod.marque ?? '',
      categorieId: prod.categorie?.id ?? '',
      description: prod.description ?? '',
      prixDetail: prod.prixDetail != null ? String(prod.prixDetail) : '',
      prixGros: prod.prixGros != null ? String(prod.prixGros) : '',
      quantiteStock: prod.quantiteStock != null ? String(prod.quantiteStock) : '0',
    });
    setImageFile(null);
    setImagePreview(prod.imageUrl ? `http://localhost:3000${prod.imageUrl}` : null);
    setIsModalOpen(true);
  };

  // ─── Fermer modale ────────────────────────────────────────────────────────
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduit(null);
    setFormData({ ...FORM_INITIAL });
    setImageFile(null);
    setImagePreview(null);
  };

  // ─── Champ image ──────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // ─── Soumission formulaire (Création ou Édition) ──────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSend = new FormData();
      dataToSend.append('nomProduit', formData.nomProduit);
      dataToSend.append('marque', formData.marque);
      dataToSend.append('categorieId', formData.categorieId);
      if (formData.description) dataToSend.append('description', formData.description);
      if (formData.prixDetail) dataToSend.append('prixDetail', formData.prixDetail);
      if (formData.prixGros) dataToSend.append('prixGros', formData.prixGros);
      dataToSend.append('quantiteStock', formData.quantiteStock || '0');
      if (imageFile) dataToSend.append('file', imageFile);

      if (editingProduit) {
        // ─── Mise à jour ─────────────────────────────────────────────────
        const updated = await produitApi.update(editingProduit.id, dataToSend);
        setProduits((prev) =>
          prev.map((p) => (p.id === editingProduit.id ? { ...p, ...updated } : p))
        );
      } else {
        // ─── Création (mise à jour optimiste) ────────────────────────────
        const newProduit = await produitApi.create(dataToSend);
        setProduits((prev) => [newProduit, ...prev]);
      }

      closeModal();
    } catch (err) {
      console.error('Erreur soumission :', err);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Suppression avec confirmation (optimiste) ───────────────────────────
  const handleDelete = async (id: string) => {
    if (deletingId !== id) {
      setDeletingId(id); // Première pression → affiche confirmation
      return;
    }
    // Deuxième pression → on supprime
    setProduits((prev) => prev.filter((p) => p.id !== id)); // optimiste
    setDeletingId(null);
    try {
      await produitApi.delete(id);
    } catch (err) {
      console.error('Erreur suppression :', err);
      // Révocation si l'API échoue : on recharge
      const produitsData = await produitApi.getAll();
      setProduits(produitsData);
      alert('La suppression a échoué.');
    }
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* En-tête ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalogue Produits</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez vos produits de base et leurs marques principales.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm"
        >
          <PlusCircle size={18} />
          <span>Nouveau Produit</span>
        </button>
      </div>

      {/* Modale Ajout / Édition ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              {/* Header modale */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingProduit ? 'Modifier le produit' : 'Ajouter un produit'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Image du Produit
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-primary/50 transition-all overflow-hidden"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Aperçu" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Upload className="text-slate-400 mb-2" size={24} />
                        <span className="text-sm text-slate-500">Cliquez pour ajouter une image</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="text-xs text-red-500 mt-1 hover:underline flex items-center gap-1"
                    >
                      <X size={12} /> Retirer l'image
                    </button>
                  )}
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom du Produit *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={formData.nomProduit}
                    onChange={(e) => setFormData((f) => ({ ...f, nomProduit: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Ex: Transistor NPN 2N3904"
                  />
                </div>

                {/* Catégorie + Marque */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Catégorie *
                    </label>
                    <select
                      required
                      value={formData.categorieId}
                      onChange={(e) => setFormData((f) => ({ ...f, categorieId: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Sélectionner...</option>
                      {categories.length === 0 ? (
                        <option value="" disabled>
                          Chargement des catégories...
                        </option>
                      ) : (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nom}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Marque *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={formData.marque}
                      onChange={(e) => setFormData((f) => ({ ...f, marque: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Ex: Texas Instruments"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description (Optionnel)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    placeholder="Détails techniques du produit..."
                  />
                </div>

                {/* Prix & Stock */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Prix Détail (FCFA)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={formData.prixDetail}
                      onChange={(e) => setFormData((f) => ({ ...f, prixDetail: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Prix Gros (FCFA)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={formData.prixGros}
                      onChange={(e) => setFormData((f) => ({ ...f, prixGros: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Stock
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={formData.quantiteStock}
                      onChange={(e) => setFormData((f) => ({ ...f, quantiteStock: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Boutons */}
                <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? editingProduit ? 'Mise à jour...' : 'Création...'
                      : editingProduit ? 'Mettre à jour' : 'Créer le produit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tableau ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Barre de recherche */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom ou marque..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Marque</th>
                <th className="px-6 py-4">Prix Détail</th>
                <th className="px-6 py-4">Prix Gros</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Chargement des produits...
                    </div>
                  </td>
                </tr>
              ) : filteredProduits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    Aucun produit trouvé.
                  </td>
                </tr>
              ) : (
                filteredProduits.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    {/* Image + Nom */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {prod.imageUrl ? (
                            <img
                              src={`http://localhost:3000${prod.imageUrl.startsWith('/') ? '' : '/'}${prod.imageUrl}`}
                              alt={prod.nomProduit}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.warn('[IMAGE ERROR]', `http://localhost:3000${prod.imageUrl}`);
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <ImageIcon size={20} className="text-slate-400 opacity-50" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{prod.nomProduit}</p>
                          <p className="text-xs text-slate-500 max-w-[200px] truncate">
                            {prod.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Catégorie */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        <Tag size={12} />
                        {prod.categorie?.nom || 'N/A'}
                      </span>
                    </td>

                    {/* Marque */}
                    <td className="px-6 py-4 font-medium text-slate-700">{prod.marque}</td>

                    {/* Prix Détail */}
                    <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                      {prod.prixDetail != null ? `${prod.prixDetail.toLocaleString('fr-FR')} FCFA` : '—'}
                    </td>

                    {/* Prix Gros */}
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {prod.prixGros != null ? `${prod.prixGros.toLocaleString('fr-FR')} FCFA` : '—'}
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                        (prod.quantiteStock ?? 0) > 10
                          ? 'bg-emerald-50 text-emerald-700'
                          : (prod.quantiteStock ?? 0) > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                      }`}>
                        {prod.quantiteStock ?? 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Bouton Modifier */}
                        <button
                          onClick={() => openEditModal(prod)}
                          title="Modifier"
                          className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Bouton Supprimer avec double confirmation */}
                        {deletingId === prod.id ? (
                          <button
                            onClick={() => handleDelete(prod.id)}
                            title="Confirmer la suppression"
                            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors animate-pulse"
                          >
                            <AlertTriangle size={12} />
                            Confirmer
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(prod.id)}
                            title="Supprimer"
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer compteur */}
        {!loading && (
          <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filteredProduits.length} produit{filteredProduits.length !== 1 ? 's' : ''} affiché{filteredProduits.length !== 1 ? 's' : ''}
            {searchTerm && ` sur ${produits.length} au total`}
          </div>
        )}
      </div>
    </motion.div>
  );
};
