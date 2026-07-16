import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Globe,
  Activity,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Commande, StatutCommande } from '../types';
import { venteApi, commandeApi } from '../services/api';

type Period = 'today' | '7d' | '30d' | '90d' | 'month' | 'quarter' | 'ytd';

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
  month: 'Ce mois',
  quarter: 'Ce trimestre',
  ytd: 'Année à date',
};

const getPeriodRange = (
  period: Period,
): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7d':
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case '30d':
      start = new Date(end);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case '90d':
      start = new Date(end);
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
      break;
    }
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - (end.getTime() - start.getTime()));
  return { start, end, prevStart, prevEnd };
};

const isInRange = (date: Date | string, start: Date, end: Date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  return d >= start && d <= end;
};

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fmtFCFA = (v: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(Math.round(v || 0))
    .replace(/\s/g, ' ') + ' FCFA';

const fmtNb = (v: number): string => Math.round(v || 0).toLocaleString('fr-FR');

const dayKey = (d: Date | string): string => {
  const dt = new Date(d);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  }).format(dt);
};

const STATUS_CFG: Record<StatutCommande, { label: string; color: string; icon: ReactNode }> = {
  EN_ATTENTE: { label: 'En attente', color: '#f59e0b', icon: <Clock size={14} /> },
  CONFIRMEE: { label: 'Confirmée', color: '#3b82f6', icon: <CheckCircle2 size={14} /> },
  EN_LIVRAISON: { label: 'En livraison', color: '#6366f1', icon: <Truck size={14} /> },
  LIVREE: { label: 'Livrée', color: '#10b981', icon: <CheckCircle2 size={14} /> },
  ANNULEE: { label: 'Annulée', color: '#ef4444', icon: <XCircle size={14} /> },
};

const STATUS_ORDER: StatutCommande[] = [
  'EN_ATTENTE',
  'CONFIRMEE',
  'EN_LIVRAISON',
  'LIVREE',
  'ANNULEE',
];

