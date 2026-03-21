import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PlusCircle, Search, Edit2, Trash2, Tag, X, Upload, Image as ImageIcon, AlertTriangle, Zap, Star, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { produitApi, categorieApi } from '../services/api';
import Papa from 'papaparse';

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
  imageUrl2?: string;
  imageUrl3?: string;
  prixDetail?: number;
  prixGros?: number;
  quantiteStock?: number;
  urlDatasheet?: string;
  prixPromo?: number;
  finPromo?: string;
  isPopulaire?: boolean;
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
  urlDatasheet: '',
  prixPromo: '',
  finPromo: '',
  isPopulaire: false,
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
  
  type ImageSlot = {
    url: string | null;      // Local Preview or Full HTTP URL
    file: File | null;       // New file
    isExisting: boolean;     // Whether it's from BDD
    dbUrl: string | null;    // The actual raw URL from DB
  };
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([
    { url: null, file: null, isExisting: false, dbUrl: null },
    { url: null, file: null, isExisting: false, dbUrl: null },
    { url: null, file: null, isExisting: false, dbUrl: null },
  ]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── State confirmation suppression ───────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── State Import CSV ─────────────────────────────────────────────────────
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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
    setImageSlots([
      { url: null, file: null, isExisting: false, dbUrl: null },
      { url: null, file: null, isExisting: false, dbUrl: null },
      { url: null, file: null, isExisting: false, dbUrl: null },
    ]);
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
      urlDatasheet: prod.urlDatasheet ?? '',
      prixPromo: prod.prixPromo != null ? String(prod.prixPromo) : '',
      finPromo: prod.finPromo ? prod.finPromo.slice(0, 16) : '', // format datetime-local
      isPopulaire: prod.isPopulaire ?? false,
    });
    const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');
    setImageSlots([
      { url: prod.imageUrl ? `${API_BASE}${prod.imageUrl.startsWith('/') ? '' : '/'}${prod.imageUrl}` : null, file: null, isExisting: !!prod.imageUrl, dbUrl: prod.imageUrl || null },
      { url: prod.imageUrl2 ? `${API_BASE}${prod.imageUrl2.startsWith('/') ? '' : '/'}${prod.imageUrl2}` : null, file: null, isExisting: !!prod.imageUrl2, dbUrl: prod.imageUrl2 || null },
      { url: prod.imageUrl3 ? `${API_BASE}${prod.imageUrl3.startsWith('/') ? '' : '/'}${prod.imageUrl3}` : null, file: null, isExisting: !!prod.imageUrl3, dbUrl: prod.imageUrl3 || null },
    ]);
    setIsModalOpen(true);
  };

  // ─── Fermer modale ────────────────────────────────────────────────────────
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduit(null);
    setFormData({ ...FORM_INITIAL });
    setImageSlots([
      { url: null, file: null, isExisting: false, dbUrl: null },
      { url: null, file: null, isExisting: false, dbUrl: null },
      { url: null, file: null, isExisting: false, dbUrl: null },
    ]);
  };

  // ─── Champ image ──────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && activeSlot !== null) {
      const file = e.target.files[0];
      setImageSlots(prev => {
        const newSlots = [...prev];
        newSlots[activeSlot] = {
          url: URL.createObjectURL(file),
          file: file,
          isExisting: false,
          dbUrl: null
        };
        return newSlots;
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      if (formData.urlDatasheet) dataToSend.append('urlDatasheet', formData.urlDatasheet);
      // ── Nouveaux champs promo / populaire ──
      // Toujours envoyer pour permettre de retirer une promo (le backend gère les chaînes vides → null)
      dataToSend.append('prixPromo', formData.prixPromo);
      dataToSend.append('finPromo', formData.finPromo ? new Date(formData.finPromo).toISOString() : '');
      dataToSend.append('isPopulaire', String(formData.isPopulaire));
      
      const existing = imageSlots.filter(s => s.isExisting && s.dbUrl).map(s => s.dbUrl);
      if (existing.length > 0) {
        dataToSend.append('existingImages', JSON.stringify(existing));
      } else {
        dataToSend.append('existingImages', '[]');
      }
      
      imageSlots.forEach(s => {
        if (s.file) dataToSend.append('files', s.file);
      });

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
    } catch (err: any) {
      console.error('Erreur soumission :', err);
      const msg = err.response?.data?.message || err.message;
      alert('Erreur technique : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-semibold shadow-sm"
          >
            <FileSpreadsheet size={18} />
            <span>Import CSV</span>
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCsvFile(file);
              setCsvResult(null);
              Papa.parse(file, {
                header: true,
                delimiter: ';',
                skipEmptyLines: true,
                complete: (results) => {
                  setCsvColumns(results.meta.fields || []);
                  setCsvPreview(results.data as Record<string, string>[]);
                  setIsCsvModalOpen(true);
                },
                error: () => alert('Erreur de lecture du fichier CSV.'),
              });
              e.target.value = '';
            }}
          />
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm"
          >
            <PlusCircle size={18} />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* Modale Import CSV ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCsvModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Prévisualisation Import CSV</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {csvFile?.name} — {csvColumns.length} colonnes — <span className="font-semibold text-emerald-600">{csvPreview.length} produit(s) détecté(s)</span>
                  </p>
                </div>
                <button
                  onClick={() => { setIsCsvModalOpen(false); setCsvResult(null); }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-auto flex-1 min-h-0">
                {csvPreview.length > 0 ? (
                  <div className="flex flex-col h-full">
                    <p className="text-xs text-slate-400 mb-2">
                      {csvPreview.length} produit(s) détecté(s) — {csvColumns.length} colonnes
                    </p>
                    <div className="overflow-auto rounded-lg border border-slate-200 max-h-[50vh]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-50">
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase">#</th>
                            {csvColumns.map((col) => (
                              <th key={col} className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="px-3 py-2 text-slate-400 font-mono text-xs">{i + 1}</td>
                              {csvColumns.map((col) => (
                                <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[200px] truncate">{row[col] ?? ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">Aucune donnée détectée dans le fichier.</p>
                )}

                {csvResult && (
                  <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${csvResult.startsWith('Erreur') ? 'bg-red-50 text-red-800' : csvResult.includes('Aucun nouveau') ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                    {csvResult.startsWith('Erreur') ? <XCircle size={20} className="flex-shrink-0 mt-0.5" /> : <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />}
                    <p className="text-sm font-medium">{csvResult}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
                <button
                  onClick={() => { setIsCsvModalOpen(false); setCsvResult(null); }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold transition-all"
                >
                  Annuler
                </button>
                <button
                  disabled={csvImporting || !csvFile || csvPreview.length === 0}
                  onClick={async () => {
                    if (!csvFile) return;
                    setCsvImporting(true);
                    setCsvResult(null);
                    try {
                      const result = await produitApi.importCsv(csvFile);
                      const msg = result?.message || 'Import terminé';
                      const importes = result?.produitsImportes ?? 0;
                      const ignores = result?.produitsIgnores ?? 0;
                      const newCats = result?.nouvellesCategories ?? [];
                      setCsvResult(importes > 0
                        ? `Import terminé avec succès ! ${importes} produit(s) importé(s), ${ignores} ignoré(s).${newCats.length ? ' Nouvelles catégories : ' + newCats.join(', ') : ''}`
                        : `Aucun nouveau produit importé — les ${ignores} produit(s) du fichier existent déjà en base.`);
                      // Refresh products list
                      try {
                        const [produitsData, categoriesData] = await Promise.all([
                          produitApi.getAll(),
                          categorieApi.getAll(),
                        ]);
                        setProduits(produitsData);
                        setCategories(categoriesData);
                      } catch { /* refresh failed — not critical */ }
                    } catch (err: any) {
                      const errMsg = err?.response?.data?.message || err?.message || 'Import échoué.';
                      setCsvResult(`Erreur : ${typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)}`);
                    } finally {
                      setCsvImporting(false);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    {csvImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {csvImporting ? 'Import en cours...' : "Confirmer l'import"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modale Ajout / Édition ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
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
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {/* Images (jusqu'à 3) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Images du Produit (jusqu'à 3)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {imageSlots.map((slot, idx) => (
                      <div key={idx} className="relative">
                        <div
                          onClick={() => {
                            setActiveSlot(idx);
                            fileInputRef.current?.click();
                          }}
                          className={`w-full aspect-square bg-slate-50 border-2 border-dashed ${slot.url ? 'border-primary/20 bg-primary/5' : 'border-slate-200'} rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-primary/50 transition-all overflow-hidden group`}
                        >
                          {slot.url ? (
                            <img src={slot.url} alt={`Aperçu ${idx + 1}`} className="w-full h-full object-contain group-hover:opacity-75 transition-opacity" />
                          ) : (
                            <>
                              <Upload className="text-slate-400 mb-1 group-hover:text-primary transition-colors" size={20} />
                              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Image {idx + 1}</span>
                            </>
                          )}
                        </div>
                        {slot.url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageSlots(prev => {
                                const newSlots = [...prev];
                                newSlots[idx] = { url: null, file: null, isExisting: false, dbUrl: null };
                                return newSlots;
                              });
                            }}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm ring-2 ring-white"
                            title="Supprimer l'image"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Cliquez sur une case pour ajouter/remplacer. Utilisez la suppression pour effacer une image.
                  </p>
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

                {/* Description & Datasheet */}
                <div className="grid grid-cols-1 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Lien Fiche Technique (PDF / Optionnel)
                    </label>
                    <input
                      type="url"
                      value={formData.urlDatasheet}
                      onChange={(e) => setFormData((f) => ({ ...f, urlDatasheet: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="https://exemple.com/datasheet.pdf"
                    />
                  </div>
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

                {/* ── Section Promotion & Mise en avant ──────────────────── */}
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    Promotion & Mise en avant
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Prix Promotionnel (FCFA)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={formData.prixPromo}
                        onChange={(e) => setFormData((f) => ({ ...f, prixPromo: e.target.value }))}
                        className="w-full px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300/30 outline-none transition-all"
                        placeholder="Laisser vide si pas de promo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date de fin de promo
                      </label>
                      <input
                        type="datetime-local"
                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        value={formData.finPromo}
                        onChange={(e) => setFormData((f) => ({ ...f, finPromo: e.target.value }))}
                        className="w-full px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300/30 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Toggle Populaire */}
                  <label className="flex items-center gap-3 mt-4 cursor-pointer select-none group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isPopulaire}
                        onChange={(e) => setFormData((f) => ({ ...f, isPopulaire: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-checked:bg-amber-500 rounded-full transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star size={14} className={`transition-colors ${formData.isPopulaire ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium text-slate-700">Mettre en avant (Populaire)</span>
                    </div>
                  </label>
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

        {/* ── Table (desktop) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Marque</th>
                <th className="px-6 py-4">Prix Détail</th>
                <th className="px-6 py-4">Prix Gros</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Chargement des produits...
                    </div>
                  </td>
                </tr>
              ) : filteredProduits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    Aucun produit trouvé.
                  </td>
                </tr>
              ) : (
                filteredProduits.map((prod) => {
                  const hasActivePromo = prod.prixPromo != null && prod.finPromo && new Date(prod.finPromo) > new Date();
                  return (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {prod.imageUrl ? (
                            <img
                              src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')}${prod.imageUrl.startsWith('/') ? '' : '/'}${prod.imageUrl}`}
                              alt={prod.nomProduit}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <ImageIcon size={20} className="text-slate-400 opacity-50" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{prod.nomProduit}</p>
                          <p className="text-xs text-slate-500 max-w-[200px] truncate">{prod.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        <Tag size={12} />
                        {prod.categorie?.nom || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{prod.marque}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                      {prod.prixDetail != null ? `${prod.prixDetail.toLocaleString('fr-FR')} FCFA` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {prod.prixGros != null ? `${prod.prixGros.toLocaleString('fr-FR')} FCFA` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                        (prod.quantiteStock ?? 0) > 10 ? 'bg-emerald-50 text-emerald-700'
                          : (prod.quantiteStock ?? 0) > 0 ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {prod.quantiteStock ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {hasActivePromo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                            <Zap size={10} className="fill-amber-500" />PROMO {prod.prixPromo?.toLocaleString('fr-FR')} FCFA
                          </span>
                        )}
                        {prod.isPopulaire && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            <Star size={10} className="fill-blue-500" />POPULAIRE
                          </span>
                        )}
                        {!hasActivePromo && !prod.isPopulaire && <span className="text-xs text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(prod)} title="Modifier" className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg">
                          <Edit2 size={16} />
                        </button>
                        {deletingId === prod.id ? (
                          <button onClick={() => handleDelete(prod.id)} className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors animate-pulse">
                            <AlertTriangle size={12} />Confirmer
                          </button>
                        ) : (
                          <button onClick={() => handleDelete(prod.id)} title="Supprimer" className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Cards (mobile) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="flex justify-center items-center gap-2 py-10 text-slate-400">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Chargement...
            </div>
          ) : filteredProduits.length === 0 ? (
            <p className="py-10 text-center text-slate-400">Aucun produit trouvé.</p>
          ) : (
            filteredProduits.map((prod) => {
              const hasActivePromo = prod.prixPromo != null && prod.finPromo && new Date(prod.finPromo) > new Date();
              return (
                <div key={prod.id} className="p-4 flex items-start gap-3">
                  <div className="size-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {prod.imageUrl ? (
                      <img
                        src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')}${prod.imageUrl.startsWith('/') ? '' : '/'}${prod.imageUrl}`}
                        alt={prod.nomProduit}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <ImageIcon size={22} className="text-slate-400 opacity-50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900 text-sm leading-tight">{prod.nomProduit}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditModal(prod)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg">
                          <Edit2 size={15} />
                        </button>
                        {deletingId === prod.id ? (
                          <button onClick={() => handleDelete(prod.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-red-500 rounded-lg animate-pulse">
                            <AlertTriangle size={10} />OK
                          </button>
                        ) : (
                          <button onClick={() => handleDelete(prod.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                        <Tag size={10} />{prod.categorie?.nom || 'N/A'}
                      </span>
                      <span className="text-[11px] text-slate-500">{prod.marque}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        (prod.quantiteStock ?? 0) > 10 ? 'bg-emerald-50 text-emerald-700'
                          : (prod.quantiteStock ?? 0) > 0 ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        Stock: {prod.quantiteStock ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {prod.prixDetail != null && (
                        <span className="text-sm font-semibold text-emerald-600">{prod.prixDetail.toLocaleString('fr-FR')} FCFA</span>
                      )}
                      {prod.prixGros != null && (
                        <span className="text-xs text-slate-500">Gros: {prod.prixGros.toLocaleString('fr-FR')}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hasActivePromo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                          <Zap size={9} className="fill-amber-500" />PROMO
                        </span>
                      )}
                      {prod.isPopulaire && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          <Star size={9} className="fill-blue-500" />POPULAIRE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer compteur */}
        {!loading && (
          <div className="px-4 md:px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filteredProduits.length} produit{filteredProduits.length !== 1 ? 's' : ''} affiché{filteredProduits.length !== 1 ? 's' : ''}
            {searchTerm && ` sur ${produits.length} au total`}
          </div>
        )}
      </div>
    </motion.div>
  );
};
