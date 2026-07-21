import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Wallet,
  Landmark,
  Globe,
  Receipt,
  AlarmClock,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Lock,
  Package,
  PackageX,
  BarChart3,
  HandCoins,
  CloudOff,
  Printer,
  PlayCircle,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import {
  caisseApi,
  caisseJourApi,
  commandeApi,
  ticketApi,
  echeanceApi,
  produitApi,
  clientApi,
  bonVenteApi,
} from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';
import { listQueuedSales, OFFLINE_QUEUE_EVENT } from '../services/offlineSalesQueue';

const fmtFCFA = (n: number | string | null | undefined): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n ?? 0;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(v || 0)
    .replace(/\s/g, ' ') + ' FCFA';
};

const fmtDateCourt = (d: string | Date): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d));

const daysUntil = (d: string | Date): number => {
  const target = new Date(d);
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const n = new Date();
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((t - today) / 86_400_000);
};

interface Kpi {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  to?: string;
  color: string;
}

interface UrgentAction {
  id: string;
  icon: any;
  label: string;
  detail?: string;
  to: string;
  severity: 'rouge' | 'orange' | 'jaune';
}

const sevClasses: Record<UrgentAction['severity'], string> = {
  rouge: 'bg-red-50 text-red-700',
  orange: 'bg-orange-50 text-orange-700',
  jaune: 'bg-amber-50 text-amber-700',
};

const sevRailClasses: Record<UrgentAction['severity'], string> = {
  rouge: 'bg-red-500',
  orange: 'bg-orange-400',
  jaune: 'bg-amber-400',
};

const ADMIN_QUICK_ACTIONS: Array<{ label: string; detail: string; icon: LucideIcon; to: string }> = [
  { label: 'Nouvelle vente', detail: 'Ouvrir le comptoir', icon: ShoppingBag, to: '/pos' },
  { label: 'Produits', detail: 'Stock et catalogue', icon: Package, to: '/produits' },
  { label: 'Clients', detail: 'Fiches et crédits', icon: HandCoins, to: '/clients' },
  { label: 'Encaissements', detail: 'Voir la file active', icon: Receipt, to: '/file-caissier' },
];

