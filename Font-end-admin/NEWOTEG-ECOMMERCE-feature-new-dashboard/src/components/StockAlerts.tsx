import React, { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Search, Package, Filter, Edit2, Check, X, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { produitApi, categorieApi } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Categorie {
  id: string;
  nom: string;
}

interface LowStockProduit {
  id: string;
  nomProduit: string;
  marque: string;
  quantiteStock: number;
  seuilAlerte: number;
  imageUrl?: string;
  categorieId?: string;
  categorieNom?: string;
}

type StatusFilter = 'all' | 'rupture' | 'critique';

// ─── Helper: resolve image URL (Cloudinary absolute or legacy /uploads/) ─────
const resolveImgUrl = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');
  return `${API_BASE}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

// ─── Composant principal ──────────────────────────────────────────────────────
export const StockAlerts = () => {
  const [produits, setProduits] = useState<LowStockProduit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // ─── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockResult, catResult] = await Promise.allSettled([
        produitApi.getLowStock(),
        categorieApi.getAll(),
      ]);

      if (stockResult.status === 'fulfilled') {
        setProduits(stockResult.value);
      } else {
        setError('Impossible de charger les alertes de stock.');
        console.error(stockResult.reason);
      }

      if (catResult.status === 'fulfilled') {
        setCategories(catResult.value);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Computed stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const rupture = produits.filter(p => p.quantiteStock === 0).length;
    const critique = produits.filter(p => p.quantiteStock > 0 && p.quantiteStock <= p.seuilAlerte).length;
    return { total: produits.length, rupture, critique };
  }, [produits]);

  // ─── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = produits;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.nomProduit || '').toLowerCase().includes(q) ||
        (p.marque || '').toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      result = result.filter(p => p.categorieId === categoryFilter || p.categorieNom === categoryFilter);
    }

    if (statusFilter === 'rupture') {
      result = result.filter(p => p.quantiteStock === 0);
    } else if (statusFilter === 'critique') {
      result = result.filter(p => p.quantiteStock > 0 && p.quantiteStock <= p.seuilAlerte);
    }

    return result;
  }, [produits, search, categoryFilter, statusFilter]);

  // ─── Inline seuil editing ──────────────────────────────────────────────────
  const startEditing = (p: LowStockProduit) => {
    setEditingId(p.id);
    setEditValue(String(p.seuilAlerte));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveSeuilAlerte = async (id: string) => {
    const newSeuil = parseInt(editValue, 10);
    if (isNaN(newSeuil) || newSeuil < 0) {
      cancelEditing();
      return;
    }

    const original = produits.find(p => p.id === id);
    if (!original || original.seuilAlerte === newSeuil) {
      cancelEditing();
      return;
    }

    setSavingId(id);
    // Optimistic update
    setProduits(prev => prev.map(p => p.id === id ? { ...p, seuilAlerte: newSeuil } : p));
    setEditingId(null);

    try {
      await produitApi.update(id, { seuilAlerte: newSeuil });
      setSuccessId(id);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (err) {
      console.error(err);
      // Revert
      setProduits(prev => prev.map(p => p.id === id ? { ...p, seuilAlerte: original.seuilAlerte } : p));
    } finally {
      setSavingId(null);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSeuilAlerte(id);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // ─── Status badge ──────────────────────────────────────────────────────────
  const getStatusBadge = (p: LowStockProduit) => {
    if (p.quantiteStock === 0) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">Rupture</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">Critique</span>;
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-primary" />
        <span className="ml-3 text-slate-500">Chargement des alertes de stock...</span>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={36} className="text-red-400" />
        <p className="text-slate-600">{error}</p>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold">
          <RefreshCw size={16} /><span>Réessayer</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alertes de Stock</h1>
          <p className="text-sm text-slate-500 mt-1">Produits en rupture ou sous le seuil d'alerte.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw size={16} /><span>Actualiser</span>
        </button>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <AlertTriangle size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total alertes</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <X size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">En rupture</p>
            <p className="text-2xl font-bold text-red-600">{stats.rupture}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <Package size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Stock critique</p>
            <p className="text-2xl font-bold text-amber-600">{stats.critique}</p>
          </div>
        </motion.div>
      </div>

      {/* ── Filters & Table Card ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Filters bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom ou marque..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
              >
                <option value="">Toutes catégories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
              {([['all', 'Tous'], ['rupture', 'Rupture'], ['critique', 'Critique']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
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
                <th className="px-6 py-4">Stock actuel</th>
                <th className="px-6 py-4">Seuil d'alerte</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">Aucune alerte de stock trouvée.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const imgSrc = resolveImgUrl(p.imageUrl);
                  const isEditing = editingId === p.id;
                  const isSaving = savingId === p.id;
                  const isSuccess = successId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      {/* Product */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {imgSrc ? (
                            <img src={imgSrc} alt={p.nomProduit} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Package size={18} className="text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{p.nomProduit}</p>
                            <p className="text-xs text-slate-500">{p.marque}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {p.categorieNom || '—'}
                      </td>

                      {/* Stock actuel */}
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold ${p.quantiteStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {p.quantiteStock}
                        </span>
                      </td>

                      {/* Seuil d'alerte (editable) */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => saveSeuilAlerte(p.id)}
                              onKeyDown={e => handleEditKeyDown(e, p.id)}
                              autoFocus
                              className="w-20 px-2 py-1 bg-slate-50 border border-primary/30 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                            <button onClick={() => saveSeuilAlerte(p.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Check size={14} />
                            </button>
                            <button onClick={cancelEditing} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(p)}
                            className={`text-sm font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                              isSuccess
                                ? 'bg-green-50 text-green-700'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <RefreshCw size={14} className="animate-spin inline-block mr-1" />
                            ) : isSuccess ? (
                              <Check size={14} className="inline-block mr-1 text-green-600" />
                            ) : null}
                            {p.seuilAlerte}
                          </button>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="px-6 py-4">
                        {getStatusBadge(p)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => startEditing(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                          title="Modifier le seuil d'alerte"
                        >
                          <Edit2 size={13} />
                          <span>Seuil</span>
                        </button>
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
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucune alerte de stock trouvée.</p>
            </div>
          ) : (
            filtered.map(p => {
              const imgSrc = resolveImgUrl(p.imageUrl);
              const isEditing = editingId === p.id;
              const isSaving = savingId === p.id;
              const isSuccess = successId === p.id;

              return (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {imgSrc ? (
                      <img src={imgSrc} alt={p.nomProduit} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Package size={20} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.nomProduit}</p>
                      <p className="text-xs text-slate-500">{p.marque}</p>
                      {p.categorieNom && (
                        <p className="text-xs text-slate-400 mt-0.5">{p.categorieNom}</p>
                      )}
                    </div>
                    {getStatusBadge(p)}
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Stock: </span>
                      <span className={`font-bold ${p.quantiteStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.quantiteStock}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Seuil: </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => saveSeuilAlerte(p.id)}
                            onKeyDown={e => handleEditKeyDown(e, p.id)}
                            autoFocus
                            className="w-16 px-2 py-1 bg-slate-50 border border-primary/30 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                          <button onClick={cancelEditing} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(p)}
                          className={`font-medium px-2 py-0.5 rounded transition-colors ${
                            isSuccess ? 'bg-green-50 text-green-700' : 'text-slate-700'
                          }`}
                          disabled={isSaving}
                        >
                          {isSaving && <RefreshCw size={12} className="animate-spin inline-block mr-1" />}
                          {isSuccess && <Check size={12} className="inline-block mr-1 text-green-600" />}
                          {p.seuilAlerte}
                        </button>
                      )}
                      {!isEditing && (
                        <button onClick={() => startEditing(p)} className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StockAlerts;