const JOURS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const Analyses = () => {
  const [ventes, setVentes] = useState<any[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.allSettled([venteApi.getAll(), commandeApi.getAll()])
      .then(([v, c]) => {
        if (!mounted) return;
        if (v.status === 'fulfilled') setVentes(v.value || []);
        if (c.status === 'fulfilled') setCommandes(c.value || []);
        const errs: string[] = [];
        if (v.status === 'rejected') errs.push('ventes');
        if (c.status === 'rejected') errs.push('commandes');
        if (errs.length) setError(`Erreur chargement : ${errs.join(', ')}`);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const { start, end, prevStart, prevEnd } = useMemo(
    () => getPeriodRange(period),
    [period],
  );

  // Ventes filtrées
  const ventesPeriod = useMemo(
    () => ventes.filter((v) => !v.annulee && isInRange(v.dateVente, start, end)),
    [ventes, start, end],
  );
  const ventesPrev = useMemo(
    () => ventes.filter((v) => !v.annulee && isInRange(v.dateVente, prevStart, prevEnd)),
    [ventes, prevStart, prevEnd],
  );

  // Commandes filtrées
  const cmdsPeriod = useMemo(
    () => commandes.filter((c) => isInRange(c.dateCommande, start, end)),
    [commandes, start, end],
  );
  const cmdsPrev = useMemo(
    () => commandes.filter((c) => isInRange(c.dateCommande, prevStart, prevEnd)),
    [commandes, prevStart, prevEnd],
  );
  const cmdsLivreesPeriod = cmdsPeriod.filter((c) => c.statut === 'LIVREE');
  const cmdsLivreesPrev = cmdsPrev.filter((c) => c.statut === 'LIVREE');

  // CA
  const caBoutique = useMemo(
    () => ventesPeriod.reduce((acc, v) => acc + toNumber(v.montantTotal), 0),
    [ventesPeriod],
  );
  const caEcommerce = useMemo(
    () => cmdsLivreesPeriod.reduce((acc, c) => acc + toNumber(c.montantTotal), 0),
    [cmdsLivreesPeriod],
  );
  const ca = caBoutique + caEcommerce;
  const caPrev =
    ventesPrev.reduce((acc, v) => acc + toNumber(v.montantTotal), 0) +
    cmdsLivreesPrev.reduce((acc, c) => acc + toNumber(c.montantTotal), 0);

  // Nombre de transactions
  const nbTransactions = ventesPeriod.length + cmdsLivreesPeriod.length;
  const nbTransactionsPrev = ventesPrev.length + cmdsLivreesPrev.length;

  // Panier moyen
  const panierMoyen = nbTransactions > 0 ? ca / nbTransactions : 0;
  const panierMoyenPrev =
    nbTransactionsPrev > 0 ? caPrev / nbTransactionsPrev : 0;

  // Quantité produits vendus
  const produitsVendus = useMemo(() => {
    let total = 0;
    for (const v of ventesPeriod) {
      for (const lv of v.lignesVente || []) total += toNumber(lv.quantite);
    }
    for (const c of cmdsLivreesPeriod) {
      for (const l of c.lignes || []) total += toNumber(l.quantite);
    }
    return total;
  }, [ventesPeriod, cmdsLivreesPeriod]);

  const produitsVendusPrev = useMemo(() => {
    let total = 0;
    for (const v of ventesPrev) {
      for (const lv of v.lignesVente || []) total += toNumber(lv.quantite);
    }
    for (const c of cmdsLivreesPrev) {
      for (const l of c.lignes || []) total += toNumber(l.quantite);
    }
    return total;
  }, [ventesPrev, cmdsLivreesPrev]);

  const trend = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  // Évolution CA
  const caChartData = useMemo(() => {
    const map = new Map<string, { boutique: number; ecommerce: number }>();
    const dates: string[] = [];
    const d = new Date(start);
    while (d <= end) {
      const k = dayKey(d);
      map.set(k, { boutique: 0, ecommerce: 0 });
      dates.push(k);
      d.setDate(d.getDate() + 1);
    }
    for (const v of ventesPeriod) {
      const k = dayKey(v.dateVente);
      const cur = map.get(k);
      if (cur) cur.boutique += toNumber(v.montantTotal);
    }
    for (const c of cmdsLivreesPeriod) {
      const k = dayKey(c.dateCommande);
      const cur = map.get(k);
      if (cur) cur.ecommerce += toNumber(c.montantTotal);
    }
    return dates.map((date) => ({
      date,
      boutique: Math.round(map.get(date)?.boutique ?? 0),
      ecommerce: Math.round(map.get(date)?.ecommerce ?? 0),
    }));
  }, [ventesPeriod, cmdsLivreesPeriod, start, end]);

  // Top 10 produits
  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of ventesPeriod) {
      for (const lv of v.lignesVente || []) {
        const q = toNumber(lv.quantite);
        if (q <= 0) continue;
        const name = lv.produit?.nomProduit || 'Inconnu';
        map.set(name, (map.get(name) ?? 0) + q);
      }
    }
    for (const c of cmdsLivreesPeriod) {
      for (const l of c.lignes || []) {
        const q = toNumber(l.quantite);
        if (q <= 0) continue;
        const name = l.nomProduit || (l as any).produit?.nomProduit || 'Inconnu';
        map.set(name, (map.get(name) ?? 0) + q);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, qty]) => ({
        name: name.length > 28 ? name.substring(0, 26) + '…' : name,
        quantite: qty,
      }));
  }, [ventesPeriod, cmdsLivreesPeriod]);

  // Répartition par canal
  const repartitionData = useMemo(
    () =>
      [
        { name: 'Boutique', value: Math.round(caBoutique), color: '#1c19a3' },
        { name: 'E-commerce', value: Math.round(caEcommerce), color: '#10b981' },
      ].filter((d) => d.value > 0),
    [caBoutique, caEcommerce],
  );

  // Commandes par statut
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of cmdsPeriod) counts[c.statut] = (counts[c.statut] ?? 0) + 1;
    return STATUS_ORDER.map((s) => ({
      name: STATUS_CFG[s].label,
      value: counts[s] ?? 0,
      color: STATUS_CFG[s].color,
    })).filter((d) => d.value > 0);
  }, [cmdsPeriod]);

  // Heatmap heures de pointe (jour × heure)
  const heatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const v of ventesPeriod) {
      const d = new Date(v.dateVente);
      if (Number.isNaN(d.getTime())) continue;
      grid[d.getDay()][d.getHours()] += 1;
    }
    for (const c of cmdsLivreesPeriod) {
      const d = new Date(c.dateCommande);
      if (Number.isNaN(d.getTime())) continue;
      grid[d.getDay()][d.getHours()] += 1;
    }
    let max = 0;
    for (const row of grid) for (const v of row) if (v > max) max = v;
    return { grid, max };
  }, [ventesPeriod, cmdsLivreesPeriod]);

  const TrendBadge = ({ value }: { value: number }) => {
    if (value === 0)
      return <span className="text-xs font-bold text-slate-400">—</span>;
    const positive = value > 0;
    return (
      <span
        className={`flex items-center text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}
      >
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {positive ? '+' : ''}
        {value}%
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analyses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tendances, performances et indicateurs détaillés.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
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

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* KPIs avec comparaison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart3 size={18} />
            </div>
            <TrendBadge value={trend(ca, caPrev)} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Chiffre d'affaires</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {loading ? '…' : fmtFCFA(ca)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            vs {fmtFCFA(caPrev)} précédent
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <TrendBadge value={trend(produitsVendus, produitsVendusPrev)} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Produits vendus</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {loading ? '…' : fmtNb(produitsVendus)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            vs {fmtNb(produitsVendusPrev)} précédent
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity size={18} />
            </div>
            <TrendBadge value={trend(nbTransactions, nbTransactionsPrev)} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Transactions</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {loading ? '…' : fmtNb(nbTransactions)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            vs {fmtNb(nbTransactionsPrev)} précédent
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <BarChart3 size={18} />
            </div>
            <TrendBadge value={trend(panierMoyen, panierMoyenPrev)} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Panier moyen</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {loading ? '…' : fmtFCFA(panierMoyen)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            vs {fmtFCFA(panierMoyenPrev)} précédent
          </p>
        </div>
      </div>

      {/* Graphes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Évolution CA */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-1">Évolution du CA</h3>
          <p className="text-xs text-slate-500 mb-4">{PERIOD_LABELS[period]}</p>
          {caChartData.some((d) => d.boutique > 0 || d.ecommerce > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={caChartData}>
                <defs>
                  <linearGradient id="caGradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1c19a3" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1c19a3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="caGradE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval={caChartData.length > 15 ? Math.floor(caChartData.length / 7) : 0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => (toNumber(v) >= 1000 ? `${Math.round(toNumber(v) / 1000)}k` : fmtNb(toNumber(v)))}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value: number, name: string) => [
                    fmtFCFA(value),
                    name === 'boutique' ? 'Boutique' : 'E-commerce',
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-slate-600">
                      {value === 'boutique' ? 'Boutique' : 'E-commerce'}
                    </span>
                  )}
                />
                <Area type="monotone" dataKey="boutique" stroke="#1c19a3" strokeWidth={2} fill="url(#caGradB)" />
                <Area type="monotone" dataKey="ecommerce" stroke="#10b981" strokeWidth={2} fill="url(#caGradE)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-400 py-12 text-sm">
              Aucune donnée sur la période.
            </p>
          )}
        </div>

        {/* Répartition par canal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-1">Répartition par canal</h3>
          <p className="text-xs text-slate-500 mb-4">CA boutique vs e-commerce</p>
          {repartitionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={repartitionData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {repartitionData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value: number, name: string) => [fmtFCFA(value), name]}
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
            <p className="text-center text-slate-400 py-12 text-sm">Aucune donnée.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 produits */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-1">Top 10 produits</h3>
          <p className="text-xs text-slate-500 mb-4">Par quantité vendue</p>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value: number) => [`${fmtNb(value)} unités`, 'Vendus']}
                />
                <Bar dataKey="quantite" fill="#1c19a3" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-400 py-12 text-sm">
              Aucune vente sur la période.
            </p>
          )}
        </div>

        {/* Statuts commandes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-1">Commandes par statut</h3>
          <p className="text-xs text-slate-500 mb-4">
            {cmdsPeriod.length} commande{cmdsPeriod.length !== 1 ? 's' : ''} sur la période
          </p>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
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
            <p className="text-center text-slate-400 py-12 text-sm">Aucune commande.</p>
          )}
        </div>
      </div>

      {/* Heatmap heures de pointe */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900 mb-1">Heures de pointe</h3>
        <p className="text-xs text-slate-500 mb-4">
          Activité par jour et par heure (ventes boutique + commandes livrées)
        </p>
        {heatmap.max > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-xs text-slate-400 font-medium pr-2"></th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th
                      key={h}
                      className="text-xs text-slate-400 font-medium px-1 text-center"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.grid.map((row, day) => (
                  <tr key={day}>
                    <td className="text-xs text-slate-500 font-medium pr-2 text-right">
                      {JOURS_FR[day]}
                    </td>
                    {row.map((v, h) => {
                      const intensity = heatmap.max > 0 ? v / heatmap.max : 0;
                      const bg =
                        v === 0
                          ? 'bg-slate-50'
                          : intensity < 0.25
                            ? 'bg-primary/10'
                            : intensity < 0.5
                              ? 'bg-primary/30'
                              : intensity < 0.75
                                ? 'bg-primary/60'
                                : 'bg-primary';
                      const textColor = intensity >= 0.5 ? 'text-white' : 'text-slate-600';
                      return (
                        <td key={h} className="p-0.5">
                          <div
                            className={`${bg} ${textColor} text-[10px] font-bold rounded text-center py-1`}
                            title={`${JOURS_FR[day]} ${h}h : ${v} transaction(s)`}
                          >
                            {v > 0 ? v : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <span>Moins actif</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-3 bg-slate-50 rounded" />
                <div className="w-4 h-3 bg-primary/10 rounded" />
                <div className="w-4 h-3 bg-primary/30 rounded" />
                <div className="w-4 h-3 bg-primary/60 rounded" />
                <div className="w-4 h-3 bg-primary rounded" />
              </div>
              <span>Plus actif</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-400 py-12 text-sm">
            Aucune transaction sur la période.
          </p>
        )}
      </div>

      {/* Note sous-pied */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Store size={12} />
        <span>Boutique</span>
        <span className="mx-2">·</span>
        <Globe size={12} />
        <span>E-commerce</span>
        <span className="mx-2">·</span>
        <span>Données comparées à la période précédente de même longueur.</span>
      </div>
    </motion.div>
  );
};