export const Dashboard = () => {
  const { admin } = useAdminAuth();
  const role = admin?.role;
  const peutAnalyses = can.accessAnalyses(role);
  const isAdminRole = ['SUPER_ADMIN', 'ADMIN'].includes(role || '');

  const [soldeCaisseJour, setSoldeCaisseJour] = useState<number | null>(null);
  const [caisseJourStatut, setCaisseJourStatut] = useState<'OUVERTE' | 'FERMEE' | 'ABSENTE' | 'INCONNUE'>('INCONNUE');
  const [soldeGlobale, setSoldeGlobale] = useState<number | null>(null);
  const [nbCommandesEnAttente, setNbCommandesEnAttente] = useState<number | null>(null);
  const [commandesAnciennes, setCommandesAnciennes] = useState(0);
  const [nbTicketsAttente, setNbTicketsAttente] = useState<number | null>(null);
  const [echeancesUrgentes, setEcheancesUrgentes] = useState<any[]>([]);
  const [echeances7j, setEcheances7j] = useState<any[]>([]);
  const [produitsRupture, setProduitsRupture] = useState(0);
  const [encoursTotal, setEncoursTotal] = useState<number | null>(null);
  const [topDebiteurs, setTopDebiteurs] = useState<any[]>([]);
  const [operationsHorsLigne, setOperationsHorsLigne] = useState(0);
  const [imprimanteDisponible, setImprimanteDisponible] = useState<boolean | null>(null);
  const [bonsVendeurAttente, setBonsVendeurAttente] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const charger = async () => {
      if (role === 'VENDEUR') {
        const bons = await bonVenteApi.mesBons().catch(() => []);
        if (!mounted) return;
        setBonsVendeurAttente((bons || []).filter((bon: any) => bon.statut === 'EN_ATTENTE').length);
        setLoading(false);
        return;
      }

      if (role === 'CAISSIER') {
        const [caisse, tickets] = await Promise.allSettled([
          caisseJourApi.aujourdhui(),
          ticketApi.enAttente(),
        ]);
        if (!mounted) return;
        if (caisse.status === 'fulfilled') {
          const value = caisse.value;
          setSoldeCaisseJour(value?.solde ?? 0);
          setCaisseJourStatut(value?.statut === 'FERMEE' ? 'FERMEE' : value ? 'OUVERTE' : 'ABSENTE');
        } else {
          setCaisseJourStatut('ABSENTE');
        }
        if (tickets.status === 'fulfilled') setNbTicketsAttente((tickets.value || []).length);
        setLoading(false);
        return;
      }

      if (!isAdminRole) {
        setLoading(false);
        return;
      }

      const res = await Promise.allSettled([
        caisseJourApi.aujourdhui(),
        caisseApi.soldeGlobal(),
        commandeApi.getAll(),
        ticketApi.enAttente(),
        echeanceApi.getAVenir(7),
        produitApi.getLowStock(),
        clientApi.getCredits(),
      ]);
      if (!mounted) return;

      if (res[0].status === 'fulfilled') {
        const cj = res[0].value;
        setSoldeCaisseJour(cj?.solde ?? 0);
        setCaisseJourStatut(cj?.statut === 'FERMEE' ? 'FERMEE' : cj ? 'OUVERTE' : 'ABSENTE');
      } else {
        setCaisseJourStatut('ABSENTE');
      }
      if (res[1].status === 'fulfilled') {
        setSoldeGlobale(res[1].value?.total ?? 0);
      }
      if (res[2].status === 'fulfilled') {
        const cmds = res[2].value || [];
        const enAttente = cmds.filter((c: any) => c.statut === 'EN_ATTENTE');
        setNbCommandesEnAttente(enAttente.length);
        const limite = Date.now() - 24 * 3600 * 1000;
        setCommandesAnciennes(
          enAttente.filter((c: any) => new Date(c.dateCommande).getTime() < limite).length,
        );
      }
      if (res[3].status === 'fulfilled') {
        setNbTicketsAttente((res[3].value || []).length);
      }
      if (res[4].status === 'fulfilled') {
        const list = res[4].value || [];
        setEcheances7j(list.slice(0, 5));
        setEcheancesUrgentes(
          list.filter((e: any) => daysUntil(e.dateEcheance) <= 3),
        );
      }
      if (res[5].status === 'fulfilled') {
        setProduitsRupture((res[5].value || []).length);
      }
      if (res[6].status === 'fulfilled') {
        const credits = res[6].value || [];
        setEncoursTotal(credits.reduce((acc: number, c: any) => acc + (c.totalDu || 0), 0));
        setTopDebiteurs(credits.slice(0, 3));
      }
      setLoading(false);
    };
    charger();
    const id = setInterval(charger, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isAdminRole, role]);

  useEffect(() => {
    const chargerEtatLocal = async () => {
      const queued = await listQueuedSales().catch(() => []);
      setOperationsHorsLigne(queued.length);
      const printer = await import('../services/qzPrinter');
      setImprimanteDisponible(
        printer.isAndroidDevice() ? false : printer.isConnected() && Boolean(printer.getPrinterName()),
      );
    };
    void chargerEtatLocal();
    window.addEventListener(OFFLINE_QUEUE_EVENT, chargerEtatLocal);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, chargerEtatLocal);
  }, []);

  const kpis: Kpi[] = useMemo(
    () => {
      if (role === 'VENDEUR') {
        return [
          { icon: ShoppingBag, label: 'Vente en cours', value: 'Ouvrir', sub: 'Scanner ou rechercher un produit', to: '/pos', color: 'text-primary' },
          { icon: Receipt, label: 'Mes tickets', value: bonsVendeurAttente == null ? '…' : String(bonsVendeurAttente), sub: 'en attente de caisse', to: '/mes-tickets', color: 'text-amber-600' },
          { icon: CloudOff, label: 'Hors ligne', value: String(operationsHorsLigne), sub: 'opération(s) à synchroniser', to: '/offline-queue', color: 'text-orange-600' },
        ];
      }
      if (role === 'CAISSIER') {
        return [
          {
            icon: Wallet,
            label: 'Ouverture et fermeture',
            value: caisseJourStatut === 'OUVERTE' ? 'Ouverte' : caisseJourStatut === 'FERMEE' ? 'Fermée' : 'À ouvrir',
            sub: soldeCaisseJour == null ? 'Session de caisse' : fmtFCFA(soldeCaisseJour),
            to: '/caisse-jour',
            color: caisseJourStatut === 'OUVERTE' ? 'text-emerald-600' : 'text-slate-600',
          },
          { icon: CloudOff, label: 'Hors ligne', value: String(operationsHorsLigne), sub: 'opération(s) à synchroniser', to: '/offline-queue', color: 'text-orange-600' },
          { icon: Printer, label: 'Imprimante', value: imprimanteDisponible ? 'Prête' : 'À vérifier', sub: 'Epson TM-T20II · 58 mm', to: '/settings', color: imprimanteDisponible ? 'text-emerald-600' : 'text-red-600' },
        ];
      }
      return [
      {
        icon: Wallet,
        label: 'Caisse du jour',
        value: soldeCaisseJour == null ? '…' : fmtFCFA(soldeCaisseJour),
        sub: caisseJourStatut === 'OUVERTE' ? 'Session ouverte' : caisseJourStatut === 'FERMEE' ? 'Caisse fermée' : 'À ouvrir',
        to: '/caisse-jour',
        color: 'text-primary',
      },
      {
        icon: Landmark,
        label: 'Caisse globale + coffres',
        value: soldeGlobale == null ? '…' : fmtFCFA(soldeGlobale),
        sub: 'Trésorerie totale',
        to: '/caisse',
        color: 'text-emerald-600',
      },
      {
        icon: Globe,
        label: 'Commandes en ligne',
        value: nbCommandesEnAttente == null ? '…' : String(nbCommandesEnAttente),
        sub: 'en attente',
        to: '/orders',
        color: 'text-indigo-600',
      },
      {
        icon: Receipt,
        label: 'Tickets boutique',
        value: nbTicketsAttente == null ? '…' : String(nbTicketsAttente),
        sub: 'à encaisser',
        to: '/file-caissier',
        color: 'text-amber-600',
      },
      ];
    },
    [role, bonsVendeurAttente, operationsHorsLigne, imprimanteDisponible, soldeCaisseJour, caisseJourStatut, soldeGlobale, nbCommandesEnAttente, nbTicketsAttente],
  );

  const actions: UrgentAction[] = useMemo(() => {
    const list: UrgentAction[] = [];
    if (isAdminRole) {
    for (const e of echeancesUrgentes) {
      const d = daysUntil(e.dateEcheance);
      list.push({
        id: `ech-${e.id}`,
        icon: AlarmClock,
        label: e.titre,
        detail:
          d < 0
            ? `En retard de ${Math.abs(d)} jour(s)`
            : d === 0
              ? "Aujourd'hui"
              : `Dans ${d} jour(s)`,
        to: '/echeances',
        severity: d < 0 ? 'rouge' : d <= 1 ? 'rouge' : 'orange',
      });
    }
    if (commandesAnciennes > 0) {
      list.push({
        id: 'cmds-old',
        icon: Globe,
        label: `${commandesAnciennes} commande(s) en attente depuis plus de 24h`,
        to: '/orders',
        severity: 'orange',
      });
    }
    if (produitsRupture > 0) {
      list.push({
        id: 'stock',
        icon: PackageX,
        label: `${produitsRupture} produit(s) en rupture ou seuil bas`,
        to: '/stock-alerts',
        severity: 'jaune',
      });
    }
    }
    if (role !== 'VENDEUR' && (nbTicketsAttente ?? 0) > 0) {
      list.push({
        id: 'tickets-attente',
        icon: Receipt,
        label: `${nbTicketsAttente} ticket(s) à encaisser`,
        detail: 'La file caissier attend une action',
        to: '/file-caissier',
        severity: 'orange',
      });
    }
    if (operationsHorsLigne > 0) {
      list.push({
        id: 'offline',
        icon: CloudOff,
        label: `${operationsHorsLigne} opération(s) non synchronisée(s)`,
        detail: 'Contrôler la file locale de cet appareil',
        to: '/offline-queue',
        severity: 'rouge',
      });
    }
    if (role !== 'VENDEUR' && imprimanteDisponible === false) {
      list.push({
        id: 'printer',
        icon: Printer,
        label: 'Imprimante de caisse indisponible',
        detail: 'Vérifier QZ Tray et l’Epson TM-T20II',
        to: '/settings',
        severity: 'orange',
      });
    }
    if (role !== 'VENDEUR' && caisseJourStatut === 'ABSENTE') {
      list.push({
        id: 'caisse-absente',
        icon: PlayCircle,
        label: 'Caisse du jour non ouverte',
        detail: 'Ouvrir la session avant le premier encaissement',
        to: '/caisse-jour',
        severity: 'rouge',
      });
    } else if (role !== 'VENDEUR' && caisseJourStatut === 'FERMEE') {
      list.push({
        id: 'caisse-fermee',
        icon: Lock,
        label: 'Caisse du jour fermée',
        detail: 'La session ne peut plus recevoir d’encaissement',
        to: '/caisse-jour',
        severity: 'jaune',
      });
    }
    return list;
  }, [isAdminRole, role, echeancesUrgentes, commandesAnciennes, produitsRupture, nbTicketsAttente, operationsHorsLigne, imprimanteDisponible, caisseJourStatut]);

  const quickActions = isAdminRole ? ADMIN_QUICK_ACTIONS : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 md:pb-5">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
            Activité en direct
            <span className="font-medium normal-case tracking-normal text-slate-300">·</span>
            <span className="font-semibold normal-case tracking-normal text-slate-500">
              {new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {new Date().getHours() < 12 ? 'Bonjour' : new Date().getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'}{' '}
            {admin?.nom || 'Administrateur'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdminRole
              ? 'Les priorités de la boutique, sans détour.'
              : role === 'CAISSIER'
                ? 'Traitez les tickets en attente, puis gérez votre session de caisse.'
                : "Voici l'état de votre activité maintenant."}
          </p>
        </div>
        {peutAnalyses && (
          <Link
            to="/analyses"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
          >
            <BarChart3 size={16} />
            <span className="hidden sm:inline">Voir les analyses détaillées</span>
            <span className="sm:hidden">Analyses</span>
          </Link>
        )}
      </div>

      {role === 'CAISSIER' && (
        <section aria-labelledby="cashier-primary-action" className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Link
            to="/file-caissier"
            className="group flex min-h-24 items-center gap-4 rounded-xl bg-primary px-5 py-4 text-white shadow-[0_8px_24px_rgba(29,78,216,0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Receipt size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span id="cashier-primary-action" className="block text-base font-bold">Tickets à encaisser</span>
              <span className="mt-0.5 block text-sm text-white/75">
                {nbTicketsAttente == null ? 'Ouvrir la file active' : `${nbTicketsAttente} ticket${nbTicketsAttente > 1 ? 's' : ''} dans la file active`}
              </span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            to="/caisse-jour"
            className="flex min-h-24 items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Wallet size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">Ouverture et fermeture de caisse</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {caisseJourStatut === 'OUVERTE' ? 'Session ouverte' : caisseJourStatut === 'FERMEE' ? 'Session fermée' : 'Session à ouvrir'}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </Link>
        </section>
      )}

      {quickActions.length > 0 && (
        <section aria-labelledby="admin-quick-actions">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="admin-quick-actions" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Accès rapides
            </h2>
            <span className="text-xs text-slate-400 lg:hidden">Balayer →</span>
            <span className="hidden text-xs text-slate-400 lg:inline">Gérer</span>
          </div>
          <div className="scrollbar-hidden -mx-3 overflow-x-auto px-3 pb-1 lg:mx-0 lg:px-0">
            <div className="flex min-w-max gap-2 lg:grid lg:min-w-0 lg:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.to} to={action.to} className="flex min-h-14 w-[160px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition-colors hover:bg-slate-50 lg:w-auto">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Icon size={17} /></span>
                    <span className="min-w-0"><strong className="block text-sm text-slate-900">{action.label}</strong><span className="block truncate text-[11px] text-slate-400">{action.detail}</span></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4 KPIs */}
      <div className={`grid gap-3 ${isAdminRole ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {kpis.map((k) => {
          const Icon = k.icon;
          const card = (
            <div className="h-full min-h-[128px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:bg-slate-50 sm:min-h-0 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className={`rounded-lg bg-slate-100 p-2 ${k.color}`}>
                  <Icon size={18} />
                </div>
                {k.to && <ChevronRight size={16} className="text-slate-300" />}
              </div>
              <p className="text-[11px] font-bold leading-tight text-slate-500 sm:text-xs">
                {k.label}
              </p>
              <p className={`mt-1 text-lg font-bold leading-tight sm:text-2xl ${k.color}`}>{k.value}</p>
              {k.sub && <p className="text-xs text-slate-400 mt-1">{k.sub}</p>}
            </div>
          );
          return k.to ? (
            <Link key={k.label} to={k.to}>
              {card}
            </Link>
          ) : (
            <div key={k.label}>{card}</div>
          );
        })}
      </div>

      {/* Actions urgentes */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]" aria-labelledby="urgent-actions-title">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            <h2 id="urgent-actions-title" className="font-bold text-slate-900">Actions urgentes</h2>
          </div>
          {actions.length > 0 && (
            <span className="text-xs font-bold text-slate-400">
              {actions.length} à traiter
            </span>
          )}
        </div>
        {loading ? (
          <p className="text-center text-slate-400 py-6 text-sm">Chargement…</p>
        ) : actions.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-sm font-medium">Tout est en ordre. Rien à faire pour l'instant.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.id} className="relative">
                  <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${sevRailClasses[a.severity]}`} />
                  <Link
                    to={a.to}
                    className="flex min-h-16 items-center gap-3 py-3.5 pl-5 pr-4 transition-colors hover:bg-slate-50"
                  >
                    <div className={`rounded-lg p-2 ${sevClasses[a.severity]}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {a.label}
                      </p>
                      {a.detail && (
                        <p className="text-xs text-slate-500 mt-0.5">{a.detail}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isAdminRole && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* Encours clients */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HandCoins size={18} className="text-primary" />
            <h3 className="font-bold text-slate-900">Encours clients</h3>
          </div>
          <Link to="/credits" className="text-xs font-bold text-primary hover:underline">
            Tout voir
          </Link>
        </div>
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <span className="text-sm text-slate-500">Total dû par les clients</span>
          <span className={`text-2xl font-bold ${(encoursTotal ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {encoursTotal == null ? '…' : fmtFCFA(encoursTotal)}
          </span>
        </div>
        {topDebiteurs.length === 0 ? (
          <div className="text-center text-slate-400 py-6 text-sm">
            Aucun crédit en cours. Tout est soldé 🎉
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {topDebiteurs.map((d) => (
              <li key={d.client?.id}>
                <Link to="/credits" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {d.client?.nom?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {d.client?.nom} {d.client?.prenom || ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-600 whitespace-nowrap">{fmtFCFA(d.totalDu)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Échéances 7 jours */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlarmClock size={18} className="text-primary" />
            <h3 className="font-bold text-slate-900">Échéances — 7 prochains jours</h3>
          </div>
          <Link
            to="/echeances"
            className="text-xs font-bold text-primary hover:underline"
          >
            Tout voir
          </Link>
        </div>
        {echeances7j.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-sm">
            Aucune échéance dans les 7 prochains jours.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {echeances7j.map((e: any) => {
              const d = daysUntil(e.dateEcheance);
              const cls =
                d < 0
                  ? 'bg-red-50 text-red-700'
                  : d <= 1
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-emerald-50 text-emerald-700';
              const label = d < 0 ? 'En retard' : d === 0 ? "Aujourd'hui" : `Dans ${d} j`;
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {e.titre}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fmtDateCourt(e.dateEcheance)}
                      {e.coffre ? ` · ${e.coffre.nom}` : ''}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cls}`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      </div>}

      {/* Note minuscule en bas */}
      <p className="text-center text-xs text-slate-400">
        Données rafraîchies toutes les 30 secondes.
        {!peutAnalyses && (
          <>
            {' '}
            <XCircle size={10} className="inline" /> Analyses détaillées non
            disponibles pour votre rôle.
          </>
        )}
      </p>
    </motion.div>
  );
};
