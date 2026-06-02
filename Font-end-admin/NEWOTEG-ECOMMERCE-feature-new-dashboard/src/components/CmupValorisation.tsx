import React, { useEffect, useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cmupApi } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProduitCmup {
  id: string;
  nomProduit: string;
  marque?: string;
  quantiteStock: number;
  cmupActuel: number;
  prixDetail: number;
  prixGros: number;
  dernierCoutAchatFcfa?: number;
  derniereDeviseAchat?: string;
  dernierAchatAt?: string;
  categorie?: { nom: string };
  valeurStock: number;
  margeFcfa: number;
  tauxMarge: number;
  badgeMarge: 'VENTE_A_PERTE' | 'MARGE_FAIBLE' | 'MARGE_SAINE';
  cmupInitialise: boolean;
}

interface MouvementCmup {
  id: string;
  typeMouvement: string;
  devise: string;
  tauxChange: number;
  quantiteEntree: number;
  coutUnitaireFcfa: number;
  stockAvant: number;
  stockApres: number;
  cmupAvant: number;
  cmupApres: number;
  createdAt: string;
  createdById?: string;
  achat?: {
    id: string;
    devise: string;
    tauxChange: number;
    fournisseur?: { nomEntreprise: string };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | string | null | undefined, decimals = 2) =>
  n != null ? Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: decimals }) : '—';

const MargeBadge = ({ badge, taux }: { badge: string; taux: number }) => {
  const map: Record<string, string> = {
    VENTE_A_PERTE: 'bg-red-100 text-red-700',
    MARGE_FAIBLE:  'bg-amber-100 text-amber-700',
    MARGE_SAINE:   'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[badge] ?? 'bg-slate-100 text-slate-600'}`}>
      {badge === 'MARGE_SAINE' && <TrendingUp size={11} />}
      {badge === 'VENTE_A_PERTE' && <TrendingDown size={11} />}
      {badge === 'MARGE_FAIBLE' && <AlertTriangle size={11} />}
      {fmt(taux, 1)} %
    </span>
  );
};

const CmupBadge = ({ initialise }: { initialise: boolean }) =>
  !initialise ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      <AlertTriangle size={10} />non init.
    </span>
  ) : null;

// ─── Composant principal ─────────────────────────────────────────────────────

