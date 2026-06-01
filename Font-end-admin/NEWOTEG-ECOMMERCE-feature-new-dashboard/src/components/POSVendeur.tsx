import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  Phone,
  Sparkles,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { produitApi, ticketApi, equivalenceApi } from '../services/api';

interface Produit {
  id: string;
  nomProduit: string;
  marque?: string;
  prixDetail?: number;
  prixPromo?: number;
  quantiteStock: number;
  imageUrl?: string | null;
}

interface PanierLigne {
  produitId: string;
  nomProduit: string;
  prix: number;
  quantite: number;
  stockDispo: number;
}

const fmtFCFA = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(n)
    .replace(/ |\s/g, ' ') + ' FCFA';

const resolveImgUrl = (raw?: string | null): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');
  return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

export const POSVendeur = () => {
  const navigate = useNavigate();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [panier, setPanier] = useState<PanierLigne[]>([]);
  const [nomClient, setNomClient] = useState('');
  const [telephoneClient, setTelephoneClient] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [panierMobileOpen, setPanierMobileOpen] = useState(false);

  // Équivalents IA
  const [equivOpen, setEquivOpen] = useState(false);
  const [equivQuery, setEquivQuery] = useState('');
  const [equivProduitId, setEquivProduitId] = useState<string | null>(null);
  const [equivLoading, setEquivLoading] = useState(false);
  const [equivError, setEquivError] = useState<string | null>(null);
  const [equivResults, setEquivResults] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    produitApi
      .getAll()
      .then((data: any[]) => {
        if (mounted) setProduits(data || []);
      })
      .catch(() => setError('Impossible de charger les produits.'))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const produitsFiltres = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return produits.slice(0, 60);
    return produits
      .filter(
        (p) =>
          p.nomProduit.toLowerCase().includes(q) ||
          (p.marque || '').toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [produits, search]);

  const ajouterAuPanier = (p: Produit) => {
    if (p.quantiteStock <= 0) return;
    setPanier((prev) => {
      const existante = prev.find((l) => l.produitId === p.id);
      const prix = p.prixPromo ?? p.prixDetail ?? 0;
      if (existante) {
        if (existante.quantite >= p.quantiteStock) return prev;
        return prev.map((l) =>
          l.produitId === p.id ? { ...l, quantite: l.quantite + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          produitId: p.id,
          nomProduit: p.nomProduit,
          prix,
          quantite: 1,
          stockDispo: p.quantiteStock,
        },
      ];
    });
  };

  const changerQuantite = (produitId: string, delta: number) => {
    setPanier((prev) =>
      prev
        .map((l) =>
          l.produitId === produitId
            ? { ...l, quantite: Math.max(0, Math.min(l.stockDispo, l.quantite + delta)) }
            : l,
        )
        .filter((l) => l.quantite > 0),
    );
  };

  const retirerLigne = (produitId: string) => {
    setPanier((prev) => prev.filter((l) => l.produitId !== produitId));
  };

  const total = useMemo(
    () => panier.reduce((acc, l) => acc + l.prix * l.quantite, 0),
    [panier],
  );

  const ouvrirEquivalents = async (opts: { query?: string; produitId?: string }) => {
    setEquivOpen(true);
    setEquivQuery(opts.query ?? '');
    setEquivProduitId(opts.produitId ?? null);
    await lancerRechercheEquivalents(opts);
  };

  const lancerRechercheEquivalents = async (opts: { query?: string; produitId?: string }) => {
    setEquivLoading(true);
    setEquivError(null);
    setEquivResults([]);
    try {
      const res = await equivalenceApi.suggest({
        query: opts.query?.trim() || undefined,
        produitId: opts.produitId || undefined,
        source: 'pos',
      });
      setEquivResults(res?.suggestions || []);
      if ((res?.suggestions || []).length === 0) {
        setEquivError(res?.message || 'Aucun équivalent trouvé pour cette recherche.');
      }
    } catch (e: any) {
      setEquivError(e?.response?.data?.message || 'Service IA momentanément indisponible. Réessayez dans un instant.');
    } finally {
      setEquivLoading(false);
    }
  };

  const ajouterSuggestion = (s: any) => {
    ajouterAuPanier({
      id: s.produitId,
      nomProduit: s.nomProduit,
      marque: s.marque,
      prixDetail: s.prixDetail,
      prixPromo: s.prixPromo,
      quantiteStock: s.quantiteStock,
      imageUrl: s.imageUrl,
    });
  };

  const envoyerAuCaissier = async () => {
    if (panier.length === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const ticket = await ticketApi.create({
        nomClient: nomClient.trim() || undefined,
        telephoneClient: telephoneClient.trim() || undefined,
        lignes: panier.map((l) => ({ produitId: l.produitId, quantite: l.quantite })),
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${panier.length > 0 ? 'pb-24 lg:pb-0' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vente en cours</h2>
          <p className="text-slate-500 text-sm">
            Sélectionnez les produits, puis envoyez le ticket au caissier.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={16} />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catalogue produits */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit ou une marque…"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <button
              onClick={() => ouvrirEquivalents({ query: search.trim() || undefined })}
              className="flex items-center gap-2 px-4 py-3 bg-violet-600 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-600/20 hover:bg-violet-700 whitespace-nowrap shrink-0"
              title="Chercher un produit équivalent via l'IA"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Équivalent IA</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center text-slate-400 py-12">Chargement…</div>
          ) : produitsFiltres.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-slate-400">Aucun produit trouvé.</p>
              {search.trim().length >= 2 && (
                <button
                  onClick={() => ouvrirEquivalents({ query: search })}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl shadow-md shadow-violet-600/20 hover:bg-violet-700"
                >
                  <Sparkles size={16} />
                  Chercher un équivalent (IA)
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {produitsFiltres.map((p) => {
                const prix = p.prixPromo ?? p.prixDetail ?? 0;
                const enRupture = p.quantiteStock <= 0;
                const img = resolveImgUrl(p.imageUrl);
                const contenu = (
                  <>
                    <div className="w-full aspect-square bg-slate-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                      {img ? (
                        <img
                          src={img}
                          alt={p.nomProduit}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingCart size={24} className="text-slate-300" />
                      )}
                    </div>
                    <p className="font-semibold text-sm text-slate-900 line-clamp-2">
                      {p.nomProduit}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {p.marque || ''}
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">
                      {fmtFCFA(prix)}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        enRupture ? 'text-red-500' : 'text-slate-400'
                      }`}
                    >
                      {enRupture ? 'Rupture' : `Stock : ${p.quantiteStock}`}
                    </p>
                  </>
                );

                if (enRupture) {
                  return (
                    <div
                      key={p.id}
                      className="group bg-white rounded-xl border border-slate-200 p-3 text-left"
                    >
                      <div className="opacity-50">{contenu}</div>
                      <button
                        onClick={() => ouvrirEquivalents({ query: p.nomProduit, produitId: p.id })}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg hover:bg-violet-100"
                      >
                        <Sparkles size={13} />
                        Équivalent (IA)
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={p.id}
                    onClick={() => ajouterAuPanier(p)}
                    className="group bg-white rounded-xl border border-slate-200 p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    {contenu}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Panier (desktop seulement — mobile via barre fixe + drawer) */}
        <div className="hidden lg:block space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary" />
              Panier ({panier.length})
            </h3>

            {panier.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Aucun produit sélectionné.
              </p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto">
                {panier.map((l) => (
                  <li
                    key={l.produitId}
                    className="flex items-center gap-2 pb-3 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {l.nomProduit}
                      </p>
                      <p className="text-xs text-slate-500">{fmtFCFA(l.prix)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => changerQuantite(l.produitId, -1)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {l.quantite}
                      </span>
                      <button
                        onClick={() => changerQuantite(l.produitId, 1)}
                        disabled={l.quantite >= l.stockDispo}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => retirerLigne(l.produitId)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-bold text-primary">
                  {fmtFCFA(total)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              Client (optionnel)
            </h3>
            <div className="relative">
              <UserIcon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={nomClient}
                onChange={(e) => setNomClient(e.target.value)}
                placeholder="Nom du client"
                maxLength={150}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="tel"
                value={telephoneClient}
                onChange={(e) => setTelephoneClient(e.target.value)}
                placeholder="Téléphone"
                maxLength={30}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <button
            onClick={envoyerAuCaissier}
            disabled={panier.length === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            <span>{submitting ? 'Envoi…' : 'Envoyer au caissier'}</span>
          </button>
        </div>
      </div>

      {/* ═══ Barre panier fixe mobile ═══════════════════════════════ */}
      {panier.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3">
          <button
            onClick={() => setPanierMobileOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-primary text-white font-bold rounded-xl"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={18} />
              {panier.length} article{panier.length > 1 ? 's' : ''}
            </span>
            <span className="text-lg">{fmtFCFA(total)}</span>
          </button>
        </div>
      )}

      {/* ═══ Drawer panier mobile ═════════════════════════════════ */}
      {panierMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setPanierMobileOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary" />
                Panier ({panier.length})
              </h3>
              <button onClick={() => setPanierMobileOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {panier.map((l) => (
                <div key={l.produitId} className="flex items-center gap-2 pb-3 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{l.nomProduit}</p>
                    <p className="text-xs text-slate-500">{fmtFCFA(l.prix)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changerQuantite(l.produitId, -1)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{l.quantite}</span>
                    <button onClick={() => changerQuantite(l.produitId, 1)} disabled={l.quantite >= l.stockDispo} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button onClick={() => retirerLigne(l.produitId)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-bold text-primary">{fmtFCFA(total)}</span>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={nomClient} onChange={(e) => setNomClient(e.target.value)} placeholder="Nom du client (optionnel)" maxLength={150}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={telephoneClient} onChange={(e) => setTelephoneClient(e.target.value)} placeholder="Téléphone (optionnel)" maxLength={30}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <button
                onClick={() => { setPanierMobileOpen(false); envoyerAuCaissier(); }}
                disabled={panier.length === 0 || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-opacity-90 disabled:opacity-50"
              >
                <Send size={18} />
                {submitting ? 'Envoi…' : 'Envoyer au caissier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal équivalents IA ═══════════════════════════════════ */}
      {equivOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setEquivOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-600" />
                Équivalents suggérés
              </h3>
              <button onClick={() => setEquivOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 border-b border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={equivQuery}
                  onChange={(e) => setEquivQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      lancerRechercheEquivalents({ query: equivQuery, produitId: equivProduitId || undefined });
                  }}
                  placeholder="Ex. condensateur 12µF 450V"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none"
                />
                <button
                  onClick={() => lancerRechercheEquivalents({ query: equivQuery, produitId: equivProduitId || undefined })}
                  disabled={equivLoading}
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {equivLoading ? '…' : 'Chercher'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Suggestions assistées par IA — à valider par le vendeur avant proposition au client.
              </p>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {equivLoading ? (
                <div className="text-center text-slate-400 py-8">Recherche en cours…</div>
              ) : equivError ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-sm">
                  <AlertCircle size={16} />
                  {equivError}
                </div>
              ) : (
                equivResults.map((s) => {
                  const prix = s.prixPromo ?? s.prixDetail ?? 0;
                  const compatCfg: Record<string, string> = {
                    haute: 'bg-emerald-100 text-emerald-700',
                    moyenne: 'bg-amber-100 text-amber-700',
                    faible: 'bg-red-100 text-red-700',
                  };
                  return (
                    <div key={s.produitId} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900">{s.nomProduit}</p>
                          {s.marque && <p className="text-xs text-slate-500">{s.marque}</p>}
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${compatCfg[s.compatibilite] || compatCfg.moyenne}`}>
                          {s.compatibilite}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">{s.raison}</p>
                      {s.avertissement && (
                        <p className="text-[11px] text-amber-600 mt-1 flex items-start gap-1">
                          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {s.avertissement}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                          <span className="font-bold text-primary">{fmtFCFA(prix)}</span> · Stock : {s.quantiteStock}
                        </div>
                        <button
                          onClick={() => ajouterSuggestion(s)}
                          disabled={s.quantiteStock <= 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                        >
                          <Plus size={13} /> Ajouter
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
