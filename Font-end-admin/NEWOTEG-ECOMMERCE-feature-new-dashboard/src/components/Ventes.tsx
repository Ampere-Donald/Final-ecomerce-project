import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Search, Download, ShoppingCart, X, Eye, Package, Calendar, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, Building2, UserPlus, CheckCircle2, AlertTriangle,
  Clock, Receipt, Filter, ChevronLeft, ChevronRight, ListFilter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { venteApi, produitApi, clientApi, categorieApi } from '../services/api';
import { ReceiptGenerator, generateReceiptNumber } from './ReceiptGenerator';

/* ── Types ─────────────────────────────────────────────────────── */
interface CartItem {
  produitId: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
  prixCatalogue: number;
  stock: number;
  imageUrl?: string;
  prixGros?: number | null;
  quantiteGros?: number | null;
  modePrix: 'DETAIL' | 'GROS';
}

const PAYMENT_METHODS = [
  { value: 'ESPECES', label: 'Especes', icon: Banknote },
  { value: 'CARTE', label: 'Carte', icon: CreditCard },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { value: 'VIREMENT', label: 'Virement', icon: Building2 },
] as const;

const resolveImgUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return null;
};

/* ═══════════════════════════════════════════════════════════════ */
export const Ventes = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // ── Shared data ──
  const [produits, setProduits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [ventes, setVentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── POS state ──
  const [productSearch, setProductSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduit, setSelectedProduit] = useState<any | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [modalQty, setModalQty] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const PRODUCTS_PER_PAGE = 60;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('ESPECES');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '', typeClient: 'PARTICULIER' as string });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastVente, setLastVente] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptType, setReceiptType] = useState<'ticket' | 'facture'>('ticket');

  // ── History state ──
  const [historySearch, setHistorySearch] = useState('');
  const [selectedVente, setSelectedVente] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Data loading ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      produitApi.getAll(),
      categorieApi.getAll(),
      clientApi.getAll(),
      venteApi.getAll(),
    ]);
    if (results[0].status === 'fulfilled') {
      const rawProduits = results[0].value;
      // Enrich products with category info
      const cats = results[1].status === 'fulfilled' ? results[1].value : [];
      const enriched = rawProduits.map(p => ({
        ...p,
        categorie: cats.find((c: any) => c.id === p.categorieId) || null,
      }));
      setProduits(enriched);
    }
    if (results[1].status === 'fulfilled') setCategories(results[1].value);
    if (results[2].status === 'fulfilled') setClients(results[2].value);
    if (results[3].status === 'fulfilled') setVentes(results[3].value);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ═══ POS LOGIC ═══════════════════════════════════════════════ */
  
  // Filter products without artificial limit - full catalog access
  const filteredProducts = useMemo(() => {
    let result = produits;
    
    // Search filter
    if (productSearch.trim()) {
      const term = productSearch.toLowerCase();
      result = result.filter(p =>
        p.nomProduit?.toLowerCase().includes(term) ||
        p.marque?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }
    
    // Category filter
    if (selectedCategoryId) {
      result = result.filter(p => p.categorieId === selectedCategoryId);
    }
    
    // In stock filter
    if (inStockOnly) {
      result = result.filter(p => (p.quantiteStock ?? 0) > 0);
    }
    
    return result;
  }, [produits, productSearch, selectedCategoryId, inStockOnly]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [productSearch, selectedCategoryId, inStockOnly]);

  const clearFilters = () => {
    setProductSearch('');
    setSelectedCategoryId('');
    setInStockOnly(false);
    setCurrentPage(1);
    searchInputRef.current?.focus();
  };

  const hasActiveFilters = productSearch || selectedCategoryId || inStockOnly;

  // ── Product detail modal helpers ──
  const openProduitDetail = (produit: any) => {
    setSelectedProduit(produit);
    setSelectedImageIndex(0);
    setModalQty(1);
  };

  const closeProduitDetail = () => {
    setSelectedProduit(null);
    setSelectedImageIndex(0);
    setModalQty(1);
  };

  const addToCartFromModal = () => {
    if (!selectedProduit) return;
    for (let i = 0; i < modalQty; i++) {
      addToCart(selectedProduit);
    }
    closeProduitDetail();
  };

  const getProductImages = (p: any): string[] => {
    return [p.imageUrl, p.imageUrl2, p.imageUrl3].filter(url => url && url.startsWith('http')).map(url => url);
  };

  // ── Search suggestions (top 8 matches for quick access) ──
  const searchSuggestions = useMemo(() => {
    if (!productSearch.trim() || productSearch.length < 2) return [];
    const term = productSearch.toLowerCase();
    return produits
      .filter(p =>
        p.nomProduit?.toLowerCase().includes(term) ||
        p.marque?.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        // Prioritize exact start matches, then in-stock items
        const aStarts = a.nomProduit?.toLowerCase().startsWith(term) ? 0 : 1;
        const bStarts = b.nomProduit?.toLowerCase().startsWith(term) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return (b.quantiteStock ?? 0) - (a.quantiteStock ?? 0);
      })
      .slice(0, 8);
  }, [produits, productSearch]);

  const selectSuggestion = (produit: any) => {
    if ((produit.quantiteStock ?? 0) > 0) {
      addToCart(produit);
    }
    setProductSearch('');
    setShowSuggestions(false);
    setHighlightedSuggestion(-1);
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: any) => {
    if (!showSuggestions || searchSuggestions.length === 0) {
      if (e.key === 'Escape') {
        setProductSearch('');
        setShowSuggestions(false);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSuggestion(prev => Math.min(prev + 1, searchSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSuggestion(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && highlightedSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(searchSuggestions[highlightedSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedSuggestion(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 20);
    const term = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.nom?.toLowerCase().includes(term) ||
      c.telephone?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [clients, clientSearch]);

  const addToCart = (produit: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.produitId === produit.id);
      if (existing) {
        if (existing.quantite >= (produit.quantiteStock ?? 0)) return prev;
        return prev.map(c => c.produitId === produit.id ? { ...c, quantite: c.quantite + 1 } : c);
      }
      if ((produit.quantiteStock ?? 0) <= 0) return prev;
      return [...prev, {
        produitId: produit.id,
        nomProduit: produit.nomProduit,
        quantite: 1,
        prixUnitaire: Number(produit.prixDetail ?? 0),
        prixCatalogue: Number(produit.prixDetail ?? 0),
        stock: produit.quantiteStock ?? 0,
        imageUrl: produit.imageUrl,
        prixGros: produit.prixGros != null ? Number(produit.prixGros) : null,
        quantiteGros: produit.quantiteGros != null ? Number(produit.quantiteGros) : null,
        modePrix: 'DETAIL' as const,
      }];
    });
  };

  const updateQuantity = (produitId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.produitId !== produitId) return c;
      const newQty = c.quantite + delta;
      if (newQty < 1 || newQty > c.stock) return c;
      const seuil = c.quantiteGros ?? 0;
      // Si on repasse sous le seuil, retour automatique en Détail
      const modePrix = (seuil > 0 && newQty < seuil) ? 'DETAIL' : c.modePrix;
      const prix = modePrix === 'GROS' && c.prixGros != null ? Number(c.prixGros) : Number(c.prixCatalogue);
      return { ...c, quantite: newQty, modePrix, prixUnitaire: prix };
    }));
  };

  const updatePrice = (produitId: string, price: number) => {
    setCart(prev => prev.map(c => c.produitId === produitId ? { ...c, prixUnitaire: price } : c));
  };

  const changerModePrix = (produitId: string, mode: 'DETAIL' | 'GROS') => {
    setCart(prev => prev.map(c => {
      if (c.produitId !== produitId) return c;
      const prix = mode === 'GROS' && c.prixGros != null ? Number(c.prixGros) : Number(c.prixCatalogue);
      return { ...c, modePrix: mode, prixUnitaire: prix };
    }));
  };

  const removeFromCart = (produitId: string) => {
    setCart(prev => prev.filter(c => c.produitId !== produitId));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, c) => sum + c.quantite * c.prixUnitaire, 0), [cart]);

  const priceDiffBadge = (item: CartItem) => {
    if (item.prixCatalogue === 0 || item.prixUnitaire === item.prixCatalogue) return null;
    const diff = Math.round(((item.prixUnitaire - item.prixCatalogue) / item.prixCatalogue) * 100);
    if (diff === 0) return null;
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${diff < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
        {diff > 0 ? '+' : ''}{diff}%
      </span>
    );
  };

  const handleCreateClient = async () => {
    if (!newClient.nom.trim()) return;
    try {
      const created = await clientApi.create(newClient);
      setClients(prev => [created, ...prev]);
      setSelectedClientId(created.id);
      setShowClientForm(false);
      setNewClient({ nom: '', telephone: '', typeClient: 'PARTICULIER' });
    } catch {
      setErrorMessage('Erreur lors de la creation du client');
    }
  };

  const handleSubmitSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const payload = {
        clientId: selectedClientId || undefined,
        montantTotal: cartTotal,
        methodePaiement: paymentMethod,
        lignesVente: cart.map(c => ({
          produitId: c.produitId,
          quantite: c.quantite,
          prixUnitaire: c.prixUnitaire,
        })),
      };
      const result = await venteApi.create(payload);
      // Determine receipt type from client
      const client = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
      const rType = client?.typeClient === 'PROFESSIONNEL' ? 'facture' : 'ticket';
      setReceiptType(rType);
      setLastVente({
        ...result,
        _receiptNumber: generateReceiptNumber(rType),
        _lignes: cart.map(c => ({ nomProduit: c.nomProduit, quantite: c.quantite, prixUnitaire: c.prixUnitaire, sousTotal: c.quantite * c.prixUnitaire })),
        _montantTotal: cartTotal,
        _methodePaiement: paymentMethod,
        _client: client ? { nom: client.nom, telephone: client.telephone, typeClient: client.typeClient } : undefined,
      });
      setCart([]);
      setSelectedClientId('');
      setSuccessMessage(`Vente enregistree — ${cartTotal.toLocaleString()} FCFA`);
      setTimeout(() => setSuccessMessage(''), 8000);
      // Refresh products (updated stock) and ventes
      const [prodRes, ventesRes] = await Promise.allSettled([produitApi.getAll(), venteApi.getAll()]);
      if (prodRes.status === 'fulfilled') {
        // Re-enrich with current categories
        const cats = categories.length > 0 ? categories : (await categorieApi.getAll());
        const enriched = prodRes.value.map((p: any) => ({
          ...p,
          categorie: cats.find((c: any) => c.id === p.categorieId) || null,
        }));
        setProduits(enriched);
      }
      if (ventesRes.status === 'fulfilled') setVentes(ventesRes.value);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erreur lors de la vente');
    } finally {
      setSubmitting(false);
    }
  };

  /* ═══ HISTORY LOGIC ══════════════════════════════════════════ */
  const filteredHistory = useMemo(() => {
    let result = ventes;
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      result = result.filter(v => new Date(v.dateVente) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      result = result.filter(v => new Date(v.dateVente) <= to);
    }
    if (historySearch.trim()) {
      const term = historySearch.toLowerCase();
      result = result.filter(v => {
        const clientName = v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'anonyme';
        const prods = (v.lignesVente || []).map((l: any) => l.produit?.nomProduit || '').join(' ');
        return clientName.toLowerCase().includes(term) || prods.toLowerCase().includes(term)
          || v.methodePaiement?.toLowerCase().includes(term) || v.statutPaiement?.toLowerCase().includes(term);
      });
    }
    return result;
  }, [ventes, historySearch, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;
    const headers = ['ID', 'Date', 'Client', 'Produits', 'Paiement', 'Montant', 'Statut'];
    const rows = filteredHistory.map(v => [
      v.id.substring(0, 8),
      new Date(v.dateVente).toLocaleDateString('fr-FR'),
      `"${v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'Client Anonyme'}"`,
      `"${(v.lignesVente || []).map((l: any) => `${l.produit?.nomProduit || 'Produit'} x${l.quantite}`).join(', ')}"`,
      v.methodePaiement, v.montantTotal, v.statutPaiement,
    ]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const statutBadge = (statut: string) => {
    const cls = statut === 'PAYE' ? 'bg-emerald-100 text-emerald-800' :
      statut === 'PARTIEL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{statut}</span>;
  };

  /* ═══ RENDER ═════════════════════════════════════════════════ */
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ventes Boutique</h1>
          <p className="text-sm text-slate-500 mt-1">Point de vente pour la boutique physique</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pos' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ShoppingCart size={16} /> Nouvelle Vente
          </button>
          <button onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Clock size={16} /> Historique
          </button>
        </div>
      </div>

      {/* Success / Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium text-sm">
            <CheckCircle2 size={18} /> {successMessage}
            {lastVente && (
              <button onClick={() => setShowReceipt(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors">
                <Receipt size={14} /> Imprimer recu
              </button>
            )}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-sm">
            <AlertTriangle size={18} /> {errorMessage}
            <button onClick={() => setErrorMessage('')} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ POS TAB ═══════════════════════════════════════════════ */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Product catalog */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search bar with suggestions */}
            <div className="relative" ref={suggestionsRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Rechercher un produit (nom, marque)..."
                value={productSearch} 
                onChange={e => { setProductSearch(e.target.value); setShowSuggestions(true); setHighlightedSuggestion(-1); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
              />
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${showFilters || hasActiveFilters ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                title="Filtres avancés"
              >
                <ListFilter size={18} />
              </button>

              {/* Search suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && searchSuggestions.length > 0 && productSearch.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-400">Suggestions rapides</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {searchSuggestions.map((p, index) => {
                        const outOfStock = (p.quantiteStock ?? 0) <= 0;
                        const isHighlighted = index === highlightedSuggestion;
                        return (
                          <button
                            key={p.id}
                            onClick={() => selectSuggestion(p)}
                            onMouseEnter={() => setHighlightedSuggestion(index)}
                            disabled={outOfStock}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isHighlighted ? 'bg-primary/5' : 'hover:bg-slate-50'} ${outOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {/* Product image thumbnail */}
                            {p.imageUrl && p.imageUrl.startsWith('http') ? (
                              <img src={p.imageUrl} alt="" className="w-10 h-10 object-contain rounded-lg bg-slate-50 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Package size={16} className="text-slate-400" />
                              </div>
                            )}
                            
                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{p.nomProduit}</p>
                              {p.marque && <p className="text-xs text-slate-400 truncate">{p.marque}</p>}
                            </div>

                            {/* Price + Stock */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-bold text-primary">{(Number(p.prixDetail ?? 0)).toLocaleString()} F</span>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${outOfStock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {p.quantiteStock ?? 0}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                      <p className="text-xs text-slate-400 text-center">
                        {searchSuggestions.length} résultat{searchSuggestions.length > 1 ? 's' : ''} — Cliquez pour ajouter au panier
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advanced filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Filter size={16} /> Filtres
                    </h3>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  
                  {/* Category filter */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Catégorie</label>
                    <select 
                      value={selectedCategoryId} 
                      onChange={e => setSelectedCategoryId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Toutes les catégories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* In stock toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">En stock uniquement</label>
                    <button 
                      onClick={() => setInStockOnly(!inStockOnly)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${inStockOnly ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${inStockOnly ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results counter */}
            {!loading && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {filteredProducts.length === 0 
                    ? 'Aucun produit' 
                    : `${filteredProducts.length.toLocaleString()} produit${filteredProducts.length > 1 ? 's' : ''} trouvé${filteredProducts.length > 1 ? 's' : ''}`
                  }
                  {hasActiveFilters && ` (sur ${produits.length.toLocaleString()})`}
                </span>
                {totalPages > 1 && (
                  <span>Page {currentPage} / {totalPages}</span>
                )}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-slate-400">Chargement des produits...</div>
            ) : (
              <>
                {/* Product grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                  {paginatedProducts.map(p => {
                    const inCart = cart.find(c => c.produitId === p.id);
                    const outOfStock = (p.quantiteStock ?? 0) <= 0;
                    const img = resolveImgUrl(p.imageUrl) || '/logo.png';
                    return (
                      <div key={p.id}
                        className={`relative bg-white border rounded-xl p-3 text-left transition-all hover:shadow-md ${outOfStock ? 'opacity-50 border-slate-200' : 'border-slate-200 hover:border-primary/30 cursor-pointer'} ${inCart ? 'ring-2 ring-primary/30' : ''}`}
                        onClick={() => !outOfStock && addToCart(p)}
                      >
                        {/* View details button */}
                        <button
                          onClick={e => { e.stopPropagation(); openProduitDetail(p); }}
                          className="absolute top-2 left-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 shadow-sm text-slate-500 hover:text-primary hover:bg-white transition-colors"
                          title="Voir les détails"
                        >
                          <Eye size={14} />
                        </button>

                        <div className="w-full h-20 flex items-center justify-center rounded-lg mb-2 bg-slate-50">
                          <img src={img} alt="" className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }} />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 truncate">{p.nomProduit}</p>
                        {p.marque && <p className="text-xs text-slate-400 truncate">{p.marque}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-primary">{(Number(p.prixDetail ?? 0)).toLocaleString()} F</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${outOfStock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {p.quantiteStock ?? 0}
                          </span>
                        </div>
                        {inCart && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                            {inCart.quantite}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full text-center py-8 text-slate-400">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun produit trouvé</p>
                      <p className="text-xs mt-1">Essayez de modifier vos filtres</p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="mt-3 text-primary hover:underline text-xs font-medium">
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Cart + Payment */}
          <div className="lg:col-span-2 space-y-4">
            {/* Cart */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><ShoppingCart size={18} /> Panier</h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Vider</button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Panier vide</p>
                  <p className="text-xs mt-1">Cliquez sur un produit pour l'ajouter</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[40vh] overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.produitId} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{item.nomProduit}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {priceDiffBadge(item)}
                            <span className="text-xs text-slate-400">Cat: {item.prixCatalogue.toLocaleString()} F</span>
                          </div>
                          {/* Toggle Détail / Gros — visible uniquement si seuil atteint */}
                          {item.prixGros != null && item.quantiteGros != null && item.quantite >= item.quantiteGros && (
                            <div className="mt-1.5 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
                              <button
                                onClick={() => changerModePrix(item.produitId, 'DETAIL')}
                                className={`rounded-md px-2 py-0.5 transition-colors ${item.modePrix === 'DETAIL' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Détail
                              </button>
                              <button
                                onClick={() => changerModePrix(item.produitId, 'GROS')}
                                className={`rounded-md px-2 py-0.5 transition-colors ${item.modePrix === 'GROS' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title={item.quantiteGros ? `Seuil conseillé : ${item.quantiteGros} unités` : 'Prix de gros'}
                              >
                                Gros {item.quantiteGros ? `(≥${item.quantiteGros})` : ''}
                              </button>
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeFromCart(item.produitId)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        {/* Quantity */}
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.produitId, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantite}</span>
                          <button onClick={() => updateQuantity(item.produitId, 1)}
                            disabled={item.quantite >= item.stock}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40">
                            <Plus size={12} />
                          </button>
                          <span className="text-[10px] text-slate-400 ml-1">/ {item.stock}</span>
                        </div>
                        {/* Price input */}
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} value={item.prixUnitaire}
                            onChange={e => updatePrice(item.produitId, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right text-sm font-bold border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary/20 outline-none" />
                          <span className="text-xs text-slate-400">F</span>
                        </div>
                      </div>
                      <div className="text-right text-sm font-bold text-slate-700">
                        = {(item.quantite * item.prixUnitaire).toLocaleString()} FCFA
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Total</span>
                    <span className="text-xl font-bold text-primary">{cartTotal.toLocaleString()} FCFA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            {cart.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Mode de paiement</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => {
                    const Icon = pm.icon;
                    return (
                      <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${paymentMethod === pm.value ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        <Icon size={16} /> {pm.label}
                      </button>
                    );
                  })}
                </div>

                {/* Client Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-slate-900">Client</h3>
                    <button onClick={() => setShowClientForm(!showClientForm)}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                      <UserPlus size={12} /> Nouveau
                    </button>
                  </div>

                  {showClientForm && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-xl space-y-2">
                      <input type="text" placeholder="Nom *" value={newClient.nom}
                        onChange={e => setNewClient(c => ({ ...c, nom: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                      <input type="text" placeholder="Telephone" value={newClient.telephone}
                        onChange={e => setNewClient(c => ({ ...c, telephone: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                      <select value={newClient.typeClient}
                        onChange={e => setNewClient(c => ({ ...c, typeClient: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="PARTICULIER">Particulier</option>
                        <option value="PROFESSIONNEL">Professionnel</option>
                      </select>
                      <button onClick={handleCreateClient}
                        className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                        Creer le client
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <input type="text" placeholder="Rechercher un client..." value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setSelectedClientId(''); }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  {selectedClientId ? (
                    <div className="mt-2 flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-lg">
                      <span className="text-sm font-medium text-primary">
                        {clients.find(c => c.id === selectedClientId)?.nom || 'Client'}
                      </span>
                      <button onClick={() => { setSelectedClientId(''); setClientSearch(''); }} className="text-primary/50 hover:text-primary">
                        <X size={14} />
                      </button>
                    </div>
                  ) : clientSearch.trim() ? (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {filteredClients.map(c => (
                        <button key={c.id} onClick={() => { setSelectedClientId(c.id); setClientSearch(c.nom); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
                          <span className="font-medium text-slate-900">{c.nom}</span>
                          {c.telephone && <span className="text-slate-400 ml-2">{c.telephone}</span>}
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${c.typeClient === 'PROFESSIONNEL' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {c.typeClient === 'PROFESSIONNEL' ? 'PRO' : 'Part.'}
                          </span>
                        </button>
                      ))}
                      {filteredClients.length === 0 && (
                        <p className="px-3 py-2 text-sm text-slate-400">Aucun client trouve</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">Client anonyme (aucun client selectionne)</p>
                  )}
                </div>

                {/* Submit */}
                <button onClick={handleSubmitSale} disabled={cart.length === 0 || submitting}
                  className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting ? (
                    <>Validation en cours...</>
                  ) : (
                    <><Receipt size={18} /> Valider la vente — {cartTotal.toLocaleString()} FCFA</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ PRODUCT DETAIL MODAL ════════════════════════════════════ */}
      <AnimatePresence>
        {selectedProduit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={closeProduitDetail}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Détails Produit</h2>
                <button onClick={closeProduitDetail} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Image gallery */}
                {(() => {
                  const images = getProductImages(selectedProduit);
                  const currentImg = images[selectedImageIndex] || '/logo.png';
                  return (
                    <div className="space-y-3">
                      <div className="relative aspect-video bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center">
                        <img src={currentImg} alt="" className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).src = '/logo.png'; }} />
                        {images.length > 1 && (
                          <>
                            <button onClick={() => setSelectedImageIndex(i => Math.max(0, i - 1))} disabled={selectedImageIndex === 0}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow hover:bg-white disabled:opacity-30 transition-colors">
                              <ChevronLeft size={18} />
                            </button>
                            <button onClick={() => setSelectedImageIndex(i => Math.min(images.length - 1, i + 1))} disabled={selectedImageIndex === images.length - 1}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow hover:bg-white disabled:opacity-30 transition-colors">
                              <ChevronRight size={18} />
                            </button>
                          </>
                        )}
                      </div>
                      {images.length > 1 && (
                        <div className="flex gap-2 justify-center">
                          {images.map((img, i) => (
                            <button key={i} onClick={() => setSelectedImageIndex(i)}
                              className={`w-14 h-14 rounded-lg border-2 overflow-hidden transition-colors ${i === selectedImageIndex ? 'border-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                              <img src={img} alt="" className="w-full h-full object-contain" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Product info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedProduit.nomProduit}</h3>
                    {selectedProduit.marque && (
                      <p className="text-sm text-slate-500">Marque: <span className="font-medium text-slate-700">{selectedProduit.marque}</span></p>
                    )}
                    {selectedProduit.categorie && (
                      <p className="text-sm text-slate-500">Catégorie: <span className="font-medium text-slate-700">{selectedProduit.categorie.nom}</span></p>
                    )}
                  </div>

                  {/* Description */}
                  {selectedProduit.description && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Description</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{selectedProduit.description}</p>
                    </div>
                  )}

                  {/* Attributes */}
                  {selectedProduit.attributs && selectedProduit.attributs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Caractéristiques techniques</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedProduit.attributs.map((attr: any) => (
                          <div key={attr.id} className="p-2 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">{attr.nomAttribut}</p>
                            <p className="text-sm font-medium text-slate-800">
                              {attr.valeurs?.map((v: any) => v.valeur).join(', ') || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-xs font-semibold text-primary mb-1">Prix détail</p>
                      <p className="text-lg font-bold text-primary">{(Number(selectedProduit.prixDetail ?? 0)).toLocaleString()} F</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Prix gros</p>
                      <p className="text-lg font-bold text-slate-800">{(selectedProduit.prixGros ?? 0).toLocaleString()} F</p>
                      {selectedProduit.prixDetail && selectedProduit.prixGros && selectedProduit.prixGros < selectedProduit.prixDetail && (
                        <p className="text-xs text-emerald-600 font-medium">
                          Marge: -{Math.round(((selectedProduit.prixDetail - selectedProduit.prixGros) / selectedProduit.prixDetail) * 100)}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: (selectedProduit.quantiteStock ?? 0) > 0 ? '#ECFDF5' : '#FEF2F2' }}>
                    <Package size={20} className={(selectedProduit.quantiteStock ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'} />
                    <div>
                      <p className={`text-sm font-bold ${(selectedProduit.quantiteStock ?? 0) > 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                        {(selectedProduit.quantiteStock ?? 0) > 0 ? `${selectedProduit.quantiteStock ?? 0} unités en stock` : 'Rupture de stock'}
                      </p>
                      {selectedProduit.seuilAlerte && (selectedProduit.quantiteStock ?? 0) <= selectedProduit.seuilAlerte && (
                        <p className="text-xs text-amber-600 font-medium">⚠️ Stock bas (seuil: {selectedProduit.seuilAlerte})</p>
                      )}
                    </div>
                  </div>

                  {/* Promo badge */}
                  {selectedProduit.isPopulaire && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                      <span className="text-amber-500">⭐</span>
                      <span className="text-sm font-medium text-amber-700">Produit populaire</span>
                    </div>
                  )}
                  {selectedProduit.prixPromo && Number(selectedProduit.prixPromo) < Number(selectedProduit.prixDetail ?? 0) && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                      <span className="text-red-500">🏷️</span>
                      <span className="text-sm font-medium text-red-700">
                        En promo: {selectedProduit.prixPromo.toLocaleString()} F
                        {selectedProduit.finPromo && ` (jusqu'au ${new Date(selectedProduit.finPromo).toLocaleDateString('fr-FR')})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer: Add to cart */}
              {(selectedProduit.quantiteStock ?? 0) > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModalQty(q => Math.max(1, q - 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                        <Minus size={18} />
                      </button>
                      <span className="w-12 text-center text-lg font-bold text-slate-900">{modalQty}</span>
                      <button onClick={() => setModalQty(q => Math.min(selectedProduit.quantiteStock ?? 1, q + 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                        <Plus size={18} />
                      </button>
                    </div>
                    <button onClick={addToCartFromModal}
                      className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                      <ShoppingCart size={18} /> Ajouter au panier
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HISTORY TAB ═══════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <>
          {/* Detail Modal */}
          <AnimatePresence>
            {selectedVente && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Detail Vente #{selectedVente.id.substring(0, 8)}</h2>
                    <button onClick={() => setSelectedVente(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Client</p>
                        <p className="font-bold text-slate-900 text-sm">{selectedVente.client ? `${selectedVente.client.nom} ${selectedVente.client.prenom || ''}` : 'Client Anonyme'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Date</p>
                        <p className="font-bold text-slate-900 text-sm">{new Date(selectedVente.dateVente).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Paiement</p>
                        <p className="font-bold text-slate-900 text-sm">{selectedVente.methodePaiement}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Statut</p>
                        {statutBadge(selectedVente.statutPaiement)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Package size={16} />Produits vendus</h3>
                      {(!selectedVente.lignesVente || selectedVente.lignesVente.length === 0) ? (
                        <p className="text-sm text-slate-500">Aucune ligne de vente.</p>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                                <th className="px-4 py-3">Produit</th>
                                <th className="px-4 py-3 text-center">Qte</th>
                                <th className="px-4 py-3 text-right">Prix Unit.</th>
                                <th className="px-4 py-3 text-right">Sous-total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedVente.lignesVente.map((l: any, i: number) => (
                                <tr key={l.id || i}>
                                  <td className="px-4 py-3 font-medium text-slate-900 text-sm">{l.produit?.nomProduit || 'Produit'}</td>
                                  <td className="px-4 py-3 text-center text-sm">{l.quantite}</td>
                                  <td className="px-4 py-3 text-right text-sm">{Number(l.prixUnitaire).toLocaleString()} FCFA</td>
                                  <td className="px-4 py-3 text-right font-bold text-sm">{Number(l.sousTotal).toLocaleString()} FCFA</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50">
                                <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-900">Total</td>
                                <td className="px-4 py-3 text-right font-bold text-primary text-lg">{Number(selectedVente.montantTotal).toLocaleString()} FCFA</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                    {/* Print receipt button */}
                    <div className="flex justify-end pt-2">
                      <button onClick={() => {
                        const client = selectedVente.client;
                        const rType = client?.typeClient === 'PROFESSIONNEL' ? 'facture' as const : 'ticket' as const;
                        setReceiptType(rType);
                        setLastVente({
                          ...selectedVente,
                          _receiptNumber: generateReceiptNumber(rType),
                          _lignes: (selectedVente.lignesVente || []).map((l: any) => ({
                            nomProduit: l.produit?.nomProduit || 'Produit',
                            quantite: l.quantite,
                            prixUnitaire: Number(l.prixUnitaire),
                            sousTotal: Number(l.sousTotal),
                          })),
                          _montantTotal: Number(selectedVente.montantTotal),
                          _methodePaiement: selectedVente.methodePaiement,
                          _client: client ? { nom: client.nom, telephone: client.telephone, typeClient: client.typeClient } : undefined,
                        });
                        setSelectedVente(null);
                        setShowReceipt(true);
                      }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                        <Receipt size={16} /> Imprimer recu
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Rechercher par client, produit, statut..." value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <button onClick={handleExportCSV} disabled={filteredHistory.length === 0}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap">
                  <Download size={18} /> Exporter CSV
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                <span className="text-sm text-slate-400">&rarr;</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Reinitialiser</button>
                )}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Produits</th>
                    <th className="px-6 py-4">Paiement</th>
                    <th className="px-6 py-4">Montant</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center">
                      <ShoppingCart size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500">Aucune vente trouvee.</p>
                    </td></tr>
                  ) : (
                    filteredHistory.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-primary font-bold text-sm">{v.id.substring(0, 8)}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{new Date(v.dateVente).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'Client Anonyme'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                          {(v.lignesVente || []).length > 0
                            ? `${v.lignesVente[0].produit?.nomProduit || 'Produit'} x${v.lignesVente[0].quantite}${v.lignesVente.length > 1 ? ` +${v.lignesVente.length - 1}` : ''}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold uppercase">{v.methodePaiement}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{Number(v.montantTotal).toLocaleString()} FCFA</td>
                        <td className="px-6 py-4">{statutBadge(v.statutPaiement)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setSelectedVente(v)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {loading ? (
                <p className="py-8 text-center text-slate-500">Chargement...</p>
              ) : filteredHistory.length === 0 ? (
                <div className="py-8 text-center">
                  <ShoppingCart size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucune vente trouvee.</p>
                </div>
              ) : (
                filteredHistory.map(v => (
                  <div key={v.id} className="p-4 space-y-2" onClick={() => setSelectedVente(v)}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary text-sm">{v.id.substring(0, 8)}</span>
                      {statutBadge(v.statutPaiement)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{v.client ? `${v.client.nom}` : 'Client Anonyme'}</span>
                      <span className="font-bold text-slate-900">{Number(v.montantTotal).toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{new Date(v.dateVente).toLocaleDateString('fr-FR')}</span>
                      <span>&middot;</span>
                      <span className="uppercase font-semibold">{v.methodePaiement}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastVente && (
        <ReceiptGenerator
          type={receiptType}
          lignes={lastVente._lignes || []}
          montantTotal={lastVente._montantTotal || lastVente.montantTotal || 0}
          methodePaiement={lastVente._methodePaiement || lastVente.methodePaiement || 'ESPECES'}
          numero={lastVente._receiptNumber || ''}
          client={lastVente._client}
          dateVente={lastVente.dateVente}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </motion.div>
  );
};