export const CmupValorisation = () => {
  const [produits, setProduits]         = useState<ProduitCmup[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterMarge, setFilterMarge]   = useState('');
  const [filterDevise, setFilterDevise] = useState('');
  const [sortField, setSortField]       = useState<keyof ProduitCmup>('nomProduit');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('asc');

  // Historique CMUP d'un produit (modal)
  const [histProduit, setHistProduit]   = useState<ProduitCmup | null>(null);
  const [historique, setHistorique]     = useState<MouvementCmup[]>([]);
  const [histLoading, setHistLoading]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await cmupApi.getAll();
        setProduits(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const openHistorique = async (p: ProduitCmup) => {
    setHistProduit(p);
    setHistorique([]);
    setHistLoading(true);
    try {
      const hist = await cmupApi.historique(p.id);
      setHistorique(hist);
    } catch { setHistorique([]); }
    finally { setHistLoading(false); }
  };

  // ─── Filtre + tri ────────────────────────────────────────────────
  const toggleSort = (field: keyof ProduitCmup) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let r = produits;
    if (search.trim()) r = r.filter(p => p.nomProduit.toLowerCase().includes(search.toLowerCase()) || (p.marque ?? '').toLowerCase().includes(search.toLowerCase()));
    if (filterMarge) r = r.filter(p => p.badgeMarge === filterMarge);
    if (filterDevise) r = r.filter(p => p.derniereDeviseAchat === filterDevise);
    return [...r].sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      const na = Number(va);
      const nb = Number(vb);
      const cmp = !isNaN(na) && !isNaN(nb)
        ? na - nb
        : String(va).localeCompare(String(vb), 'fr');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [produits, search, filterMarge, filterDevise, sortField, sortDir]);

  // ─── KPIs ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalValeur = produits.reduce((s, p) => s + Number(p.valeurStock), 0);
    const vente_perte = produits.filter(p => p.badgeMarge === 'VENTE_A_PERTE').length;
    const non_init    = produits.filter(p => !p.cmupInitialise).length;
    return { totalValeur, vente_perte, non_init };
  }, [produits]);

  const SortIcon = ({ field }: { field: keyof ProduitCmup }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} className="inline ml-0.5" /> : <ChevronDown size={12} className="inline ml-0.5" />;
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CMUP & Valorisation du stock</h1>
        <p className="text-sm text-slate-500 mt-1">Coût moyen unitaire pondéré — valeur stock = stock × CMUP</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Valeur stock totale</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(kpis.totalValeur)} FCFA</p>
        </div>
        <div className={`bg-white border rounded-2xl p-5 shadow-sm ${kpis.vente_perte > 0 ? 'border-red-200' : 'border-slate-200'}`}>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ventes à perte</p>
          <p className={`text-2xl font-bold mt-1 ${kpis.vente_perte > 0 ? 'text-red-600' : 'text-slate-900'}`}>{kpis.vente_perte} produit{kpis.vente_perte > 1 ? 's' : ''}</p>
        </div>
        <div className={`bg-white border rounded-2xl p-5 shadow-sm ${kpis.non_init > 0 ? 'border-amber-200' : 'border-slate-200'}`}>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">CMUP non initialisé</p>
          <p className={`text-2xl font-bold mt-1 ${kpis.non_init > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{kpis.non_init} produit{kpis.non_init > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ─── Modal historique ────────────────────────────────────── */}
      <AnimatePresence>
        {histProduit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Historique CMUP — {histProduit.nomProduit}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">CMUP actuel: <strong>{fmt(histProduit.cmupActuel)} FCFA</strong> · Stock: <strong>{histProduit.quantiteStock}</strong></p>
                </div>
                <button onClick={() => setHistProduit(null)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
              </div>
              <div className="p-4 overflow-y-auto">
                {histLoading ? (
                  <p className="text-center text-slate-500 py-8">Chargement…</p>
                ) : historique.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucun mouvement CMUP enregistré.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="bg-slate-50 text-slate-500 font-bold uppercase">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Fournisseur</th>
                        <th className="px-3 py-2">Devise</th>
                        <th className="px-3 py-2 text-center">Entrée</th>
                        <th className="px-3 py-2 text-right">Coût unit. FCFA</th>
                        <th className="px-3 py-2 text-right">CMUP avant</th>
                        <th className="px-3 py-2 text-right">CMUP après</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {historique.map((m, i) => (
                          <tr key={m.id ?? i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-500">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                            <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{m.typeMouvement}</span></td>
                            <td className="px-3 py-2 text-slate-700">{m.achat?.fournisseur?.nomEntreprise ?? '—'}</td>
                            <td className="px-3 py-2 font-mono">{m.devise}{m.devise !== 'FCFA' && <span className="text-slate-400 ml-1">@{fmt(m.tauxChange, 4)}</span>}</td>
                            <td className="px-3 py-2 text-center font-semibold">{m.quantiteEntree}</td>
                            <td className="px-3 py-2 text-right">{fmt(m.coutUnitaireFcfa)}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{fmt(m.cmupAvant)}</td>
                            <td className="px-3 py-2 text-right font-bold text-primary">{fmt(m.cmupApres)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Tableau ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Filtres */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <select value={filterMarge} onChange={e => setFilterMarge(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none">
            <option value="">Toutes les marges</option>
            <option value="VENTE_A_PERTE">Vente à perte</option>
            <option value="MARGE_FAIBLE">Marge faible</option>
            <option value="MARGE_SAINE">Marge saine</option>
          </select>
          <select value={filterDevise} onChange={e => setFilterDevise(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none">
            <option value="">Toutes les devises</option>
            <option value="FCFA">FCFA</option>
            <option value="NGN">NGN</option>
            <option value="CNY">CNY</option>
          </select>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} produit{filtered.length > 1 ? 's' : ''}</span>
        </div>

        {/* Tableau desktop */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                {([
                  ['nomProduit', 'Produit'],
                  ['quantiteStock', 'Stock'],
                  ['cmupActuel', 'CMUP'],
                  ['prixDetail', 'Prix vente'],
                  ['margeFcfa', 'Marge FCFA'],
                  ['tauxMarge', 'Marge %'],
                  ['valeurStock', 'Valeur stock'],
                  ['dernierAchatAt', 'Dernier achat'],
                ] as [keyof ProduitCmup, string][]).map(([field, label]) => (
                  <th key={field} className="px-4 py-3 cursor-pointer select-none hover:text-slate-700 whitespace-nowrap"
                    onClick={() => toggleSort(field)}>
                    {label}<SortIcon field={field} />
                  </th>
                ))}
                <th className="px-4 py-3">Historique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Aucun produit trouvé.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 text-sm">{p.nomProduit}</div>
                    {p.marque && <div className="text-xs text-slate-400">{p.marque}</div>}
                    <div className="flex gap-1 mt-0.5">
                      <CmupBadge initialise={p.cmupInitialise} />
                      {p.derniereDeviseAchat && p.derniereDeviseAchat !== 'FCFA' && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-mono">{p.derniereDeviseAchat}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{p.quantiteStock}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{fmt(p.cmupActuel)} FCFA</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{fmt(p.prixDetail)} FCFA</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${p.margeFcfa < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {fmt(p.margeFcfa)} FCFA
                  </td>
                  <td className="px-4 py-3">
                    <MargeBadge badge={p.badgeMarge} taux={p.tauxMarge} />
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-primary">{fmt(p.valeurStock)} FCFA</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.dernierAchatAt ? new Date(p.dernierAchatAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openHistorique(p)}
                      className="text-xs font-semibold text-primary hover:underline">
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Chargement…</div>
          ) : filtered.map(p => (
            <div key={p.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{p.nomProduit}</p>
                  {p.marque && <p className="text-xs text-slate-400">{p.marque}</p>}
                </div>
                <MargeBadge badge={p.badgeMarge} taux={p.tauxMarge} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Stock: </span><strong>{p.quantiteStock}</strong></div>
                <div><span className="text-slate-400">CMUP: </span><strong>{fmt(p.cmupActuel)} FCFA</strong></div>
                <div><span className="text-slate-400">Valeur: </span><strong className="text-primary">{fmt(p.valeurStock)} FCFA</strong></div>
                <div><span className="text-slate-400">Marge: </span><strong className={p.margeFcfa < 0 ? 'text-red-600' : ''}>{fmt(p.margeFcfa)} FCFA</strong></div>
              </div>
              <button onClick={() => openHistorique(p)} className="text-xs font-semibold text-primary hover:underline">
                Historique CMUP →
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
