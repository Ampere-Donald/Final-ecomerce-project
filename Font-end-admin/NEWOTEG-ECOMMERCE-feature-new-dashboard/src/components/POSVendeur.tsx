import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Minus, Trash2, Send, ShoppingCart,
  CheckCircle2, AlertCircle, Sparkles, X, Clock, Receipt,
  User as UserIcon, Phone, Printer, ScanBarcode, CameraOff, Star,
  Check, Flashlight, Home,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bonVenteApi, clientApi, produitApi, ticketApi, equivalenceApi, proformaApi, factureVirtuelleApi, getApiErrorMessage } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';
import { ReceiptGenerator } from './ReceiptGenerator';
import { useToast } from './ui/Toast';
import { bornesPrix, classerBande, exigeMotif, BANDE_STYLE } from '../utils/pricing';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { enqueueBon, enqueueTicket, newSaleId, OFFLINE_SYNC_COMPLETED_EVENT } from '../services/offlineSalesQueue';
import {
  clearActiveCartDraft,
  getActiveCartDraft,
  listSuspendedCarts,
  removeSuspendedCart,
  saveActiveCartDraft,
  saveSuspendedCart,
  type SuspendedCart,
} from '../services/cashierProductivity';
import { formatFcfa } from '../features/pos-shared/formatters';
import { useSellerProductHistory } from '../features/seller-pos/useSellerProductHistory';
import { useSellerSaleFlow } from '../features/seller-pos/useSellerSaleFlow';
import { useFlowShellFocus } from '../context/FlowShellContext';

export interface Produit {
  id: string;
  nomProduit: string;
  marque?: string;
  prixDetail?: number;
  prixGros?: number;
  quantiteGros?: number;
  prixDemiGros?: number;
  prixPromo?: number;
  cmupActuel?: number;
  quantiteStock: number;
  imageUrl?: string | null;
  categorie?: { id?: string; nom?: string } | null;
  categorieNom?: string | null;
}

interface Client {
  id: string;
  nom: string;
  prenom?: string | null;
}

export interface PanierLigne {
  produitId: string;
  nomProduit: string;
  prix: number;
  quantite: number;
  stockDispo: number;
  // Références pour le calcul des bornes / bandes
  prixGros?: number;
  prixDemiGros?: number;
  prixDetail?: number;
  cmupActuel?: number;
  motifRemise?: string;
  imageUrl?: string | null;
}

interface ScanHistoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  scannedAt: number;
  imageUrl?: string | null;
}

interface PosDraftContext {
  nomClient: string;
  telephoneClient: string;
  selectedClientId: string;
  paymentMethod: string;
  noteCaissier: string;
}

export interface POSVendeurPreview {
  sellerName?: string;
  products: Produit[];
  items?: PanierLigne[];
  scannerOpen?: boolean;
}

interface Bon {
  id: string;
  numeroTicket: string;
  statut: 'EN_ATTENTE' | 'ENCAISSE' | 'EXPIRE' | 'ANNULE';
  createdAt: string;
  montantTotal: number | string;
  lignes: Array<{ id: string; nomProduit: string; quantite: number; sousTotal: number | string }>;
}

const fmtFCFA = formatFcfa;

const resolveImgUrl = (raw?: string | null): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');
  return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

const normalizeEligibilityText = (value?: string | null): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isEquivalenceEligibleProduct = (p: Produit): boolean =>
  normalizeEligibilityText(p.categorie?.nom || p.categorieNom) === 'composants electroniques';

const looksLikeElectronicComponentSearch = (query: string): boolean => {
  const q = normalizeEligibilityText(query);
  if (!q) return false;
  const keywords = [
    'diode', 'zener', 'transistor', 'mosfet', 'thyristor', 'triac',
    'resistance', 'condensateur', 'capacitor', 'led', 'circuit',
    'integre', 'regulateur', 'relais', 'fusible', 'inductance',
    'bobine', 'quartz', 'capteur', 'optocoupleur', 'ampli',
  ];
  return keywords.some((word) => q.includes(word)) ||
    /\b(1n|2n|bc|bd|bf|tip|irf|irfz|lm|ne|tl|uln|pc|moc|bt|bta|atmega|esp|stm|78\d{2}|79\d{2}|555)\w*/i.test(query);
};

const METHODES = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'CREDIT', label: 'Crédit client' },
];

