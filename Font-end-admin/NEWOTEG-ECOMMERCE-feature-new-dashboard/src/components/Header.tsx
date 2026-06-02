import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, X, Check, CheckCheck, ShoppingCart, Package, Tags, TrendingUp, TrendingDown, AlertCircle, Menu, Loader2, UserCog, Factory, Wallet, Activity } from 'lucide-react';
import { notificationApi, searchApi, produitApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

interface HeaderProps {
  onMenuClick: () => void;
}

/* ── Type map for notification icons ────────────────────────────── */
const NOTIF_ICON: Record<string, React.ReactNode> = {
  COMMANDE_CREEE:      <ShoppingCart size={16} className="text-blue-500" />,
  COMMANDE_STATUT:     <ShoppingCart size={16} className="text-indigo-500" />,
  PRODUIT_CREE:        <Package size={16} className="text-emerald-500" />,
  PRODUIT_MAJ:         <Package size={16} className="text-amber-500" />,
  PRODUIT_SUPPRIME:    <Package size={16} className="text-red-500" />,
  STOCK_CHANGE:        <AlertCircle size={16} className="text-red-500" />,
  CATEGORIE_CREEE:     <Tags size={16} className="text-violet-500" />,
  CATEGORIE_MAJ:       <Tags size={16} className="text-violet-400" />,
  CATEGORIE_SUPPRIMEE: <Tags size={16} className="text-red-400" />,
  VENTE_CREEE:         <TrendingUp size={16} className="text-emerald-600" />,
  VENTE_MAJ:           <TrendingUp size={16} className="text-amber-500" />,
  ACHAT_CREE:          <TrendingDown size={16} className="text-orange-500" />,
  ACHAT_MAJ:           <TrendingDown size={16} className="text-amber-500" />,
  ACHAT_SUPPRIME:      <TrendingDown size={16} className="text-red-500" />,
  COMPTE_CREE:         <UserCog size={16} className="text-violet-600" />,
  COMPTE_MAJ:          <UserCog size={16} className="text-blue-500" />,
  COMPTE_SUPPRIME:     <UserCog size={16} className="text-red-500" />,
  FOURNISSEUR_CREE:    <Factory size={16} className="text-blue-500" />,
  FOURNISSEUR_MAJ:     <Factory size={16} className="text-amber-500" />,
  FOURNISSEUR_SUPPRIME:<Factory size={16} className="text-red-500" />,
  CAISSE_CREEE:        <Wallet size={16} className="text-emerald-500" />,
  CAISSE_MAJ:          <Wallet size={16} className="text-amber-500" />,
  CAISSE_SUPPRIMEE:    <Wallet size={16} className="text-red-500" />,
  MOUVEMENT_STOCK_CREE:<Activity size={16} className="text-blue-500" />,
};

/* ── Route map for search results ───────────────────────────────── */
const SECTION_META: Record<string, { label: string; route: string }> = {
  commandes:     { label: 'Commandes', route: '/orders' },
  produits:      { label: 'Produits', route: '/produits' },
  categories:    { label: 'Catégories', route: '/categories' },
  clients:       { label: 'Clients', route: '/clients' },
  fournisseurs:  { label: 'Fournisseurs', route: '/fournisseurs' },
};

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();

  /* ── Import Status ────────────────────────────────────────────── */
  const [importStatus, setImportStatus] = useState<{ isImporting: boolean; progress: number; message: string; error: string | null } | null>(null);

  /* ── Notifications state ──────────────────────────────────────── */
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    try { const { count } = await notificationApi.unreadCount(); setUnread(count); } catch {}
  }, []);

  const fetchNotifs = useCallback(async () => {
    try { const data = await notificationApi.getAll(); setNotifs(data); } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);

    // Fetch import status more aggressively if needed
    const fetchImportStatus = async () => {
      try {
        const s = await produitApi.getImportStatus();
        setImportStatus(s);
        // Si l'import vient de se terminer (passage à 100%), on relance les notifs pour chopper l'alerte !
        if (s && !s.isImporting && s.progress === 100 && (importStatus?.isImporting)) {
          fetchUnread();
        }
      } catch {}
    };
    fetchImportStatus();
    const ivImport = setInterval(fetchImportStatus, 2500);

    return () => {
      clearInterval(iv);
      clearInterval(ivImport);
    };
  }, [fetchUnread, importStatus?.isImporting]);

  const openBell = async () => {
    setBellOpen(prev => !prev);
    if (!bellOpen) await fetchNotifs();
  };

  const markRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationApi.markAllAsRead();
    setNotifs(prev => prev.map(n => ({ ...n, lue: true })));
    setUnread(0);
  };

  /* ── Search state ─────────────────────────────────────────────── */
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (query.trim().length < 2) { setResults({}); setSearchOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchApi.search(query.trim());
        setResults(data);
        setSearchOpen(true);
      } catch {}
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  /* Close dropdowns on click outside */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const totalResults = (Object.values(results) as any[][]).reduce((s, arr) => s + (arr?.length ?? 0), 0);

  const getDisplayName = (section: string, item: any): string => {
    if (section === 'commandes') return `${item.numeroSuivi} — ${item.nomClient}`;
    if (section === 'produits') return `${item.marque} ${item.nomProduit}`;
    if (section === 'categories') return item.nom;
    if (section === 'clients') return `${item.nom} ${item.prenom ?? ''}`.trim();
    if (section === 'fournisseurs') return item.nomEntreprise;
    return item.id;
  };

  return (
    <div className="flex flex-col sticky top-0 z-50 w-full shrink-0">
      {importStatus?.isImporting && (
        <div className="bg-blue-50 border-b border-blue-100 flex flex-col justify-center px-4 py-1.5 shrink-0 z-20">
           <div className="flex items-center justify-between text-xs text-blue-800 font-bold mb-1 w-full">
             <span className="flex items-center gap-2">
               <Loader2 size={12} className={`shrink-0 ${importStatus.error ? 'text-red-500' : 'animate-spin'}`} />
               <span className={`truncate ${importStatus.error ? 'text-red-600 font-bold' : ''}`}>
                 {importStatus.error ? `ERREUR : ${importStatus.error}` : (importStatus.message || 'Importation en cours...')}
               </span>
             </span>
             <span className="shrink-0">{importStatus.progress}%</span>
           </div>
           <div className={`w-full h-1.5 rounded-full overflow-hidden ${importStatus.error ? 'bg-red-100' : 'bg-blue-200/50'}`}>
             <div className={`h-full transition-all duration-500 ease-out relative overflow-hidden ${importStatus.error ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${importStatus.error ? 100 : importStatus.progress}%` }}>
                {!importStatus.error && <div className="absolute inset-0 bg-white/20 animate-[pulse_1s_ease-in-out_infinite]"></div>}
             </div>
           </div>
        </div>
      )}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 gap-2 shrink-0">
      {/* ── Hamburger (mobile only) ───────────────────────────────── */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
        aria-label="Menu"
      >
        <Menu size={22} />
      </button>

      {/* ── Search ───────────────────────────────────────────────── */}
      <div ref={searchRef} className="flex items-center gap-4 flex-1 max-w-xl relative">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-sm transition-all outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
            {totalResults === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Aucun résultat pour « {query} »</p>
            ) : (
              (Object.entries(results) as [string, any[]][]).map(([section, items]) => {
                if (!items?.length) return null;
                const meta = SECTION_META[section];
                if (!meta) return null;
                return (
                  <div key={section}>
                    <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50">{meta.label}</p>
                    {items.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => { navigate(meta.route); setSearchOpen(false); setQuery(''); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-primary/5 hover:text-primary transition-colors border-b border-slate-50 last:border-b-0"
                      >
                        {getDisplayName(section, item)}
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Bell ─────────────────────────────────────────────────── */}
      <div ref={bellRef} className="relative flex items-center">
        <button onClick={openBell} className="p-2 text-slate-400 hover:text-primary relative transition-colors">
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] max-w-[380px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  <CheckCheck size={14} /> Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifs.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">Aucune notification.</p>
              ) : (
                notifs.map((n: any) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-slate-50 ${n.lue ? 'opacity-60' : 'bg-primary/[0.03]'}`}
                    onClick={() => !n.lue && markRead(n.id)}
                  >
                    <div className="mt-0.5 shrink-0 size-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      {NOTIF_ICON[n.type] ?? <Bell size={16} className="text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.lue ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>{n.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-slate-400">{relativeTime(n.createdAt)}</p>
                        {n.actorName && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {n.actorName} ({n.actorRole})
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.lue && (
                      <button onClick={e => { e.stopPropagation(); markRead(n.id); }} className="mt-1 shrink-0 text-slate-400 hover:text-primary">
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            {can.accessNotificationsPage(admin?.role) && (
              <button
                onClick={() => { setBellOpen(false); navigate('/notifications'); }}
                className="w-full px-4 py-2.5 text-center text-xs font-bold text-primary hover:bg-primary/5 border-t border-slate-100 transition-colors"
              >
                Voir tout l'historique
              </button>
            )}
          </div>
        )}
      </div>
    </header>
    </div>
  );
};
