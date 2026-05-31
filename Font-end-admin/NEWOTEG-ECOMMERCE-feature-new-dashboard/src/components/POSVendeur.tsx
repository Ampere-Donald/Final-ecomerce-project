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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { produitApi, ticketApi } from '../services/api';

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
      className="space-y-6"
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
          <div className="relative">
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

          {loading ? (
            <div className="text-center text-slate-400 py-12">Chargement…</div>
          ) : produitsFiltres.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              Aucun produit trouvé.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {produitsFiltres.map((p) => {
                const prix = p.prixPromo ?? p.prixDetail ?? 0;
                const enRupture = p.quantiteStock <= 0;
                const img = resolveImgUrl(p.imageUrl);
                return (
                  <button
                    key={p.id}
                    onClick={() => ajouterAuPanier(p)}
                    disabled={enRupture}
                    className={`group bg-white rounded-xl border border-slate-200 p-3 text-left transition-all ${
                      enRupture
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-primary/40 hover:shadow-md'
                    }`}
                  >
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
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Panier */}
        <div className="space-y-4">
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
    </motion.div>
  );
};