export const POSVendeur = ({ preview }: { preview?: POSVendeurPreview } = {}) => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isVendeur = preview ? true : admin?.role === 'VENDEUR';
  const sellerName = preview?.sellerName || admin?.nom || 'Vendeur';
  useFlowShellFocus(true);
  const cartDraftScope = `pos_${admin?.id || admin?.username || admin?.role || 'anonymous'}`;
  const productHistory = useSellerProductHistory(cartDraftScope);
  const initialDraftRef = useRef(preview ? {
    items: preview.items || [],
    context: { nomClient: '', telephoneClient: '', selectedClientId: '', paymentMethod: 'ESPECES', noteCaissier: '' },
  } : getActiveCartDraft<PanierLigne, PosDraftContext>(cartDraftScope));
  const initialDraft = initialDraftRef.current;

  // ── Catalogue (commun) ─────────────────────────────────────────────────
  const [produits, setProduits] = useState<Produit[]>(preview?.products || []);
  const [loading, setLoading] = useState(!preview);
  const [search, setSearch] = useState('');
  const [catalogView, setCatalogView] = useState<'all' | 'favorites' | 'recent'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const saleFlow = useSellerSaleFlow<PanierLigne>(initialDraft?.items || []);
  const panier = saleFlow.items;
  const panierRef = saleFlow.itemsRef;
  const setPanier = saleFlow.setItems;
  const [panierMobileOpen, setPanierMobileOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proformaToPrint, setProformaToPrint] = useState<any | null>(null);
  const [lastAddedProductId, setLastAddedProductId] = useState<string | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Admin : client texte libre ─────────────────────────────────────────
  const [nomClient, setNomClient] = useState(initialDraft?.context.nomClient || '');
  const [telephoneClient, setTelephoneClient] = useState(initialDraft?.context.telephoneClient || '');

  // ── Vendeur : client dropdown + paiement + bons en attente ────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(initialDraft?.context.selectedClientId || '');
  const [paymentMethod, setPaymentMethod] = useState(initialDraft?.context.paymentMethod || 'ESPECES');
  const [noteCaissier, setNoteCaissier] = useState(initialDraft?.context.noteCaissier || '');
  const [suspendedCarts, setSuspendedCarts] = useState<SuspendedCart<PanierLigne, PosDraftContext>[]>(() => listSuspendedCarts(cartDraftScope));
  const [bonsEnAttente, setBonsEnAttente] = useState<Bon[]>([]);
  const [monScore, setMonScore] = useState(0);
  const [activeTab, setActiveTab] = useState<'vente' | 'enAttente' | 'suspended'>('vente');

  // ── Recherche manuelle code famille / code ─────────────────────────────
  const [codeSearchFamille, setCodeSearchFamille] = useState('');
  const [codeSearchCode, setCodeSearchCode]       = useState('');
  const [codeSearchLoading, setCodeSearchLoading] = useState(false);

  // ── Scan caméra code-barres ────────────────────────────────────────────
  const [scanOpen, setScanOpen]   = useState(Boolean(preview?.scannerOpen));
  const [scanRestartKey, setScanRestartKey] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [torchOn, setTorchOn] = useState(false);

  // ── Barcode reader USB/Bluetooth (écoute globale clavier) ──────────────
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef   = useRef(0);
  const barcodeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef   = useRef<HTMLInputElement>(null);
  const catalogRequestRef = useRef(0);

  // ── Équivalents IA (commun) ─────────────────────────────────────────────
  const [equivOpen, setEquivOpen] = useState(false);
  const [equivQuery, setEquivQuery] = useState('');
  const [equivProduitId, setEquivProduitId] = useState<string | null>(null);
  const [equivLoading, setEquivLoading] = useState(false);
  const [equivError, setEquivError] = useState<string | null>(null);
  const [equivResults, setEquivResults] = useState<any[]>([]);

  // ── Chargement ─────────────────────────────────────────────────────────
  const loadBons = useCallback(async () => {
    try {
      const [bonsData, scoreData] = await Promise.all([
        bonVenteApi.mesBons(),
        bonVenteApi.monScore(),
      ]);
      setBonsEnAttente((bonsData || []).filter((b: Bon) => b.statut === 'EN_ATTENTE'));
      setMonScore(Number(scoreData?.nombreTickets || 0));
    } catch {}
  }, []);

  const loadCatalog = useCallback(async (query: string) => {
    const requestId = ++catalogRequestRef.current;
    setLoading(true);
    try {
      const response = await produitApi.list({
        page: 1,
        limit: 60,
        search: query.trim() || undefined,
        inStock: true,
        sort: 'name_asc',
      });
      if (requestId === catalogRequestRef.current) {
        setProduits(Array.isArray(response?.data) ? response.data : []);
        setError(null);
      }
    } catch {
      if (requestId === catalogRequestRef.current) setError('Impossible de charger les produits.');
    } finally {
      if (requestId === catalogRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (preview) return;
    let mounted = true;
    if (isVendeur) {
      clientApi.getAll().then((data: any[]) => { if (mounted) setClients(data || []); }).catch(() => {});
      loadBons();
    }
    return () => { mounted = false; };
  }, [isVendeur, loadBons, preview]);

  useEffect(() => {
    if (preview) return;
    const timer = window.setTimeout(() => { void loadCatalog(search); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadCatalog, preview, search]);

  useEffect(() => {
    if (preview) return;
    if (initialDraft?.items.length) {
      toast.info(`Vente en cours restauree : ${initialDraft.items.reduce((sum, item) => sum + item.quantite, 0)} unite(s).`);
    }
  }, [initialDraft, preview, toast]);

  useEffect(() => {
    if (panier.length === 0) {
      clearActiveCartDraft(cartDraftScope);
      return;
    }
    saveActiveCartDraft<PanierLigne, PosDraftContext>(cartDraftScope, panier, {
      nomClient,
      telephoneClient,
      selectedClientId,
      paymentMethod,
      noteCaissier,
    });
  }, [cartDraftScope, nomClient, noteCaissier, panier, paymentMethod, selectedClientId, telephoneClient]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  useEffect(() => {
    if (panier.length === 0) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [panier.length]);

  useEffect(() => {
    if (preview) return;
    const handleSynchronizedSale = () => {
      void loadCatalog(search);
      if (isVendeur) void loadBons();
    };
    window.addEventListener(OFFLINE_SYNC_COMPLETED_EVENT, handleSynchronizedSale);
    return () => window.removeEventListener(OFFLINE_SYNC_COMPLETED_EVENT, handleSynchronizedSale);
  }, [isVendeur, loadBons, loadCatalog, preview, search]);

  // ── Catalogue ──────────────────────────────────────────────────────────
  const categoryOptions = useMemo(() => Array.from(new Set(
    produits.map(product => product.categorie?.nom || product.categorieNom).filter(Boolean) as string[],
  )).slice(0, 4), [produits]);

  const produitsFiltres = useMemo(() => {
    const filtered = catalogView === 'favorites'
      ? produits.filter(product => productHistory.favoriteIds.includes(product.id))
      : catalogView === 'recent'
        ? productHistory.recentIds.map(id => produits.find(product => product.id === id)).filter(Boolean) as Produit[]
        : produits;
    const categoryFiltered = selectedCategory === 'all'
      ? filtered
      : filtered.filter(product => (product.categorie?.nom || product.categorieNom) === selectedCategory);
    return categoryFiltered.slice(0, 60);
  }, [catalogView, productHistory.favoriteIds, productHistory.recentIds, produits, selectedCategory]);

  const ajouterAuPanier = useCallback((p: Produit): boolean => {
    if (p.quantiteStock <= 0) {
      toast.error(`"${p.nomProduit}" est en rupture de stock.`, 5000, 'pos-cart-feedback');
      return false;
    }

    const current = panierRef.current;
    const existing = current.find(l => l.produitId === p.id);
    if (existing && existing.quantite >= p.quantiteStock) {
      toast.warning(`Stock maximal atteint pour "${p.nomProduit}" : ${p.quantiteStock} unite(s).`, 4000, 'pos-cart-feedback');
      return false;
    }

    const prix = Number((p.prixPromo || null) ?? p.prixDetail ?? 0);
    const nextQuantity = existing ? existing.quantite + 1 : 1;
    const next = existing
      ? current.map(l => l.produitId === p.id ? { ...l, quantite: nextQuantity } : l)
      : [...current, {
        produitId: p.id,
        nomProduit: p.nomProduit,
        prix,
        quantite: 1,
        stockDispo: p.quantiteStock,
        prixGros: p.prixGros,
        prixDemiGros: p.prixDemiGros,
        prixDetail: p.prixDetail,
        cmupActuel: p.cmupActuel,
        imageUrl: p.imageUrl,
      }];

    setPanier(next);
    productHistory.markRecent(p.id);
    setError(null);
    setLastAddedProductId(p.id);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastAddedProductId(null), 700);
    toast.success(`"${p.nomProduit}" ajoute au panier — quantite : ${nextQuantity}.`, 1800, 'pos-cart-feedback');
    return true;
  }, [setPanier, toast]);

  // ── Prix variable par bornes (le serveur reste l'autorité) ─────────────
  const refsLigne = (l: PanierLigne) => ({
    prixGros: l.prixGros,
    prixDemiGros: l.prixDemiGros,
    prixDetail: l.prixDetail,
    cmupActuel: l.cmupActuel,
  });
  const bornesDe = (l: PanierLigne) =>
    bornesPrix(refsLigne(l), admin?.role, (admin as any)?.peutVendreSousDemiGros);
  const setPrixLigne = (produitId: string, prix: number) =>
    setPanier(prev => prev.map(l => l.produitId === produitId ? { ...l, prix } : l));
  const setMotifLigne = (produitId: string, motif: string) =>
    setPanier(prev => prev.map(l => l.produitId === produitId ? { ...l, motifRemise: motif } : l));

  /** Première ligne en infraction (prix sous le minimum ou motif manquant), sinon null. */
  const ligneInvalide = (): string | null => {
    for (const l of panier) {
      const bornes = bornesDe(l);
      if (l.prix < bornes.min) {
        return `${l.nomProduit} : prix sous le minimum autorisé (${fmtFCFA(bornes.min)}).`;
      }
      if (exigeMotif(l.prix, refsLigne(l)) && !(l.motifRemise || '').trim()) {
        return `${l.nomProduit} : motif requis pour vendre sous le prix de détail.`;
      }
    }
    return null;
  };

  /** Cellule prix éditable + bornes + couleur de bande + motif si sous le détail. */
  const renderPrixLigne = (l: PanierLigne) => {
    const refs = refsLigne(l);
    const bornes = bornesDe(l);
    const bande = classerBande(l.prix, refs);
    const sousDetail = exigeMotif(l.prix, refs);
    return (
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={bornes.min}
            step="any"
            value={l.prix}
            onChange={e => setPrixLigne(l.produitId, Number(e.target.value))}
            className={`w-24 px-2 py-1 text-sm font-semibold rounded-lg border outline-none ${BANDE_STYLE[bande]}`}
          />
          <span className="text-[10px] text-slate-400 whitespace-nowrap">min {fmtFCFA(bornes.min)}</span>
        </div>
        {sousDetail && (
          <input
            type="text"
            value={l.motifRemise || ''}
            onChange={e => setMotifLigne(l.produitId, e.target.value)}
            placeholder="Motif de la remise (obligatoire)"
            maxLength={255}
            className="w-full px-2 py-1 text-xs rounded-lg border border-amber-300 bg-amber-50 outline-none focus:border-amber-500"
          />
        )}
      </div>
    );
  };

  const changerQuantite = (produitId: string, delta: number) => {
    setPanier(prev => prev
      .map(l => {
        if (l.produitId !== produitId) return l;
        const newQty = Math.max(0, Math.min(l.stockDispo, l.quantite + delta));
        return { ...l, quantite: newQty };
      })
      .filter(l => l.quantite > 0)
    );
  };

  const retirerLigne = (produitId: string) => setPanier(prev => prev.filter(l => l.produitId !== produitId));

  const total = saleFlow.total;
  const totalUnits = saleFlow.totalUnits;

  const suspendSale = () => {
    if (!panier.length) return;
    const next = saveSuspendedCart(cartDraftScope, panier, { nomClient, telephoneClient, selectedClientId, paymentMethod, noteCaissier });
    setSuspendedCarts(next);
    setPanier([]);
    setNomClient('');
    setTelephoneClient('');
    setSelectedClientId('');
    setPaymentMethod('ESPECES');
    setNoteCaissier('');
    clearActiveCartDraft(cartDraftScope);
    saleFlow.setPhase('SUSPENDED');
    setPanierMobileOpen(false);
    toast.success('Vente mise en attente.');
  };

  const resumeSale = (sale: SuspendedCart<PanierLigne, PosDraftContext>) => {
    if (panier.length && !window.confirm('Remplacer la vente actuelle par cette vente en attente ?')) return;
    setPanier(sale.items);
    setNomClient(sale.context.nomClient || '');
    setTelephoneClient(sale.context.telephoneClient || '');
    setSelectedClientId(sale.context.selectedClientId || '');
    setPaymentMethod(sale.context.paymentMethod || 'ESPECES');
    setNoteCaissier(sale.context.noteCaissier || '');
    setSuspendedCarts(removeSuspendedCart(cartDraftScope, sale.id));
    setActiveTab('vente');
    toast.success('Vente reprise.');
  };

  // ── Envoi ADMIN (ancien flux ticketApi) ───────────────────────────────
  const envoyerAdmin = async () => {
    if (!panier.length) return;
    const invalide = ligneInvalide();
    if (invalide) { setError(invalide); return; }
    setSubmitting(true);
    saleFlow.setPhase('SENDING');
    setError(null);
    setSuccess(null);
    const payload = {
      idempotencyKey: newSaleId(),
      nomClient: nomClient.trim() || undefined,
      telephoneClient: telephoneClient.trim() || undefined,
      noteCaissier: noteCaissier.trim() || undefined,
      lignes: panier.map(l => ({
        produitId: l.produitId,
        quantite: l.quantite,
        prixUnitaire: l.prix,
        motifRemise: (l.motifRemise || '').trim() || undefined,
      })),
    };
    try {
      if (!navigator.onLine) {
        await enqueueTicket(payload);
        setSuccess('Ticket conservé hors ligne — envoi automatique au retour du réseau.');
        setPanier([]);
        setNomClient('');
        setTelephoneClient('');
        setNoteCaissier('');
        return;
      }
      const ticket = await ticketApi.create(payload);
      setSuccess(`Ticket ${ticket.numeroTicket} envoyé au caissier.`);
      setPanier([]);
      saleFlow.setPhase('SENT');
      setNomClient('');
      setTelephoneClient('');
      setNoteCaissier('');
      setTimeout(() => navigate(can.accessCaisseJour(admin?.role) ? '/caisse-jour' : '/mes-tickets'), 1200);
    } catch (e: any) {
      if (!e?.response) {
        await enqueueTicket(payload);
        setPanier([]);
        setSuccess('Connexion interrompue — ticket conservé localement.');
      } else {
        const msg = e?.response?.data?.message || e?.message || 'Erreur inconnue';
        setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
        saleFlow.setPhase('ERROR');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Envoi VENDEUR (nouveau flux bonVenteApi) ───────────────────────────
  const envoyerVendeur = async () => {
    if (!panier.length) return;
    const invalide = ligneInvalide();
    if (invalide) { setError(invalide); return; }
    setSubmitting(true);
    saleFlow.setPhase('SENDING');
    setError(null);
    setSuccess(null);
    const payload = {
      idempotencyKey: newSaleId(),
      clientId: selectedClientId || undefined,
      methodePaiement: paymentMethod,
      noteCaissier: noteCaissier.trim() || undefined,
      lignes: panier.map(l => ({
        produitId: l.produitId,
        quantite: l.quantite,
        prixUnitaire: l.prix,
        motifRemise: (l.motifRemise || '').trim() || undefined,
      })),
    };
    try {
      if (!navigator.onLine) {
        await enqueueBon(payload);
        setSuccess('Bon conservé hors ligne — envoi automatique au retour du réseau.');
        setPanier([]);
        setSelectedClientId('');
        setPaymentMethod('ESPECES');
        setNoteCaissier('');
        return;
      }
      await bonVenteApi.create(payload);
      setSuccess('Bon envoyé à la caissière.');
      setPanier([]);
      saleFlow.setPhase('SENT');
      setSelectedClientId('');
      setPaymentMethod('ESPECES');
      setNoteCaissier('');
      setPanierMobileOpen(false);
      await loadBons();
      setActiveTab('vente');
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } catch (e: any) {
      if (!e?.response) {
        await enqueueBon(payload);
        setPanier([]);
        setSuccess('Connexion interrompue — bon conservé localement.');
      } else {
        const msg = e?.response?.data?.message || e?.message || 'Erreur inconnue';
        setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
        saleFlow.setPhase('ERROR');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const creerProforma = async () => {
    if (!panier.length) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const proforma = await proformaApi.create({
        clientId: selectedClientId || undefined,
        lignes: panier.map(l => ({ produitId: l.produitId, quantite: l.quantite, prixUnitaire: l.prix })),
      });
      setProformaToPrint(proforma);
      setSuccess(`Proforma ${proforma.numero} creee.`);
      setPanier([]);
      setSelectedClientId('');
      setPanierMobileOpen(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erreur inconnue';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const annulerBon = async (id: string) => {
    try { await bonVenteApi.annuler(id); await loadBons(); }
    catch (e: any) { setError(e?.response?.data?.message || 'Impossible d\'annuler.'); }
  };

  useEffect(() => {
    if (activeTab !== 'vente' || scanOpen || equivOpen) return;
    const handleExpressShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (event.key === '/' && !editing) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key === '?' && !editing) {
        event.preventDefault();
        setShortcutHelpOpen(true);
        return;
      }
      if (!['F2', 'F3', 'F4', 'F8'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'F2') setPaymentMethod('ESPECES');
      if (event.key === 'F3') setPaymentMethod('MOBILE_MONEY');
      if (event.key === 'F4') setPaymentMethod('CARTE');
      if (event.key === 'F8' && panier.length > 0 && !submitting) {
        if (isVendeur) { setReviewOpen(true); saleFlow.setPhase('REVIEWING'); }
        else void envoyerAdmin();
      }
    };
    document.addEventListener('keydown', handleExpressShortcut);
    return () => document.removeEventListener('keydown', handleExpressShortcut);
  }, [activeTab, scanOpen, equivOpen, panier.length, submitting, isVendeur, envoyerVendeur, envoyerAdmin]);

  // ── Équivalents IA ─────────────────────────────────────────────────────
  const lancerEquiv = async (opts: { query?: string; produitId?: string }) => {
    setEquivLoading(true); setEquivError(null); setEquivResults([]);
    try {
      const res = await equivalenceApi.suggest({ query: opts.query?.trim() || undefined, produitId: opts.produitId || undefined, source: 'pos' });
      setEquivResults(res?.suggestions || []);
      if (!(res?.suggestions || []).length) setEquivError(res?.message || 'Aucun équivalent trouvé.');
    } catch (e: any) { setEquivError(e?.response?.data?.message || 'Service IA indisponible.'); }
    finally { setEquivLoading(false); }
  };

  const ouvrirEquiv = async (opts: { query?: string; produitId?: string }) => {
    setEquivOpen(true); setEquivQuery(opts.query ?? ''); setEquivProduitId(opts.produitId ?? null);
    await lancerEquiv(opts);
  };

  const ajouterSuggestion = (s: any) => ajouterAuPanier({
    id: s.produitId, nomProduit: s.nomProduit, marque: s.marque,
    prixDetail: s.prixDetail, prixDemiGros: s.prixDemiGros, prixGros: s.prixGros, quantiteGros: s.quantiteGros,
    prixPromo: s.prixPromo, cmupActuel: s.cmupActuel,
    quantiteStock: s.quantiteStock, imageUrl: s.imageUrl,
  });

  // ── Recherche manuelle par code famille / code ─────────────────────────
  const rechercherParCode = async () => {
    const cf = codeSearchFamille.trim();
    const c  = codeSearchCode.trim();
    if (!cf || !c) {
      setError('Entrez le code famille ET le code.');
      return;
    }
    setCodeSearchLoading(true);
    setError(null);
    try {
      const p: any = await produitApi.findByCode(cf, c);
      if (ajouterAuPanier(p as Produit)) {
        setCodeSearchFamille('');
        setCodeSearchCode('');
      }
    } catch {
      setError(`Produit introuvable : famille "${cf}" / code "${c}"`);
      toast.error(`Produit introuvable : famille "${cf}" / code "${c}".`);
    } finally {
      setCodeSearchLoading(false);
    }
  };

  // ── Scan caméra ────────────────────────────────────────────────────────
  const rememberScan = useCallback((product: Produit) => {
    const quantity = panierRef.current.find(line => line.produitId === product.id)?.quantite || 1;
    setRecentScans(previous => [
      {
        id: `${product.id}-${Date.now()}`,
        name: product.nomProduit,
        price: Number((product.prixPromo || null) ?? product.prixDetail ?? 0),
        quantity,
        scannedAt: Date.now(),
        imageUrl: product.imageUrl,
      },
      ...previous,
    ].slice(0, 4));
  }, [panierRef]);

  const handleCameraBarcode = useCallback(async (raw: string) => {
    try {
      const code = raw.trim();
      const p: any = await produitApi.findByRawScan(code);
      if (p.quantiteStock <= 0) {
        setError(`"${p.nomProduit}" est en rupture de stock.`);
        toast.error(`"${p.nomProduit}" est en rupture de stock.`);
        return;
      }
      if (ajouterAuPanier(p as Produit)) rememberScan(p as Produit);
    } catch (scanRequestError: any) {
      const code = raw.trim();
      const message = getApiErrorMessage(
        scanRequestError,
        `Produit introuvable pour le code-barres "${code}".`,
      );
      setError(message);
      toast.error(message);
    } finally {
      setScanRestartKey(key => key + 1);
    }
  }, [ajouterAuPanier, rememberScan, toast]);

  // Douchette USB/Bluetooth : garder le flux historique, independant de la camera.
  const handleHardwareBarcode = useCallback(async (raw: string) => {
    try {
      const code = raw.trim();
      const p: any = await produitApi.findByRawScan(code);
      if (p.quantiteStock <= 0) {
        setError(`"${p.nomProduit}" est en rupture de stock.`);
        toast.error(`"${p.nomProduit}" est en rupture de stock.`);
        return;
      }
      if (ajouterAuPanier(p as Produit)) rememberScan(p as Produit);
    } catch (scanRequestError: any) {
      const code = raw.trim();
      const message = getApiErrorMessage(
        scanRequestError,
        `Produit introuvable pour le code-barres "${code}".`,
      );
      setError(message);
      toast.error(message);
    }
  }, [ajouterAuPanier, rememberScan, toast]);

  const {
    videoRef: scanVideoRef,
    error: scanError,
    clearError: clearScanError,
    start: startScan,
    stop: stopScan,
  } = useBarcodeScanner({ onDetected: handleCameraBarcode });

  useEffect(() => {
    if (scanOpen) startScan();
    else stopScan();
    return () => stopScan();
  }, [scanOpen, scanRestartKey, startScan, stopScan]);

  const toggleTorch = useCallback(async () => {
    const stream = scanVideoRef.current?.srcObject;
    if (!(stream instanceof MediaStream)) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      toast.info("La lampe n'est pas disponible sur cet appareil.");
    }
  }, [toast, torchOn]);

  useEffect(() => {
    if (!scanOpen) window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [scanOpen]);

  // ── Barcode reader USB/Bluetooth — écoute globale clavier ─────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const now = Date.now();
      const tag = (e.target as HTMLElement).tagName;
      const isInSearch = e.target === searchInputRef.current;

      // Ignorer les autres champs texte (client, téléphone, codes, etc.)
      if (!isInSearch && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;

      if (e.key === 'Enter') {
        if (barcodeTimerRef.current) { clearTimeout(barcodeTimerRef.current); barcodeTimerRef.current = null; }
        const buf = barcodeBufferRef.current;
        barcodeBufferRef.current = '';
        if (buf.length >= 4) {
          // Si le scan a eu lieu dans la barre de recherche, vider le champ
          if (isInSearch) { e.preventDefault(); setSearch(''); }
          handleHardwareBarcode(buf);
        }
        return;
      }

      if (e.key.length !== 1) return;

      // Réinitialiser si trop de temps s'est écoulé (> 100ms = frappe humaine)
      if (now - lastKeyTimeRef.current > 100) barcodeBufferRef.current = '';
      // Douchette : certaines envoient les chiffres "shiftés" (! ) # * ( ...).
      // On lit la touche PHYSIQUE (e.code) pour récupérer le vrai chiffre,
      // indépendamment de Shift et de la disposition clavier.
      const ch = /^(Digit|Numpad)[0-9]$/.test(e.code) ? e.code.slice(-1) : e.key;
      barcodeBufferRef.current += ch;
      lastKeyTimeRef.current = now;

      // Fallback : traiter si le reader n'envoie pas d'Entrée
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
      barcodeTimerRef.current = setTimeout(() => {
        const buf = barcodeBufferRef.current;
        barcodeBufferRef.current = '';
        if (buf.length >= 4) {
          if (isInSearch) setSearch('');
          handleHardwareBarcode(buf);
        }
      }, 80);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
    };
  }, [handleHardwareBarcode]);

  // ── Rendu carte produit (commun) ───────────────────────────────────────
  const renderProduit = (p: Produit) => {
    const prix = Number((p.prixPromo || null) ?? p.prixDetail ?? 0);
    const enRupture = p.quantiteStock <= 0;
    const lignePanier = panier.find(l => l.produitId === p.id);
    const justAdded = lastAddedProductId === p.id;
    const equivalenceEligible = isEquivalenceEligibleProduct(p);
    const img = resolveImgUrl(p.imageUrl);
    const contenu = (
      <>
        <div className="mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50">
          {img ? <img src={img} alt={p.nomProduit} className="h-full w-full object-contain p-2" />
            : <ShoppingCart size={24} className="text-slate-300" />}
        </div>
        <p className="font-semibold text-sm text-slate-900 line-clamp-2">{p.nomProduit}</p>
        <p className="text-xs text-slate-500 truncate">{p.marque || ''}</p>
        <p className="mt-1 text-sm font-bold text-primary">{fmtFCFA(prix)}</p>
        <p className={`text-xs mt-0.5 ${enRupture ? 'text-red-500' : 'text-slate-400'}`}>
          {enRupture ? 'Rupture' : `Stock : ${p.quantiteStock}`}
        </p>
      </>
    );
    if (enRupture) return (
      <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="opacity-50">{contenu}</div>
        {equivalenceEligible && (
          <button onClick={() => ouvrirEquiv({ query: p.nomProduit, produitId: p.id })}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg hover:bg-violet-100">
          <Sparkles size={13} /> Équivalent (IA)
          </button>
        )}
      </div>
    );
    return (
      <div key={p.id} onClick={() => ajouterAuPanier(p)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ajouterAuPanier(p); } }} role="button" tabIndex={0}
        aria-label={`Ajouter ${p.nomProduit} au panier${lignePanier ? `, quantite actuelle ${lignePanier.quantite}` : ''}`}
        className={`group relative rounded-xl border p-3 text-left transition-all duration-150 hover:shadow-sm active:scale-[0.98] motion-reduce:transform-none ${
          lignePanier ? 'border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-100' : 'border-slate-200 bg-white hover:border-slate-300'
        } ${
          justAdded ? 'scale-[1.01] shadow-[0_8px_20px_rgba(5,150,105,0.12)]' : ''
        }`}>
        <button type="button" onClick={event => { event.stopPropagation(); productHistory.toggleFavorite(p.id); }} aria-label={productHistory.favoriteIds.includes(p.id) ? `Retirer ${p.nomProduit} des favoris` : `Ajouter ${p.nomProduit} aux favoris`} className="absolute left-2 top-2 z-10 hidden h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-amber-500 min-[1200px]:flex">
          <Star size={16} className={productHistory.favoriteIds.includes(p.id) ? 'fill-amber-400 text-amber-500' : ''} />
        </button>
        {lignePanier && (
          <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-black text-white shadow-sm">
            <Check size={12} strokeWidth={3} /> {lignePanier.quantite}
          </span>
        )}
        {contenu}
      </div>
    );
  };

  // ── Panier ADMIN (ancien design) ───────────────────────────────────────
  const renderPanierAdmin = (onEnvoyer?: () => void) => (
    <>
      <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
        <ShoppingCart size={20} className="text-primary" /> Panier ({totalUnits} unite{totalUnits > 1 ? 's' : ''})
      </h3>
      {panier.length === 0
        ? <p className="text-sm text-slate-400 text-center py-8">Aucun produit sélectionné.</p>
        : <ul className="space-y-3 max-h-64 overflow-y-auto">
          {panier.map(l => (
            <li key={l.produitId} className={`flex items-center gap-2 rounded-lg pb-3 transition-colors border-b border-slate-100 last:border-0 ${
              lastAddedProductId === l.produitId ? 'bg-emerald-50 px-2 pt-2' : ''
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{l.nomProduit}</p>
                {renderPrixLigne(l)}
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => changerQuantite(l.produitId, -1)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Minus size={14} /></button>
                <span className="w-6 text-center text-sm font-semibold">{l.quantite}</span>
                <button onClick={() => changerQuantite(l.produitId, 1)} disabled={l.quantite >= l.stockDispo} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><Plus size={14} /></button>
              </div>
              <button onClick={() => retirerLigne(l.produitId)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-bold text-primary">{fmtFCFA(total)}</span>
        </div>
      </div>
    </>
  );

  // ── Panier VENDEUR (nouveau design) ────────────────────────────────────
  const renderPanierVendeur = (onEnvoyer?: () => void) => (
    <>
      {panier.length === 0
        ? <p className="text-sm text-slate-400 text-center py-8">Aucun produit sélectionné.</p>
        : <ul className="space-y-3 max-h-64 overflow-y-auto">
          {panier.map(l => (
            <li key={l.produitId} className={`flex items-center gap-2 rounded-lg pb-3 transition-colors border-b border-slate-100 last:border-0 ${
              lastAddedProductId === l.produitId ? 'bg-emerald-50 px-2 pt-2' : ''
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{l.nomProduit}</p>
                {renderPrixLigne(l)}
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => changerQuantite(l.produitId, -1)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Minus size={14} /></button>
                <span className="w-6 text-center text-sm font-semibold">{l.quantite}</span>
                <button onClick={() => changerQuantite(l.produitId, 1)} disabled={l.quantite >= l.stockDispo} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><Plus size={14} /></button>
              </div>
              <button onClick={() => retirerLigne(l.produitId)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-bold text-primary">{fmtFCFA(total)}</span>
        </div>
        <div className="relative min-[1200px]:hidden">
          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input inputMode="tel" value={telephoneClient} onChange={event => setTelephoneClient(event.target.value)} placeholder="Téléphone du client (facultatif)" className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
          className="hidden w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary min-[1200px]:block">
          <option value="">Aucun client suggéré</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''}</option>)}
        </select>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
          className="hidden w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary min-[1200px]:block">
          {METHODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <textarea value={noteCaissier} onChange={e => setNoteCaissier(e.target.value)} maxLength={500} rows={2} placeholder="Note au caissier (facultatif)"
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <button onClick={onEnvoyer ?? (() => { setReviewOpen(true); saleFlow.setPhase('REVIEWING'); })} disabled={!panier.length || submitting} title="Contrôler puis envoyer à la caissière (F8)"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-opacity-90 disabled:opacity-50">
          <Send size={18} />{submitting ? 'Envoi…' : 'Envoyer au caissier'}
        </button>
        <button onClick={suspendSale} disabled={!panier.length || submitting}
          className="hidden w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50 min-[1200px]:block">
          Mettre la vente en attente
        </button>
        <button onClick={creerProforma} disabled={!panier.length || submitting}
          className="hidden w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 min-[1200px]:flex">
          <Printer size={18} />{submitting ? 'Creation...' : 'Creer proforma'}
        </button>
      </div>
    </>
  );

  const renderSaleReview = () => (
    <AnimatePresence>
      {reviewOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" onClick={() => !submitting && setReviewOpen(false)}><motion.div initial={{ scale: .97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .97, opacity: 0 }} role="dialog" aria-modal="true" aria-label="Contrôle de la vente" onClick={event => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Dernier contrôle</p><h3 className="mt-1 text-lg font-bold text-slate-900">Envoyer cette vente ?</h3></div><button onClick={() => setReviewOpen(false)} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header><div className="max-h-[55vh] overflow-y-auto p-5"><ul className="divide-y divide-slate-100">{panier.map(line => <li key={line.produitId} className="flex justify-between gap-3 py-3 text-sm"><span className="text-slate-700">{line.quantite} × {line.nomProduit}</span><strong>{fmtFCFA(line.prix * line.quantite)}</strong></li>)}</ul>{noteCaissier && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><strong className="text-slate-800">Note caisse :</strong> {noteCaissier}</div>}<div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 p-4 text-white"><span>{totalUnits} unité(s)</span><strong className="text-xl">{fmtFCFA(total)}</strong></div></div><footer className="grid grid-cols-2 gap-3 border-t border-slate-100 p-5"><button onClick={() => setReviewOpen(false)} disabled={submitting} className="min-h-12 rounded-xl bg-slate-100 font-bold text-slate-700">Modifier</button><button onClick={() => { void envoyerVendeur().then(() => setReviewOpen(false)); }} disabled={submitting} className="min-h-12 rounded-xl bg-primary font-bold text-white disabled:opacity-50">{submitting ? 'Envoi…' : 'Confirmer l’envoi'}</button></footer></motion.div></motion.div>}
    </AnimatePresence>
  );

  const renderShortcutHelp = () => (
    <AnimatePresence>
      {shortcutHelpOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShortcutHelpOpen(false)}>
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Aide des raccourcis" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Raccourcis de vente</h3><button onClick={() => setShortcutHelpOpen(false)} aria-label="Fermer l'aide" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm"><dt className="font-mono font-bold text-slate-900">/</dt><dd className="text-slate-600">Rechercher un article</dd><dt className="font-mono font-bold text-slate-900">F2</dt><dd className="text-slate-600">Espèces</dd><dt className="font-mono font-bold text-slate-900">F3</dt><dd className="text-slate-600">Mobile Money</dd><dt className="font-mono font-bold text-slate-900">F4</dt><dd className="text-slate-600">Carte</dd><dt className="font-mono font-bold text-slate-900">F8</dt><dd className="text-slate-600">Envoyer à la caisse</dd></dl>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Modal scan caméra ─────────────────────────────────────────────────
  const renderScanModal = () => {
    if (typeof document === 'undefined') return null;
    const lastScan = recentScans[0];
    return createPortal(
      <AnimatePresence>
        {scanOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black md:grid md:grid-cols-[minmax(0,65%)_minmax(260px,35%)]">
            <section className="relative h-full min-h-0 overflow-hidden bg-black md:h-auto" aria-label="Scanner un article">
              <video ref={scanVideoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/65" />
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 md:p-5">
                <button onClick={() => { setTorchOn(false); setScanOpen(false); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white" aria-label="Fermer le scanner"><X size={22} /></button>
                <button onClick={toggleTorch} className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${torchOn ? 'bg-amber-500' : 'bg-black/45'}`} aria-label="Activer ou désactiver la lampe"><Flashlight size={20} /></button>
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 pb-24 md:pb-36">
                <div className="relative h-44 w-full max-w-md rounded-xl border border-white/25">
                  <span className="absolute -left-px -top-px h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-white" />
                  <span className="absolute -right-px -top-px h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-white" />
                  <span className="absolute -bottom-px -left-px h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-white" />
                  <span className="absolute -bottom-px -right-px h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-white" />
                  <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-primary" />
                </div>
              </div>
              <p className="absolute inset-x-0 top-24 text-center text-sm font-semibold text-white">Placez le code-barres dans le cadre</p>
              {lastScan && <div className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg md:bottom-40"><span className="inline-flex items-center gap-2"><CheckCircle2 size={17} />Article ajouté · quantité {lastScan.quantity}</span></div>}
              {scanError && <p className="absolute inset-x-4 bottom-28 z-20 rounded-lg border border-red-400/30 bg-red-950/80 px-4 py-3 text-center text-sm text-red-100 md:bottom-40">{scanError}</p>}

              <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 md:p-5">
                <div className="md:hidden">
                  {lastScan ? <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-slate-50">{resolveImgUrl(lastScan.imageUrl) ? <img src={resolveImgUrl(lastScan.imageUrl) || ''} alt="" className="h-full w-full object-contain p-1" /> : <ShoppingCart size={20} className="text-slate-300" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{lastScan.name}</p><p className="font-bold text-primary">{fmtFCFA(lastScan.price)}</p></div><strong className="text-sm text-slate-700">Qté {lastScan.quantity}</strong></div> : <p className="py-2 text-center text-sm text-slate-400">Le dernier article scanné apparaîtra ici.</p>}
                </div>
                <div className="hidden md:block">
                  <h3 className="text-sm font-bold text-slate-900">Derniers articles scannés</h3>
                  <div className="mt-2 grid gap-1.5">
                    {recentScans.length === 0 ? <p className="py-3 text-xs text-slate-400">Aucun article scanné.</p> : recentScans.slice(0, 3).map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-xs odd:bg-slate-50"><span className="truncate font-semibold text-slate-700">{item.name}</span><span className="shrink-0 text-slate-500">×{item.quantity}</span></div>)}
                  </div>
                </div>
              </div>
            </section>
            <aside className="hidden min-h-0 overflow-y-auto bg-white p-5 md:block">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Panier · {totalUnits} article{totalUnits > 1 ? 's' : ''}</h2><ShoppingCart size={20} className="text-primary" /></div>
              {renderPanierVendeur(() => { setScanOpen(false); setReviewOpen(true); saleFlow.setPhase('REVIEWING'); })}
            </aside>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  };

  // ── Catalogue commun ───────────────────────────────────────────────────
  const renderCatalogue = () => (
    <div className="space-y-3">
      {/* Barre recherche nom + bouton scanner */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input ref={searchInputRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit ou une marque…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        </div>
        <button
          onClick={() => { clearScanError(); setScanOpen(true); }}
          title="Scanner un code-barres"
          className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-primary/40 hover:text-primary transition-colors shrink-0"
        >
          <ScanBarcode size={18} />
          <span className="hidden sm:inline text-sm font-medium">Scanner</span>
        </button>
      </div>
      <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1" aria-label="Catégories du catalogue">
        <button onClick={() => { setSelectedCategory('all'); setCatalogView('all'); }} className={`min-h-10 shrink-0 rounded-lg px-4 text-xs font-bold ${selectedCategory === 'all' && catalogView === 'all' ? 'bg-primary text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>Tous</button>
        {categoryOptions.map(category => <button key={category} onClick={() => { setSelectedCategory(category); setCatalogView('all'); }} className={`min-h-10 shrink-0 rounded-lg px-4 text-xs font-bold ${selectedCategory === category ? 'bg-primary text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{category}</button>)}
        <button onClick={() => { setCatalogView('favorites'); setSelectedCategory('all'); }} className={`hidden min-h-10 shrink-0 rounded-lg px-4 text-xs font-bold min-[1200px]:block ${catalogView === 'favorites' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>Favoris{productHistory.favoriteIds.length > 0 ? ` (${productHistory.favoriteIds.length})` : ''}</button>
        <button onClick={() => { setCatalogView('recent'); setSelectedCategory('all'); }} className={`hidden min-h-10 shrink-0 rounded-lg px-4 text-xs font-bold min-[1200px]:block ${catalogView === 'recent' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>Récents</button>
      </div>

      {/* Recherche manuelle code famille / code */}
      <div className="hidden flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 min-[1200px]:flex">
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide shrink-0">Code :</span>
        <input
          type="text"
          value={codeSearchFamille}
          onChange={e => setCodeSearchFamille(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && rechercherParCode()}
          placeholder="Code famille"
          className="w-28 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-300/40 outline-none placeholder:font-sans placeholder:text-slate-400"
        />
        <span className="text-indigo-300 font-bold">/</span>
        <input
          type="text"
          value={codeSearchCode}
          onChange={e => setCodeSearchCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && rechercherParCode()}
          placeholder="Code article"
          className="w-32 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-300/40 outline-none placeholder:font-sans placeholder:text-slate-400"
        />
        <button
          onClick={rechercherParCode}
          disabled={codeSearchLoading || !codeSearchFamille.trim() || !codeSearchCode.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {codeSearchLoading
            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Plus size={13} />}
          Ajouter
        </button>
      </div>
      {loading ? <div className="text-center text-slate-400 py-12">Chargement…</div>
        : produitsFiltres.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-slate-400">Aucun produit trouvé.</p>
            {search.trim().length >= 2 && looksLikeElectronicComponentSearch(search) && (
              <button onClick={() => ouvrirEquiv({ query: search })}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-600/20 hover:bg-violet-700">
                <Sparkles size={16} /> Chercher un équivalent (IA)
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {produitsFiltres.map(renderProduit)}
          </div>
        )}
    </div>
  );

  // ── Modal équivalents IA (commun) ──────────────────────────────────────
  const renderEquivModal = () => (
    <AnimatePresence>
      {equivOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setEquivOpen(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-600" /> Équivalents suggérés
              </h3>
              <button onClick={() => setEquivOpen(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="p-5 border-b border-slate-100">
              <div className="flex gap-2">
                <input type="text" value={equivQuery} onChange={e => setEquivQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') lancerEquiv({ query: equivQuery, produitId: equivProduitId || undefined }); }}
                  placeholder="Ex. condensateur 12µF 450V"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none" />
                <button onClick={() => lancerEquiv({ query: equivQuery, produitId: equivProduitId || undefined })}
                  disabled={equivLoading}
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50">
                  {equivLoading ? '…' : 'Chercher'}
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {equivLoading ? <div className="text-center text-slate-400 py-8">Recherche…</div>
                : equivError ? <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-sm"><AlertCircle size={16} />{equivError}</div>
                  : equivResults.map(s => {
                    const prix = Number((s.prixPromo || null) ?? s.prixDetail ?? 0);
                    const compatCfg: Record<string, string> = { haute: 'bg-emerald-100 text-emerald-700', moyenne: 'bg-amber-100 text-amber-700', faible: 'bg-red-100 text-red-700' };
                    return (
                      <div key={s.produitId} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-900">{s.nomProduit}</p>
                            {s.marque && <p className="text-xs text-slate-500">{s.marque}</p>}
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${compatCfg[s.compatibilite] || compatCfg.moyenne}`}>{s.compatibilite}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5">{s.raison}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                          <span className="text-xs text-slate-500"><span className="font-bold text-primary">{fmtFCFA(prix)}</span> · Stock : {s.quantiteStock}</span>
                          <button onClick={() => ajouterSuggestion(s)} disabled={s.quantiteStock <= 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50">
                            <Plus size={13} /> Ajouter
                          </button>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderPosHeader = (title: string, subtitle: string) => (
    <header className="mb-3 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-3 py-2 md:rounded-xl md:border min-[1200px]:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Retour à l’accueil"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
        >
          <Home size={20} />
        </button>
        <img src="/logo.png" alt="Newoteg" className="h-10 w-10 shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-950">{title}</p>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/mes-tickets')}
        aria-label="Voir les tickets"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
      >
        <Receipt size={20} />
      </button>
    </header>
  );

  // ══════════════════════════════════════════════════════════════════════
  // RENDU ADMIN/SUPER_ADMIN — ancien design simple
  // ══════════════════════════════════════════════════════════════════════
  if (!isVendeur) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`min-h-screen bg-white md:min-h-0 md:bg-transparent ${panier.length > 0 ? 'pb-24 md:pb-0' : ''}`}>
        {renderPosHeader('Nouvelle vente', 'Sélectionnez ou scannez un article')}
        <div className="mb-6 hidden items-center justify-between min-[1200px]:flex">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vente en cours</h2>
            <p className="text-slate-500 text-sm">Sélectionnez les produits, puis envoyez le ticket au caissier.</p>
          </div>
        </div>

        {error && <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200"><AlertCircle size={16} /><span className="text-sm">{error}</span></div>}
        {success && <div role="status" aria-live="polite" className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={16} /><span className="text-sm">{success}</span></div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,65%)_minmax(240px,35%)] min-[1200px]:gap-5">
          <div>{renderCatalogue()}</div>

          {/* Panier desktop admin */}
          <div className="sticky top-3 hidden max-h-[calc(100vh-1.5rem)] self-start space-y-4 overflow-y-auto pr-1 md:block min-[1200px]:top-4 min-[1200px]:max-h-[calc(100vh-7rem)]">
            <div className="border border-slate-200 bg-white p-4 md:rounded-xl min-[1200px]:p-5">
              {renderPanierAdmin()}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Client (optionnel)</h3>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={nomClient} onChange={e => setNomClient(e.target.value)}
                  placeholder="Nom du client" maxLength={150}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" value={telephoneClient} onChange={e => setTelephoneClient(e.target.value)}
                  placeholder="Téléphone" maxLength={30}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
            <button onClick={envoyerAdmin} disabled={!panier.length || submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-opacity-90 disabled:opacity-50">
              <Send size={18} />{submitting ? 'Envoi…' : 'Envoyer au caissier'}
            </button>
          </div>
        </div>

        {/* Barre mobile admin */}
        {panier.length > 0 && (
          <div className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white px-3 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden">
            <button onClick={() => setPanierMobileOpen(true)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 bg-primary text-white font-bold rounded-xl transition-all ${
                lastAddedProductId ? 'scale-[1.01] shadow-lg' : ''
              }`}>
              <span className="flex items-center gap-2"><ShoppingCart size={18} />{totalUnits} unite{totalUnits > 1 ? 's' : ''}</span>
              <span>{fmtFCFA(total)}</span>
            </button>
          </div>
        )}

        {/* Drawer mobile admin */}
        <AnimatePresence>
          {panierMobileOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/50 md:hidden" onClick={() => setPanierMobileOpen(false)}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
                onClick={e => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white">
                <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-slate-300" />
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><ShoppingCart size={20} className="text-primary" />Panier ({totalUnits} unite{totalUnits > 1 ? 's' : ''})</h3>
                  <button onClick={() => setPanierMobileOpen(false)} aria-label="Fermer le panier" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-3">
                  {renderPanierAdmin()}
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={nomClient} onChange={e => setNomClient(e.target.value)} placeholder="Nom du client (optionnel)" maxLength={150}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" value={telephoneClient} onChange={e => setTelephoneClient(e.target.value)} placeholder="Téléphone (optionnel)" maxLength={30}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <button onClick={() => { setPanierMobileOpen(false); envoyerAdmin(); }} disabled={!panier.length || submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50">
                    <Send size={18} />{submitting ? 'Envoi…' : 'Envoyer au caissier'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {renderEquivModal()}
        {renderScanModal()}
        {renderShortcutHelp()}
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDU VENDEUR — nouveau design avec tabs, score, dropdown, primes
  // ══════════════════════════════════════════════════════════════════════
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={`min-h-screen bg-white md:min-h-0 md:bg-transparent ${panier.length > 0 && activeTab === 'vente' ? 'pb-24 md:pb-0' : ''}`}>

      {renderPosHeader('Nouvelle vente', `${totalUnits} unité${totalUnits > 1 ? 's' : ''} dans le panier`)}

      <div className="mb-6 hidden items-center justify-between gap-3 min-[1200px]:flex">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vente en cours</h2>
          <p className="text-slate-500 text-sm">Vendeur : {sellerName}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
          Score ce mois : {monScore} ticket{monScore > 1 ? 's' : ''}
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">{lastAddedProductId ? `Article ajouté. Panier : ${totalUnits} unité${totalUnits > 1 ? 's' : ''}.` : ''}</span>
      {error && <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200"><AlertCircle size={16} /><span className="text-sm">{error}</span></div>}
      {success && <div role="status" aria-live="polite" className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={16} /><span className="text-sm">{success}</span></div>}

      {/* Onglets */}
      <div className="mb-6 hidden gap-2 rounded-lg bg-slate-100 p-1 min-[1200px]:flex">
        <button onClick={() => setActiveTab('vente')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'vente' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Catalogue
        </button>
        <button onClick={() => setActiveTab('enAttente')}
          className={`relative flex-1 rounded-md px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'enAttente' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          En attente
          {bonsEnAttente.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
              {bonsEnAttente.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('suspended')}
          className={`relative flex-1 rounded-md px-3 py-2 text-sm font-bold transition-colors ${activeTab === 'suspended' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          En pause
          {suspendedCarts.length > 0 && <span className="ml-1 rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] text-white">{suspendedCarts.length}</span>}
        </button>
      </div>

      {activeTab === 'vente' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,65%)_minmax(240px,35%)] min-[1200px]:gap-5">
          <div>{renderCatalogue()}</div>
          <div className="sticky top-3 hidden max-h-[calc(100vh-1.5rem)] self-start overflow-y-auto pr-1 md:block min-[1200px]:top-4 min-[1200px]:max-h-[calc(100vh-7rem)]">
            <div className="border border-slate-200 bg-white p-4 md:rounded-xl min-[1200px]:p-5">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary" /> Panier ({totalUnits} unite{totalUnits > 1 ? 's' : ''})
              </h3>
              {renderPanierVendeur()}
            </div>
          </div>
        </div>
      ) : activeTab === 'enAttente' ? (
        <div className="space-y-3">
          {bonsEnAttente.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
              <Receipt size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun bon en attente.</p>
              <p className="mt-1 text-sm">Vos bons validés sont dans "Mes tickets".</p>
            </div>
          ) : bonsEnAttente.map(bon => (
            <div key={bon.id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900">{bon.numeroTicket}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Clock size={11} />{new Date(bon.createdAt).toLocaleString('fr-FR')}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">EN ATTENTE</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {bon.lignes.map(l => <li key={l.id}>{l.quantite} × {l.nomProduit}</li>)}
              </ul>
              <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-sm font-bold text-primary">{fmtFCFA(Number(bon.montantTotal || 0))}</span>
                <button onClick={() => annulerBon(bon.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100">
                  <X size={13} /> Annuler
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {suspendedCarts.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400"><ShoppingCart size={36} className="mx-auto mb-3 opacity-30" /><p className="font-medium">Aucune vente en pause.</p></div> : suspendedCarts.map(sale => <article key={sale.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{sale.items.reduce((sum, item) => sum + item.quantite, 0)} unité(s)</p><p className="mt-1 text-xs text-slate-500">Mise en pause le {new Date(sale.createdAt).toLocaleString('fr-FR')}</p></div><strong className="text-primary">{fmtFCFA(sale.items.reduce((sum, item) => sum + item.prix * item.quantite, 0))}</strong></div><p className="mt-3 truncate text-sm text-slate-600">{sale.items.map(item => item.nomProduit).join(', ')}</p><div className="mt-4 flex gap-2"><button onClick={() => resumeSale(sale)} className="min-h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-bold text-white">Reprendre</button><button onClick={() => setSuspendedCarts(removeSuspendedCart(cartDraftScope, sale.id))} className="min-h-11 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-700">Supprimer</button></div></article>)}
        </div>
      )}

      {/* Barre mobile vendeur */}
      {activeTab === 'vente' && panier.length > 0 && (
        <div className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white px-3 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden">
          <button onClick={() => setPanierMobileOpen(true)}
            className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 font-bold text-white transition-all ${
              lastAddedProductId ? 'scale-[1.01] shadow-lg' : ''
            }`}>
            <span className="text-left"><span className="block text-xs font-medium text-white/75">{totalUnits} unité{totalUnits > 1 ? 's' : ''} · {fmtFCFA(total)}</span><span className="block">Voir le panier</span></span>
            <ShoppingCart size={20} />
          </button>
        </div>
      )}

      {/* Drawer mobile vendeur */}
      <AnimatePresence>
        {panierMobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 md:hidden" onClick={() => setPanierMobileOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white">
              <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-slate-300" />
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><ShoppingCart size={20} className="text-primary" />Panier ({totalUnits} unite{totalUnits > 1 ? 's' : ''})</h3>
                <button onClick={() => setPanierMobileOpen(false)} aria-label="Fermer le panier" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500"><X size={20} /></button>
              </div>
              <div className="p-5">{renderPanierVendeur(() => { setPanierMobileOpen(false); setReviewOpen(true); saleFlow.setPhase('REVIEWING'); })}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {proformaToPrint && (
        <ReceiptGenerator
          documentId={proformaToPrint.id}
          printCount={proformaToPrint.printCount || 0}
          type="proforma"
          numero={proformaToPrint.numero}
          dateVente={proformaToPrint.dateCreation}
          methodePaiement="A regler"
          montantTotal={Number(proformaToPrint.montantTotal)}
          client={{
            nom: proformaToPrint.client?.nom || proformaToPrint.clientNom || 'Client comptoir',
            nui: proformaToPrint.client?.niu || proformaToPrint.clientNiu || undefined,
            rccm: proformaToPrint.client?.rccm || proformaToPrint.clientRccm || undefined,
          }}
          lignes={(proformaToPrint.lignes || []).map((l: any) => ({
            nomProduit: l.nomProduit,
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaire),
            sousTotal: Number(l.sousTotal),
          }))}
          onPrintRecorded={({ printCount }) =>
            setProformaToPrint((current: any) => current ? { ...current, printCount } : current)}
          onClose={() => setProformaToPrint(null)}
        />
      )}

      {renderEquivModal()}
      {renderScanModal()}
      {renderShortcutHelp()}
      {renderSaleReview()}
    </motion.div>
  );
};
