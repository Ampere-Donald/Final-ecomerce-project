import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Minus, Trash2, Send, ShoppingCart,
  CheckCircle2, AlertCircle, Sparkles, X, Clock, Receipt,
  User as UserIcon, Phone, ScanBarcode, CameraOff,
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { useNavigate } from 'react-router-dom';
import { bonVenteApi, clientApi, produitApi, ticketApi, equivalenceApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

interface Produit {
  id: string;
  nomProduit: string;
  marque?: string;
  prixDetail?: number;
  prixPromo?: number;
  quantiteStock: number;
  imageUrl?: string | null;
}

interface Client {
  id: string;
  nom: string;
  prenom?: string | null;
}

interface PanierLigne {
  produitId: string;
  nomProduit: string;
  prix: number;
  quantite: number;
  stockDispo: number;
}

interface Bon {
  id: string;
  numeroTicket: string;
  statut: 'EN_ATTENTE' | 'ENCAISSE' | 'EXPIRE' | 'ANNULE';
  createdAt: string;
  montantTotal: number | string;
  lignes: Array<{ id: string; nomProduit: string; quantite: number; sousTotal: number | string }>;
}

const fmtFCFA = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(n).replace(/ |\s/g, ' ') + ' FCFA';

const resolveImgUrl = (raw?: string | null): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');
  return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

const METHODES = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'CREDIT', label: 'Crédit client' },
];

