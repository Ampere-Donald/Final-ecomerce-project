import React, { useEffect, useState } from 'react';
import {
  Filter,
  Download,
  TrendingUp,
  BarChart3,
  PackageSearch,
  ArrowUpRight,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Package,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Commande, StatutCommande } from '../types';
import { venteApi, produitApi, commandeApi } from '../services/api';

/* ── Order‑status visual map ────────────────────────────────────── */
const STATUS_CFG: Record<StatutCommande, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  EN_ATTENTE:   { label: 'En attente',   bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500',   icon: <Clock size={18} /> },
  CONFIRMEE:    { label: 'Confirmée',    bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500',    icon: <CheckCircle2 size={18} /> },
  EN_LIVRAISON: { label: 'En livraison', bg: 'bg-indigo-50',   text: 'text-indigo-700',  dot: 'bg-indigo-500',  icon: <Truck size={18} /> },
  LIVREE:       { label: 'Livrée',       bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', icon: <CheckCircle2 size={18} /> },
  ANNULEE:      { label: 'Annulée',      bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500',     icon: <XCircle size={18} /> },
};

const STATUS_ORDER: StatutCommande[] = ['EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE'];

export const Dashboard = () => {
  const [produitsSold, setProduitsSold] = useState(0);
  const [caJour, setCaJour] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<Commande[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<Record<string, number>>({});
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ventesRes, produitsRes, commandesRes] = await Promise.all([
          venteApi.getAll(),
          produitApi.getAll(),
          commandeApi.getAll(),
        ]);

        /* ── Produits vendus (sum of quantite from LigneVente) ──── */
        let totalQty = 0;
        for (const v of ventesRes) {
          for (const lv of (v.lignesVente ?? [])) {
            totalQty += lv.quantite ?? 0;
          }
        }
        setProduitsSold(totalQty);

        /* ── CA du jour ──────────────────────────────────────────── */
        const today = new Date().toDateString();
        const ventesToday = ventesRes.filter((v: any) => new Date(v.dateVente).toDateString() === today);
        const ca = ventesToday.reduce((acc: number, v: any) => acc + parseFloat(v.montantTotal), 0);
        setCaJour(ca);

        /* ── Recent orders (top 5) ───────────────────────────────── */
        setRecentOrders(commandesRes.slice(0, 5));

        /* ── Orders by status breakdown ──────────────────────────── */
        const counts: Record<string, number> = {};
        for (const c of commandesRes) {
          counts[c.statut] = (counts[c.statut] ?? 0) + 1;
        }
        setOrdersByStatus(counts);
        setTotalOrders(commandesRes.length);

        /* ── Stocks ──────────────────────────────────────────────── */
        setTotalProducts(produitsRes.length);
        const units = produitsRes.reduce((sum: number, p: any) => sum + (p.quantiteStock ?? 0), 0);
        setTotalUnits(units);

        // Low stock (≤5 units, top 4)
        const sorted = [...produitsRes].sort((a: any, b: any) => (a.quantiteStock ?? 0) - (b.quantiteStock ?? 0));
        setLowStockItems(sorted.filter((p: any) => (p.quantiteStock ?? 0) <= 5).slice(0, 4).map((p: any) => ({
          name: p.nomProduit,
          count: p.quantiteStock ?? 0,
          status: (p.quantiteStock ?? 0) <= 0 ? 'Rupture' : 'Critique',
        })));
      } catch (error) {
        console.error('Erreur chargement dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* ═══ Top KPI Cards ═════════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Produits vendus */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div>
            <span className="flex items-center text-xs font-bold text-emerald-600"><ArrowUpRight size={14} /> +12%</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Produits Vendus</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : produitsSold.toLocaleString()} unités</p>
        </div>

        {/* CA du jour */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20} /></div>
            <span className="flex items-center text-xs font-bold text-emerald-600"><ArrowUpRight size={14} /> +8%</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Chiffre d'Affaires (CA)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : caJour.toLocaleString()} FCFA</p>
        </div>
      </section>

      {/* ═══ BIG Commandes Status Breakdown Card ═══════════════════ */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ShoppingCart size={20} /></div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Commandes</h3>
              <p className="text-sm text-slate-500">{loading ? '...' : `${totalOrders} commande${totalOrders !== 1 ? 's' : ''} au total`}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {STATUS_ORDER.map(s => {
              const cfg = STATUS_CFG[s];
              const count = ordersByStatus[s] ?? 0;
              return (
                <div key={s} className={`${cfg.bg} rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] transition-transform hover:scale-[1.02]`}>
                  <div className={`${cfg.text} opacity-80`}>{cfg.icon}</div>
                  <p className={`text-2xl font-bold ${cfg.text}`}>{count}</p>
                  <p className={`text-xs font-semibold ${cfg.text} opacity-70`}>{cfg.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ Stocks Inventory Card ═════════════════════════════════ */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><PackageSearch size={20} /></div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Inventaire</h3>
              <p className="text-sm text-slate-500">Stock en temps réel</p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : (
          <div className="space-y-5">
            {/* Primary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2 text-slate-500"><Package size={16} /></div>
                <p className="text-2xl font-bold text-slate-900">{totalProducts}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Produits référencés</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2 text-slate-500"><PackageSearch size={16} /></div>
                <p className="text-2xl font-bold text-slate-900">{totalUnits.toLocaleString()}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Unités disponibles</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2 text-red-400"><XCircle size={16} /></div>
                <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
                <p className="text-xs font-semibold text-red-500 mt-1">Produits en alerte</p>
              </div>
            </div>

            {/* Low-stock details (secondary) */}
            {lowStockItems.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Alertes Stock Bas</p>
                <div className="space-y-2">
                  {lowStockItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{item.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{item.count}</span>
                        <span className={`size-2 rounded-full ${item.status === 'Rupture' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className={`text-[10px] font-bold ${item.status === 'Rupture' ? 'text-red-500' : 'text-amber-500'}`}>{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══ Recent Orders Table ══════════════════════════════════ */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">Historique Récent des Commandes</h3>
          <div className="flex gap-2">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"><Filter size={18} /></button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"><Download size={18} /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">N° Suivi</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Aucune commande trouvée.</td></tr>
              ) : (
                recentOrders.map((order) => {
                  const st = STATUS_CFG[order.statut];
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-primary font-mono text-sm">{order.numeroSuivi}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(order.dateCommande).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{order.nomClient}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{parseFloat(String(order.montantTotal)).toLocaleString()} FCFA</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{order.modeReception === 'LIVRAISON' ? 'Livraison' : 'Retrait'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a href="/orders" className="text-sm font-bold text-primary hover:underline underline-offset-4">Voir</a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
};
