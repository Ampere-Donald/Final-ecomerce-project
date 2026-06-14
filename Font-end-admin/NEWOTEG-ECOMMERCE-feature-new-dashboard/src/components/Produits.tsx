import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PlusCircle, Search, Edit2, Trash2, Tag, X, Upload, Image as ImageIcon, AlertTriangle, Zap, Star, FileSpreadsheet, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { produitApi, categorieApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';
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
  prixDemiGros?: number;
  prixGros?: number;
  quantiteStock?: number;
  urlDatasheet?: string;
  prixPromo?: number;
  finPromo?: string;
  isPopulaire?: boolean;
  categorie?: Categorie;
  codeFamille?: string | null;
  code?: string | null;
}

// ─── État initial du formulaire isolé ─────────────────────────────────────────
const FORM_INITIAL = {
  nomProduit: '',
  marque: '',
  categorieId: '',
  description: '',
  prixDetail: '',
  prixDemiGros: '',
  prixGros: '',
  quantiteStock: '0',
  seuilAlerte: '5',
  urlDatasheet: '',
  prixPromo: '',
  finPromo: '',
  isPopulaire: false,
};

// ─── Helper: resolve image URL (Cloudinary absolute or legacy /uploads/) ─────
const resolveImgUrl = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');
  return `${API_BASE}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

// ─── Composant principal ──────────────────────────────────────────────────────
export const Produits = () => {
  const { admin } = useAdminAuth();
  const canDelete = can.deleteEntities(admin?.role);
  // ─── State liste & recherche (état global stable) ─────────────────────────
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [codeFamilleFilter, setCodeFamilleFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');

  // ─── State Pagination & Global Import ─────────────────────────────────────
  const [isGlobalImporting, setIsGlobalImporting] = useState(false);
  const [globalImportProgress, setGlobalImportProgress] = useState(0);
  const [globalImportMessage, setGlobalImportMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let localImporting = false; // keeps track of previous true state

    const checkStatus = async () => {
      try {
        const s = await produitApi.getImportStatus();
        if (s?.isImporting) {
          localImporting = true;
          setIsGlobalImporting(true);
          setGlobalImportProgress(s.progress || 0);
          if (s.message) setGlobalImportMessage(s.message);
        } else {
          // Backend finished or isn't importing
          if (localImporting) {
            localImporting = false;
            setGlobalImportProgress(100);
            if (s?.message) setGlobalImportMessage(s.message);
            
            // Wait 10 seconds before hiding
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              setIsGlobalImporting(false);
              timeoutId = null;
            }, 10000);
          } else {
            // Already false, ensure it stays hidden if not counting down
            if (!timeoutId) setIsGlobalImporting(false);
          }
        }
      } catch {}
    };
    
    checkStatus();
    const iv = setInterval(checkStatus, 3000);
    return () => {
      clearInterval(iv);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

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

  // ─── State Import CSV / ZIP ──────────────────────────────────────────────
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [importIsZip, setImportIsZip] = useState(false);
  const [zipImageCount, setZipImageCount] = useState(0);
  const [doublonsCart, setDoublonsCart] = useState<any[]>([]);
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
    let result = produits;

    if (categoryFilter) {
      result = result.filter(p => p.categorie?.id === categoryFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          (p.nomProduit ?? '').toLowerCase().includes(term) ||
          (p.marque ?? '').toLowerCase().includes(term)
      );
    }

    if (codeFamilleFilter.trim()) {
      const cf = codeFamilleFilter.trim().toLowerCase();
      result = result.filter(p => (p.codeFamille ?? '').toLowerCase().includes(cf));
    }

    if (codeFilter.trim()) {
      const c = codeFilter.trim().toLowerCase();
      result = result.filter(p => (p.code ?? '').toLowerCase().includes(c));
    }

    if (sortOrder === 'az') {
      result = [...result].sort((a, b) => (a.nomProduit || '').localeCompare(b.nomProduit || ''));
    } else if (sortOrder === 'za') {
      result = [...result].sort((a, b) => (b.nomProduit || '').localeCompare(a.nomProduit || ''));
    }

    return result;
  }, [produits, searchTerm, categoryFilter, sortOrder, codeFamilleFilter, codeFilter]);

  // ─── Pagination ──────────────────────────────────────────────────────────
  useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, sortOrder, codeFamilleFilter, codeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredProduits.length / itemsPerPage));
  const paginatedProduits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProduits.slice(start, start + itemsPerPage);
  }, [filteredProduits, currentPage]);

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
      prixDemiGros: prod.prixDemiGros != null ? String(prod.prixDemiGros) : '',
      prixGros: prod.prixGros != null ? String(prod.prixGros) : '',
      quantiteStock: prod.quantiteStock != null ? String(prod.quantiteStock) : '0',
      seuilAlerte: (prod as any).seuilAlerte != null ? String((prod as any).seuilAlerte) : '5',
      urlDatasheet: prod.urlDatasheet ?? '',
      prixPromo: prod.prixPromo != null ? String(prod.prixPromo) : '',
      finPromo: prod.finPromo ? prod.finPromo.slice(0, 16) : '', // format datetime-local
      isPopulaire: prod.isPopulaire ?? false,
    });
    setImageSlots([
      { url: resolveImgUrl(prod.imageUrl), file: null, isExisting: !!prod.imageUrl, dbUrl: prod.imageUrl || null },
      { url: resolveImgUrl(prod.imageUrl2), file: null, isExisting: !!prod.imageUrl2, dbUrl: prod.imageUrl2 || null },
      { url: resolveImgUrl(prod.imageUrl3), file: null, isExisting: !!prod.imageUrl3, dbUrl: prod.imageUrl3 || null },
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
      if (formData.prixDemiGros) dataToSend.append('prixDemiGros', formData.prixDemiGros);
      if (formData.prixGros) dataToSend.append('prixGros', formData.prixGros);
      dataToSend.append('quantiteStock', formData.quantiteStock || '0');
      dataToSend.append('seuilAlerte', formData.seuilAlerte || '5');
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
            disabled={isGlobalImporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold shadow-sm ${isGlobalImporting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            <FileSpreadsheet size={18} />
            <span>{isGlobalImporting ? 'Import en cours...' : 'Import CSV / ZIP'}</span>
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.zip"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCsvFile(file);
              setCsvResult(null);
              setUploadProgress(0);

              const isZip = file.name.toLowerCase().endsWith('.zip');
              setImportIsZip(isZip);

              if (isZip) {
                // Parse ZIP: extract CSV for preview + count images
                try {
                  const JSZip = (await import('jszip')).default;
                  const zip = await JSZip.loadAsync(file);
                  const csvContents: string[] = [];
                  let imgCount = 0;

                  for (const [name, entry] of Object.entries(zip.files)) {
                    if (entry.dir || name.startsWith('__MACOSX')) continue;
                    const lower = name.toLowerCase();
                    if (lower.endsWith('.csv')) {
                      csvContents.push(await entry.async('text'));
                    } else if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(lower)) {
                      imgCount++;
                    }
                  }

                  setZipImageCount(imgCount);

                  if (csvContents.length === 0) {
                    alert('Aucun fichier CSV trouvé dans le ZIP.');
                    e.target.value = '';
                    return;
                  }

                  // Merge all CSVs: parse each, combine rows, union columns
                  const allRows: Record<string, string>[] = [];
                  const allCols = new Set<string>();
                  for (const content of csvContents) {
                    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
                    (parsed.meta.fields || []).forEach(f => allCols.add(f));
                    allRows.push(...(parsed.data as Record<string, string>[]));
                  }
                  setCsvColumns(Array.from(allCols));
                  setCsvPreview(allRows.slice(0, 5));
                  setIsCsvModalOpen(true);
                } catch {
                  alert('Impossible de lire le fichier ZIP.');
                }
              } else {
                // Plain CSV
                setZipImageCount(0);
                Papa.parse(file, {
                  header: true,
                  preview: 5,
                  skipEmptyLines: true,
                  complete: (results) => {
                    setCsvColumns(results.meta.fields || []);
                    setCsvPreview(results.data as Record<string, string>[]);
                    setIsCsvModalOpen(true);
                  },
                  error: () => alert('Erreur de lecture du fichier CSV.'),
                });
              }
              e.target.value = '';
            }}
          />
          <button
            onClick={openAddModal}
            disabled={isGlobalImporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold shadow-sm ${isGlobalImporting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-opacity-90'}`}
          >
            <PlusCircle size={18} />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {isGlobalImporting && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-blue-800 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Importation en arrière-plan en cours...
            </span>
            <span className="text-sm font-bold text-blue-700">{Math.round(globalImportProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200/50 rounded-full h-3 overflow-hidden">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out" style={{ width: `${globalImportProgress}%` }}></div>
          </div>
          {globalImportMessage && (
            <p className="text-xs text-blue-600 mt-2 font-medium">{globalImportMessage}</p>
          )}
        </motion.div>
      )}

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
                  <h2 className="text-xl font-bold text-slate-800">
                    {importIsZip ? 'Import ZIP (CSV + Images)' : 'Prévisualisation Import CSV'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {csvFile?.name} — {csvColumns.length} colonnes détectées — <span className="font-semibold text-emerald-600">{csvPreview.length} produit(s) en aperçu</span>
                    {importIsZip && zipImageCount > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        <ImageIcon size={12} /> {zipImageCount} image{zipImageCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => { setIsCsvModalOpen(false); setCsvResult(null); setDoublonsCart([]); }}
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
                    <p className="text-sm font-medium whitespace-pre-line">{csvResult}</p>
                  </div>
                )}

                {/* ─── PANIER DE DOUBLONS (CART) ─── */}
                {doublonsCart.length > 0 && (
                  <div className="mt-6 border border-amber-200 rounded-xl overflow-hidden">
                    <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex items-center justify-between">
                      <h3 className="font-bold text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Panier de Doublons ({doublonsCart.length}) détectés lors de l'import
                      </h3>
                      <button onClick={() => setDoublonsCart([])} className="text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors">Vider le panier</button>
                    </div>
                    <div className="divide-y divide-amber-100 max-h-64 overflow-y-auto bg-white">
                      {doublonsCart.map((d, i) => (
                        <div key={i} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{d.existing.nomProduit}</p>
                            <p className="text-xs text-slate-500">Marque: {d.existing.marque || 'N/A'} — Ce produit existe déjà dans le catalogue.</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setIsCsvModalOpen(false);
                                // Pré-remplir l'édition avec l'existant + fusionner les nouvelles valeurs pertinentes
                                openEditModal({
                                  ...d.existing,
                                  prixDetail: d.newData.prixDetail || d.existing.prixDetail,
                                  prixGros: d.newData.prixGros || d.existing.prixGros,
                                  quantiteStock: (d.existing.quantiteStock || 0) + (d.newData.quantiteStock || 0),
                                });
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 transition-colors"
                            >
                              Éditer / Fusionner
                            </button>
                            <button 
                              onClick={() => setDoublonsCart(prev => prev.filter((_, idx) => idx !== i))}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                            >
                              Ignorer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
                <button
                  onClick={() => { setIsCsvModalOpen(false); setCsvResult(null); setDoublonsCart([]); }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold transition-all"
                >
                  Fermer
                </button>
                <button
                  disabled={csvImporting || !csvFile || csvPreview.length === 0}
                  onClick={async () => {
                    if (!csvFile) return;
                    setCsvImporting(true);
                    setCsvResult(null);
                    setUploadProgress(0);
                    try {
                      let result: any;
                      if (importIsZip) {
                        result = await produitApi.importZip(csvFile, (pct) => setUploadProgress(pct));
                      } else {
                        result = await produitApi.importCsv(csvFile);
                      }
                      setCsvResult(result?.message || "Importation lancée en arrière-plan.");
                      if (result?.doublons && result.doublons.length > 0) {
                        setDoublonsCart(result.doublons);
                      } else {
                        setDoublonsCart([]);
                        setTimeout(() => {
                           setIsCsvModalOpen(false);
                           setCsvResult(null);
                        }, 3000);
                      }
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
                      setUploadProgress(0);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {csvImporting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      <span>{uploadProgress > 0 && uploadProgress < 100 ? `Upload ${uploadProgress}%...` : 'Import en cours...'}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Upload size={18} />
                      <span>Confirmer l'import</span>
                    </span>
                  )}
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
                      Prix Demi-Gros (FCFA)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={formData.prixDemiGros}
                      onChange={(e) => setFormData((f) => ({ ...f, prixDemiGros: e.target.value }))}
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
                      Quantité
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Seuil d'alerte
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={formData.seuilAlerte}
                      onChange={(e) => setFormData((f) => ({ ...f, seuilAlerte: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="5"
                    />
                    <p className="text-xs text-slate-400 mt-1">Alerte si stock ≤ ce seuil</p>
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
        {/* Barre de recherche et Filtres */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom ou marque…"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-slate-600 transition-all font-medium"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-slate-600 transition-all font-medium"
            >
              <option value="newest">Les plus récents</option>
              <option value="az">Alphabétique (A-Z)</option>
              <option value="za">Alphabétique (Z-A)</option>
            </select>
          </div>

          {/* Recherche par code famille / code */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0">Code :</span>
            <div className="flex gap-2 flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={codeFamilleFilter}
                  onChange={(e) => setCodeFamilleFilter(e.target.value)}
                  placeholder="Code famille (ex: 101)"
                  className="w-44 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-300/40 outline-none transition-all placeholder:font-sans placeholder:text-slate-400"
                />
              </div>
              <span className="self-center text-slate-400 font-bold">/</span>
              <div className="relative">
                <input
                  type="text"
                  value={codeFilter}
                  onChange={(e) => setCodeFilter(e.target.value)}
                  placeholder="Code (ex: 101001)"
                  className="w-44 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-300/40 outline-none transition-all placeholder:font-sans placeholder:text-slate-400"
                />
              </div>
              {(codeFamilleFilter || codeFilter) && (
                <button
                  onClick={() => { setCodeFamilleFilter(''); setCodeFilter(''); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <X size={13} /> Effacer
                </button>
              )}
            </div>
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
                <th className="px-6 py-4">Quantité</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actes</th>
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
              ) : paginatedProduits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    Aucun produit trouvé.
                  </td>
                </tr>
              ) : (
                paginatedProduits.map((prod) => {
                  const hasActivePromo = prod.prixPromo != null && prod.finPromo && new Date(prod.finPromo) > new Date();
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {prod.imageUrl ? (
                              <img
                                src={resolveImgUrl(prod.imageUrl)!}
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
                            {prod.codeFamille && prod.code ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-600 mt-0.5">
                                {prod.codeFamille}/{prod.code}
                              </span>
                            ) : (
                              <p className="text-xs text-slate-500 max-w-[200px] truncate">{prod.description}</p>
                            )}
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${(prod.quantiteStock ?? 0) > 10 ? 'bg-emerald-50 text-emerald-700'
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
                          {canDelete && (deletingId === prod.id ? (
                            <button onClick={() => handleDelete(prod.id)} className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors animate-pulse">
                              <AlertTriangle size={12} />Confirmer
                            </button>
                          ) : (
                            <button onClick={() => handleDelete(prod.id)} title="Supprimer" className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg">
                              <Trash2 size={16} />
                            </button>
                          ))}
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
          ) : paginatedProduits.length === 0 ? (
            <p className="py-10 text-center text-slate-400">Aucun produit trouvé.</p>
          ) : (
            paginatedProduits.map((prod) => {
              const hasActivePromo = prod.prixPromo != null && prod.finPromo && new Date(prod.finPromo) > new Date();
              return (
                <div key={prod.id} className="p-4 flex items-start gap-3">
                  <div className="size-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {prod.imageUrl ? (
                      <img
                        src={resolveImgUrl(prod.imageUrl)!}
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
                        {canDelete && (deletingId === prod.id ? (
                          <button onClick={() => handleDelete(prod.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-red-500 rounded-lg animate-pulse">
                            <AlertTriangle size={10} />OK
                          </button>
                        ) : (
                          <button onClick={() => handleDelete(prod.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={15} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                        <Tag size={10} />{prod.categorie?.nom || 'N/A'}
                      </span>
                      <span className="text-[11px] text-slate-500">{prod.marque}</span>
                      {prod.codeFamille && prod.code && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-600">
                          {prod.codeFamille}/{prod.code}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${(prod.quantiteStock ?? 0) > 10 ? 'bg-emerald-50 text-emerald-700'
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
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 md:px-6 py-3 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
            <div>
              Affichage {filteredProduits.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredProduits.length)} sur {filteredProduits.length} produit(s)
              {searchTerm && ` (filtrés sur ${produits.length} au total)`}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1 mt-3 sm:mt-0">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                     let pageNum = i + 1;
                     if (totalPages > 5 && currentPage > 3) {
                       pageNum = Math.min(totalPages - 4 + i, currentPage - 2 + i);
                     }
                     return (
                       <button
                         key={pageNum}
                         onClick={() => setCurrentPage(pageNum)}
                         className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === pageNum ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                       >
                         {pageNum}
                       </button>
                     );
                  })}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