export const POSVendeur = () => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const isVendeur = admin?.role === 'VENDEUR';

  // ── Catalogue (commun) ─────────────────────────────────────────────────
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [panier, setPanier] = useState<PanierLigne[]>([]);
  const [panierMobileOpen, setPanierMobileOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Admin : client texte libre ─────────────────────────────────────────
  const [nomClient, setNomClient] = useState('');
  const [telephoneClient, setTelephoneClient] = useState('');

  // ── Vendeur : client dropdown + paiement + bons en attente ────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ESPECES');
  const [bonsEnAttente, setBonsEnAttente] = useState<Bon[]>([]);
  const [monScore, setMonScore] = useState(0);
  const [activeTab, setActiveTab] = useState<'vente' | 'enAttente'>('vente');

  // ── Scan caméra code-barres ────────────────────────────────────────────
  const [scanOpen, setScanOpen]   = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanVideoRef  = useRef<HTMLVideoElement>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);
  const scanReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanActiveRef = useRef(false);

  // ── Équivalents IA (commun) ─────────────────────────────────────────────
  const [equivOpen, setEquivOpen] = useState(false);
  const [equivQuery, setEquivQuery] = useState('');
  const [equivProduitId, setEquivProduitId] = useState<string | null>(null);
  const [equivLoading, setEquivLoading] = useState(false);
  const [equivError, setEquivError] = useState<string | null>(null);
  const [equivResults, setEquivResults] = useState<any[]>([]);

  // ── Chargement ─────────────────────────────────────────────────────────
  const loadBons = async () => {
    try {
      const [bonsData, scoreData] = await Promise.all([
        bonVenteApi.mesBons(),
        bonVenteApi.monScore(),
      ]);
      setBonsEnAttente((bonsData || []).filter((b: Bon) => b.statut === 'EN_ATTENTE'));
      setMonScore(Number(scoreData?.nombreTickets || 0));
    } catch {}
  };

  useEffect(() => {
    let mounted = true;
    produitApi.getAll()
      .then((data: any[]) => { if (mounted) setProduits(data || []); })
      .catch(() => setError('Impossible de charger les produits.'))
      .finally(() => setLoading(false));

    if (isVendeur) {
      clientApi.getAll().then((data: any[]) => { if (mounted) setClients(data || []); }).catch(() => {});
      loadBons();
    }
    return () => { mounted = false; };
  }, [isVendeur]);

  // ── Catalogue ──────────────────────────────────────────────────────────
  const produitsFiltres = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return produits.slice(0, 60);
    return produits.filter(p =>
      p.nomProduit.toLowerCase().includes(q) || (p.marque || '').toLowerCase().includes(q)
    ).slice(0, 60);
  }, [produits, search]);

  const ajouterAuPanier = (p: Produit) => {
    if (p.quantiteStock <= 0) return;
    setPanier(prev => {
      const ex = prev.find(l => l.produitId === p.id);
      const prix = p.prixPromo ?? p.prixDetail ?? 0;
      if (ex) {
        if (ex.quantite >= p.quantiteStock) return prev;
        return prev.map(l => l.produitId === p.id ? { ...l, quantite: l.quantite + 1 } : l);
      }
      return [...prev, { produitId: p.id, nomProduit: p.nomProduit, prix, quantite: 1, stockDispo: p.quantiteStock }];
    });
  };

  const changerQuantite = (produitId: string, delta: number) => {
    setPanier(prev => prev
      .map(l => l.produitId === produitId
        ? { ...l, quantite: Math.max(0, Math.min(l.stockDispo, l.quantite + delta)) }
        : l)
      .filter(l => l.quantite > 0)
    );
  };

  const retirerLigne = (produitId: string) => setPanier(prev => prev.filter(l => l.produitId !== produitId));

  const total = useMemo(() => panier.reduce((acc, l) => acc + l.prix * l.quantite, 0), [panier]);

  // ── Envoi ADMIN (ancien flux ticketApi) ───────────────────────────────
  const envoyerAdmin = async () => {
    if (!panier.length) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const ticket = await ticketApi.create({
        nomClient: nomClient.trim() || undefined,
        telephoneClient: telephoneClient.trim() || undefined,
        lignes: panier.map(l => ({ produitId: l.produitId, quantite: l.quantite })),
      });
      setSuccess(`Ticket ${ticket.numeroTicket} envoyé au caissier.`);
      setPanier([]);
      setNomClient('');
      setTelephoneClient('');
      setTimeout(() => navigate('/mes-tickets'), 1200);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erreur inconnue';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Envoi VENDEUR (nouveau flux bonVenteApi) ───────────────────────────
  const envoyerVendeur = async () => {
    if (!panier.length) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await bonVenteApi.create({
        clientId: selectedClientId || undefined,
        methodePaiement: paymentMethod,
        lignes: panier.map(l => ({ produitId: l.produitId, quantite: l.quantite, prixUnitaire: l.prix })),
      });
      setSuccess('Bon envoyé à la caissière.');
      setPanier([]);
      setSelectedClientId('');
      setPaymentMethod('ESPECES');
      setPanierMobileOpen(false);
      await loadBons();
      setActiveTab('enAttente');
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
    prixDetail: s.prixDetail, prixPromo: s.prixPromo, quantiteStock: s.quantiteStock, imageUrl: s.imageUrl,
  });

  // ── Scan caméra ────────────────────────────────────────────────────────
  const stopScan = useCallback(() => {
    scanActiveRef.current = false;
    scanStreamRef.current?.getTracks().forEach(t => t.stop());
    scanStreamRef.current = null;
    if (scanVideoRef.current) scanVideoRef.current.srcObject = null;
  }, []);

  const handleBarcode = useCallback(async (raw: string) => {
    stopScan();
    setScanOpen(false);
    // Parser : code_famille/code
    let codeFamille = '', code = '';
    for (const sep of ['/', '-', '|']) {
      const idx = raw.indexOf(sep);
      if (idx > 0 && idx < raw.length - 1) {
        codeFamille = raw.slice(0, idx);
        code = raw.slice(idx + 1);
        break;
      }
    }
    if (!codeFamille || !code) {
      setError(`Format de code-barres non reconnu : "${raw}". Attendu : code_famille/code`);
      return;
    }
    try {
      const p: any = await produitApi.findByCode(codeFamille, code);
      ajouterAuPanier(p as Produit);
      setSuccess(`"${p.nomProduit}" ajouté au panier.`);
      setTimeout(() => setSuccess(null), 2500);
    } catch {
      setError(`Produit introuvable : famille ${codeFamille} / code ${code}`);
    }
  }, [stopScan]); // eslint-disable-line react-hooks/exhaustive-deps

  const startScan = useCallback(async () => {
    setScanError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      scanStreamRef.current = stream;
      if (scanVideoRef.current) {
        scanVideoRef.current.srcObject = stream;
        await scanVideoRef.current.play();
      }
      if (!scanReaderRef.current) scanReaderRef.current = new BrowserMultiFormatReader();
      scanActiveRef.current = true;
      scanReaderRef.current.decodeFromVideoDevice(
        undefined,
        scanVideoRef.current!,
        (result, err) => {
          if (!scanActiveRef.current) return;
          if (result) handleBarcode(result.getText());
          else if (err && !(err instanceof NotFoundException)) console.warn('[scan]', err);
        },
      );
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('denied') || msg.includes('NotAllowed') || msg.includes('Permission')) {
        setScanError("Permission caméra refusée. Autorisez l'accès dans votre navigateur.");
      } else if (msg.includes('NotFound')) {
        setScanError('Aucune caméra détectée sur cet appareil.');
      } else {
        setScanError("Impossible d'ouvrir la caméra.");
      }
      setScanOpen(false);
    }
  }, [handleBarcode]);

  useEffect(() => {
    if (scanOpen) startScan();
    else stopScan();
    return () => stopScan();
  }, [scanOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rendu carte produit (commun) ───────────────────────────────────────
  const renderProduit = (p: Produit) => {
    const prix = p.prixPromo ?? p.prixDetail ?? 0;
    const enRupture = p.quantiteStock <= 0;
    const img = resolveImgUrl(p.imageUrl);
    const contenu = (
      <>
        <div className="w-full aspect-square bg-slate-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
          {img ? <img src={img} alt={p.nomProduit} className="w-full h-full object-cover" />
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
        <button onClick={() => ouvrirEquiv({ query: p.nomProduit, produitId: p.id })}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg hover:bg-violet-100">
          <Sparkles size={13} /> Équivalent (IA)
        </button>
      </div>
    );
    return (
      <button key={p.id} onClick={() => ajouterAuPanier(p)}
        className="group bg-white rounded-xl border border-slate-200 p-3 text-left transition-all hover:border-primary/40 hover:shadow-md">
        {contenu}
      </button>
    );
  };

  // ── Panier ADMIN (ancien design) ───────────────────────────────────────
  const renderPanierAdmin = (onEnvoyer?: () => void) => (
    <>
      <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
        <ShoppingCart size={20} className="text-primary" /> Panier ({panier.length})
      </h3>
      {panier.length === 0
        ? <p className="text-sm text-slate-400 text-center py-8">Aucun produit sélectionné.</p>
        : <ul className="space-y-3 max-h-64 overflow-y-auto">
          {panier.map(l => (
            <li key={l.produitId} className="flex items-center gap-2 pb-3 border-b border-slate-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{l.nomProduit}</p>
                <p className="text-xs text-slate-500">{fmtFCFA(l.prix)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => changerQuantite(l.produitId, -1)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Minus size={14} /></button>
                <span className="w-6 text-center text-sm font-semibold">{l.quantite}</span>
                <button onClick={() => changerQuantite(l.produitId, 1)} disabled={l.quantite >= l.stockDispo} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><Plus size={14} /></button>
              </div>
              <button onClick={() => retirerLigne(l.produitId)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
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
            <li key={l.produitId} className="flex items-center gap-2 pb-3 border-b border-slate-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{l.nomProduit}</p>
                <p className="text-xs text-slate-500">{fmtFCFA(l.prix)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => changerQuantite(l.produitId, -1)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Minus size={14} /></button>
                <span className="w-6 text-center text-sm font-semibold">{l.quantite}</span>
                <button onClick={() => changerQuantite(l.produitId, 1)} disabled={l.quantite >= l.stockDispo} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><Plus size={14} /></button>
              </div>
              <button onClick={() => retirerLigne(l.produitId)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-bold text-primary">{fmtFCFA(total)}</span>
        </div>
        <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary">
          <option value="">Client comptoir</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''}</option>)}
        </select>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary">
          {METHODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={onEnvoyer ?? envoyerVendeur} disabled={!panier.length || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-opacity-90 disabled:opacity-50">
          <Send size={18} />{submitting ? 'Envoi…' : 'Envoyer à la caissière'}
        </button>
      </div>
    </>
  );

  // ── Modal scan caméra ─────────────────────────────────────────────────
  const renderScanModal = () => (
    <AnimatePresence>
      {scanOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 gap-4"
          onClick={() => setScanOpen(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-black rounded-2xl overflow-hidden relative w-full max-w-sm shadow-2xl">
            <video ref={scanVideoRef} className="w-full aspect-video object-cover" muted playsInline />
            {/* Viseur */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-28 border border-white/30 rounded-xl relative">
                <span className="absolute -top-px -left-px w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <span className="absolute -top-px -right-px w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <span className="absolute -bottom-px -left-px w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <span className="absolute -bottom-px -right-px w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-lg" />
                <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 h-0.5 bg-primary/70 animate-pulse" />
              </div>
            </div>
            {/* Fermer */}
            <button onClick={() => setScanOpen(false)}
              className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-xl hover:bg-black/70">
              <CameraOff size={18} />
            </button>
            <p className="absolute bottom-3 left-0 right-0 text-center text-white/60 text-xs">
              Placez le code-barres dans le cadre
            </p>
          </motion.div>
          {scanError && (
            <p className="text-red-300 text-sm bg-red-900/50 px-4 py-2 rounded-xl border border-red-500/30">
              {scanError}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Catalogue commun ───────────────────────────────────────────────────
  const renderCatalogue = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit ou une marque…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
        </div>
        <button
          onClick={() => { setScanError(null); setScanOpen(true); }}
          title="Scanner un code-barres"
          className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-primary/40 hover:text-primary transition-colors shrink-0"
        >
          <ScanBarcode size={18} />
          <span className="hidden sm:inline text-sm font-medium">Scanner</span>
        </button>
      </div>
      {loading ? <div className="text-center text-slate-400 py-12">Chargement…</div>
        : produitsFiltres.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-slate-400">Aucun produit trouvé.</p>
            {search.trim().length >= 2 && (
              <button onClick={() => ouvrirEquiv({ query: search })}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-600/20 hover:bg-violet-700">
                <Sparkles size={16} /> Chercher un équivalent (IA)
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    const prix = s.prixPromo ?? s.prixDetail ?? 0;
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

  // ══════════════════════════════════════════════════════════════════════
  // RENDU ADMIN/SUPER_ADMIN — ancien design simple
  // ══════════════════════════════════════════════════════════════════════
  if (!isVendeur) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className={`space-y-6 ${panier.length > 0 ? 'pb-24 lg:pb-0' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vente en cours</h2>
            <p className="text-slate-500 text-sm">Sélectionnez les produits, puis envoyez le ticket au caissier.</p>
          </div>
        </div>

        {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200"><AlertCircle size={16} /><span className="text-sm">{error}</span></div>}
        {success && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={16} /><span className="text-sm">{success}</span></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{renderCatalogue()}</div>

          {/* Panier desktop admin */}
          <div className="hidden lg:block space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
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
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3">
            <button onClick={() => setPanierMobileOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-primary text-white font-bold rounded-xl">
              <span className="flex items-center gap-2"><ShoppingCart size={18} />{panier.length} article{panier.length > 1 ? 's' : ''}</span>
              <span>{fmtFCFA(total)}</span>
            </button>
          </div>
        )}

        {/* Drawer mobile admin */}
        <AnimatePresence>
          {panierMobileOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setPanierMobileOpen(false)}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
                onClick={e => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><ShoppingCart size={20} className="text-primary" />Panier ({panier.length})</h3>
                  <button onClick={() => setPanierMobileOpen(false)} className="p-1 text-slate-400"><X size={20} /></button>
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
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDU VENDEUR — nouveau design avec tabs, score, dropdown, primes
  // ══════════════════════════════════════════════════════════════════════
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${panier.length > 0 && activeTab === 'vente' ? 'pb-24 lg:pb-0' : ''}`}>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vente en cours</h2>
          <p className="text-slate-500 text-sm">Vendeur : {admin?.nom}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
          Score ce mois : {monScore} ticket{monScore > 1 ? 's' : ''}
        </div>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200"><AlertCircle size={16} /><span className="text-sm">{error}</span></div>}
      {success && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={16} /><span className="text-sm">{success}</span></div>}

      {/* Onglets */}
      <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
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
      </div>

      {activeTab === 'vente' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{renderCatalogue()}</div>
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary" /> Panier ({panier.length})
              </h3>
              {renderPanierVendeur()}
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Barre mobile vendeur */}
      {activeTab === 'vente' && panier.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3">
          <button onClick={() => setPanierMobileOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-primary text-white font-bold rounded-xl">
            <span className="flex items-center gap-2"><ShoppingCart size={18} />{panier.length} article{panier.length > 1 ? 's' : ''}</span>
            <span>{fmtFCFA(total)}</span>
          </button>
        </div>
      )}

      {/* Drawer mobile vendeur */}
      <AnimatePresence>
        {panierMobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setPanierMobileOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><ShoppingCart size={20} className="text-primary" />Panier ({panier.length})</h3>
                <button onClick={() => setPanierMobileOpen(false)} className="p-1 text-slate-400"><X size={20} /></button>
              </div>
              <div className="p-5">{renderPanierVendeur(() => { setPanierMobileOpen(false); envoyerVendeur(); })}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderEquivModal()}
      {renderScanModal()}
    </motion.div>
  );
};
