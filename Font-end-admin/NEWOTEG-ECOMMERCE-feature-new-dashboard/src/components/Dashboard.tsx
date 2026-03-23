import React, { useEffect, useState, useMemo } from 'react';
import {
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PackageSearch,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Package,
  Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';
import { Commande, StatutCommande } from '../types';
import { venteApi, produitApi, commandeApi } from '../services/api';

/* ── Period helpers ──────────────────────────────────────────────── */
type Period = 'today' | '7d' | '30d' | 'month' | 'quarter';

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
  month: 'Ce mois',
  quarter: 'Ce trimestre',
};

const getPeriodRange = (period: Period): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (period) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate());
      break;
    }
    case '7d': {
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 6);
      prevStart.setHours(0, 0, 0, 0);
      break;
    }
    case '30d': {
      start = new Date(end);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 29);
      prevStart.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(start.getTime() - 1);
      break;
    }
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
      prevStart = new Date(now.getFullYear(), qMonth - 3, 1);
      prevEnd = new Date(start.getTime() - 1);
      break;
    }
  }

  return { start, end, prevStart, prevEnd };
};

const isInRange = (date: Date | string, start: Date, end: Date) => {
  const d = new Date(date);
  return d >= start && d <= end;
};

/* ── Order‑status visual map ────────────────────────────────────── */
const STATUS_CFG: Record<StatutCommande, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode; color: string }> = {
  EN_ATTENTE:   { label: 'En attente',   bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500',   icon: <Clock size={18} />, color: '#f59e0b' },
  CONFIRMEE:    { label: 'Confirmée',    bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500',    icon: <CheckCircle2 size={18} />, color: '#3b82f6' },
  EN_LIVRAISON: { label: 'En livraison', bg: 'bg-indigo-50',   text: 'text-indigo-700',  dot: 'bg-indigo-500',  icon: <Truck size={18} />, color: '#6366f1' },
  LIVREE:       { label: 'Livrée',       bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', icon: <CheckCircle2 size={18} />, color: '#10b981' },
  ANNULEE:      { label: 'Annulée',      bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500',     icon: <XCircle size={18} />, color: '#ef4444' },
};

const STATUS_ORDER: StatutCommande[] = ['EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE'];

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#6366f1', '#10b981', '#ef4444'];

export const Dashboard = () => {
  const [allVentes, setAllVentes] = useState<any[]>([]);
  const [allProduits, setAllProduits] = useState<any[]>([]);
  const [allCommandes, setAllCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ventesRes, produitsRes, commandesRes] = await Promise.all([
          venteApi.getAll(),
          produitApi.getAll(),
          commandeApi.getAll(),
        ]);
        setAllVentes(ventesRes);
        setAllProduits(produitsRes);
        setAllCommandes(commandesRes);
      } catch (error) {
        console.error('Erreur chargement dashboard', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ── Derived data based on period ─────────────────────────────── */
  const { start, end, prevStart, prevEnd } = useMemo(() => getPeriodRange(period), [period]);

  // Ventes filtered by period
  const ventesInPeriod = useMemo(() =>
    allVentes.filter(v => isInRange(v.dateVente, start, end)), [allVentes, start, end]);
  const ventesInPrev = useMemo(() =>
    allVentes.filter(v => isInRange(v.dateVente, prevStart, prevEnd)), [allVentes, prevStart, prevEnd]);

  // Commandes filtered by period
  const commandesInPeriod = useMemo(() =>
    allCommandes.filter(c => isInRange(c.dateCommande, start, end)), [allCommandes, start, end]);
  const commandesInPrev = useMemo(() =>
    allCommandes.filter(c => isInRange(c.dateCommande, prevStart, prevEnd)), [allCommandes, prevStart, prevEnd]);

  // KPIs
  const produitsSold = useMemo(() => {
    let total = 0;
    for (const v of ventesInPeriod) {
      for (const lv of (v.lignesVente ?? [])) total += lv.quantite ?? 0;
    }
    return total;
  }, [ventesInPeriod]);

  const produitsSoldPrev = useMemo(() => {
    let total = 0;
    for (const v of ventesInPrev) {
      for (const lv of (v.lignesVente ?? [])) total += lv.quantite ?? 0;
    }
    return total;
  }, [ventesInPrev]);

  const ca = useMemo(() =>
    ventesInPeriod.reduce((acc, v) => acc + parseFloat(v.montantTotal || '0'), 0), [ventesInPeriod]);
  const caPrev = useMemo(() =>
    ventesInPrev.reduce((acc, v) => acc + parseFloat(v.montantTotal || '0'), 0), [ventesInPrev]);

  // Trend calculation
  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const trendProduits = calcTrend(produitsSold, produitsSoldPrev);
  const trendCA = calcTrend(ca, caPrev);

  // Orders by status (in period)
  const ordersByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of commandesInPeriod) counts[c.statut] = (counts[c.statut] ?? 0) + 1;
    return counts;
  }, [commandesInPeriod]);

  // Recent orders (top 5, in period)
  const recentOrders = useMemo(() => commandesInPeriod.slice(0, 5), [commandesInPeriod]);

  // Stocks (not period-dependent)
  const totalProducts = allProduits.length;
  const totalUnits = useMemo(() => allProduits.reduce((sum, p) => sum + (p.quantiteStock ?? 0), 0), [allProduits]);
  const lowStockItems = useMemo(() => {
    const sorted = [...allProduits].sort((a, b) => (a.quantiteStock ?? 0) - (b.quantiteStock ?? 0));
    return sorted.filter(p => (p.quantiteStock ?? 0) <= 5).slice(0, 4).map(p => ({
      name: p.nomProduit,
      count: p.quantiteStock ?? 0,
      status: (p.quantiteStock ?? 0) <= 0 ? 'Rupture' : 'Critique',
    }));
  }, [allProduits]);

  /* ── Chart data ───────────────────────────────────────────────── */
  // CA evolution by day
  const caChartData = useMemo(() => {
    const map = new Map<string, number>();
    // Initialize all days in range
    const d = new Date(start);
    while (d <= end) {
      map.set(d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), 0);
      d.setDate(d.getDate() + 1);
    }
    for (const v of ventesInPeriod) {
      const key = new Date(v.dateVente).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      map.set(key, (map.get(key) ?? 0) + parseFloat(v.montantTotal || '0'));
    }
    return Array.from(map.entries()).map(([date, montant]) => ({ date, montant: Math.round(montant) }));
  }, [ventesInPeriod, start, end]);

  // Orders by status pie chart
  const statusPieData = useMemo(() =>
    STATUS_ORDER.map(s => ({
      name: STATUS_CFG[s].label,
      value: ordersByStatus[s] ?? 0,
      color: STATUS_CFG[s].color,
    })).filter(d => d.value > 0), [ordersByStatus]);

  // Top 5 products by quantity sold
  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of ventesInPeriod) {
      for (const lv of (v.lignesVente ?? [])) {
        const name = lv.produit?.nomProduit || 'Inconnu';
        map.set(name, (map.get(name) ?? 0) + (lv.quantite ?? 0));
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name: name.length > 20 ? name.substring(0, 18) + '…' : name, quantite: qty }));
  }, [ventesInPeriod]);

  const TrendBadge = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-xs font-bold text-slate-400">—</span>;
    const positive = value > 0;
    return (
      <span className={`flex items-center text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {positive ? '+' : ''}{value}%
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* ═══ Period Selector ═══════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === p
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Top KPI Cards ═════════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Produits vendus */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div>
            <TrendBadge value={trendProduits} />
          </div>
          <p className="text-sm text-slate-500 font-medium">Produits Vendus</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : produitsSold.toLocaleString()} unités</p>
          <p className="text-xs text-slate-400 mt-1">vs {produitsSoldPrev.toLocaleString()} période précédente</p>
        </div>

        {/* CA de la période */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20} /></div>
            <TrendBadge value={trendCA} />
          </div>
          <p className="text-sm text-slate-500 font-medium">Chiffre d'Affaires</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : ca.toLocaleString()} FCFA</p>
          <p className="text-xs text-slate-400 mt-1">vs {caPrev.toLocaleString()} FCFA période précédente</p>
        </div>
      </section>

      {/* ═══ Charts Row ═══════════════════════════════════════════════ */}
      {!loading && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CA Evolution AreaChart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Évolution du CA</h3>
            <p className="text-sm text-slate-500 mb-4">{PERIOD_LABELS[period]}</p>
            {caChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={caChartData}>
                  <defs>
                    <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1c19a3" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1c19a3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={caChartData.length > 15 ? Math.floor(caChartData.length / 7) : 0} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                    formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'CA']}
                  />
                  <Area type="monotone" dataKey="montant" stroke="#1c19a3" strokeWidth={2} fill="url(#caGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 py-12 text-center">Aucune donnée pour cette période</p>
            )}
          </div>

          {/* Orders by Status PieChart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Commandes par statut</h3>
            <p className="text-sm text-slate-500 mb-4">{commandesInPeriod.length} commande{commandesInPeriod.length !== 1 ? 's' : ''}</p>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                    formatter={(value: number, name: string) => [`${value}`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 py-12 text-center">Aucune commande</p>
            )}
          </div>
        </section>
      )}

      {/* ═══ Top Products Bar Chart ═══════════════════════════════════ */}
      {!loading && topProducts.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-lg text-slate-900 mb-1">Top Produits Vendus</h3>
          <p className="text-sm text-slate-500 mb-4">Par quantité vendue ({PERIOD_LABELS[period]})</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                formatter={(value: number) => [`${value} unités`, 'Vendus']}
              />
              <Bar dataKey="quantite" fill="#1c19a3" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ═══ BIG Commandes Status Breakdown Card ═══════════════════ */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ShoppingCart size={20} /></div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Commandes</h3>
              <p className="text-sm text-slate-500">{loading ? '...' : `${commandesInPeriod.length} commande${commandesInPeriod.length !== 1 ? 's' : ''} sur la période`}</p>
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
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">Commandes Récentes</h3>
        </div>

        {/* ── Table (desktop) ── */}
        <div className="hidden md:block overflow-x-auto">
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
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Aucune commande sur cette période.</td></tr>
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

        {/* ── Cards (mobile) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="px-4 py-8 text-center text-slate-500">Chargement...</p>
          ) : recentOrders.length === 0 ? (
            <p className="px-4 py-8 text-center text-slate-500">Aucune commande sur cette période.</p>
          ) : (
            recentOrders.map((order) => {
              const st = STATUS_CFG[order.statut];
              return (
                <div key={order.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary text-sm">{order.numeroSuivi}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{order.nomClient}</span>
                    <span className="font-semibold text-slate-900">{parseFloat(String(order.montantTotal)).toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{new Date(order.dateCommande).toLocaleDateString('fr-FR')} · {order.modeReception === 'LIVRAISON' ? 'Livraison' : 'Retrait'}</span>
                    <a href="/orders" className="text-xs font-bold text-primary hover:underline">Voir →</a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </motion.div>
  );
};
