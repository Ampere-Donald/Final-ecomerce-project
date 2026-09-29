import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminOperations } from '../context/AdminOperationsContext';

const money = (value: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} FCFA`;

type TaskSeverity = 'critical' | 'attention' | 'normal';

interface PriorityTask {
  id: string;
  title: string;
  detail: string;
  value?: string;
  path: string;
  icon: LucideIcon;
  severity: TaskSeverity;
  priority: number;
}

const severityStyle: Record<TaskSeverity, { rail: string; icon: string; badge: string }> = {
  critical: { rail: 'bg-red-500', icon: 'bg-red-50 text-red-700', badge: 'bg-red-50 text-red-700' },
  attention: { rail: 'bg-amber-400', icon: 'bg-amber-50 text-amber-700', badge: 'bg-amber-50 text-amber-700' },
  normal: { rail: 'bg-cyan-400', icon: 'bg-cyan-50 text-cyan-800', badge: 'bg-slate-100 text-slate-600' },
};

const PageIntro = ({
  eyebrow,
  title,
  description,
  onRefresh,
  refreshing,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="font-display text-3xl font-bold tracking-[-0.035em] text-[#0B1636] sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
    <button
      type="button"
      onClick={() => void onRefresh()}
      disabled={refreshing}
      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:border-primary/30 hover:text-primary disabled:opacity-60"
    >
      <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
      Actualiser
    </button>
  </div>
);

const PriorityList = ({ tasks, emptyLabel }: { tasks: PriorityTask[]; emptyLabel: string }) => (
  <div className="surface overflow-hidden rounded-[1.25rem]">
    {tasks.length === 0 ? (
      <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={25} />
        </span>
        <p className="font-display text-lg font-bold text-slate-900">Tout est sous contrôle</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">{emptyLabel}</p>
      </div>
    ) : (
      <ol className="divide-y divide-slate-100">
        {tasks.map((task, index) => {
          const style = severityStyle[task.severity];
          const Icon = task.icon;
          return (
            <li key={task.id} className="relative">
              <span className={`absolute inset-y-0 left-0 w-1 ${style.rail}`} />
              <Link to={task.path} className="group flex min-h-[5.5rem] items-center gap-3 px-4 py-3 pl-5 hover:bg-slate-50 sm:gap-4 sm:px-5 sm:pl-6">
                <span className="w-5 shrink-0 font-mono text-xs font-bold text-slate-300">{String(index + 1).padStart(2, '0')}</span>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-bold text-slate-900 sm:text-base">{task.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500 sm:text-sm">{task.detail}</span>
                </span>
                {task.value && <span className={`hidden rounded-lg px-2.5 py-1 font-mono text-xs font-bold sm:inline ${style.badge}`}>{task.value}</span>}
                <ArrowRight size={17} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            </li>
          );
        })}
      </ol>
    )}
  </div>
);

const Metric = ({ label, value, detail, icon: Icon, tone = 'primary' }: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'primary' | 'success' | 'warning';
}) => {
  const tones = {
    primary: 'bg-primary/8 text-primary',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="surface rounded-[1.15rem] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
          <p className="mt-3 truncate font-mono text-xl font-bold tracking-tight text-[#0B1636] sm:text-2xl">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={18} /></span>
      </div>
    </div>
  );
};

const QuickLink = ({ to, icon: Icon, label, detail }: { to: string; icon: LucideIcon; label: string; detail: string }) => (
  <Link to={to} className="group flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B1636] text-cyan-300"><Icon size={19} /></span>
    <span className="min-w-0 flex-1">
      <span className="block font-display text-sm font-bold text-slate-900">{label}</span>
      <span className="mt-0.5 block text-xs text-slate-500">{detail}</span>
    </span>
    <ArrowRight size={16} className="text-slate-300 group-hover:text-primary" />
  </Link>
);

const DashboardSkeleton = () => (
  <div className="space-y-6" aria-label="Chargement du tableau de bord">
    <div className="space-y-3"><div className="skeleton h-4 w-28" /><div className="skeleton h-10 w-72" /><div className="skeleton h-4 w-full max-w-xl" /></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-32" />)}</div>
    <div className="skeleton h-72" />
  </div>
);

const SuperAdminOverview = () => {
  const operations = useAdminOperations();
  const tasks: PriorityTask[] = [
    operations.pendingApprovals.length > 0 ? {
      id: 'approvals',
      title: 'Décider sur les demandes sensibles',
      detail: 'Factures virtuelles en attente de votre approbation ou de votre refus.',
      value: String(operations.pendingApprovals.length),
      path: '/a-valider',
      icon: BadgeCheck,
      severity: 'critical',
      priority: 100,
    } : null,
    operations.cashSessionStatus !== 'OUVERTE' ? {
      id: 'cash-session',
      title: operations.cashSessionStatus === 'FERMEE' ? 'Contrôler la caisse fermée' : 'Faire ouvrir la caisse du jour',
      detail: 'La boutique ne peut pas encaisser normalement tant que la session n’est pas opérationnelle.',
      path: '/finance?tab=caisse-jour',
      icon: WalletCards,
      severity: 'critical',
      priority: 95,
    } : null,
    operations.staleOrdersCount > 0 ? {
      id: 'old-orders',
      title: 'Débloquer les commandes anciennes',
      detail: 'Commandes en ligne en attente depuis plus de 24 heures.',
      value: String(operations.staleOrdersCount),
      path: '/orders',
      icon: Clock3,
      severity: 'attention',
      priority: 80,
    } : null,
    operations.lowStockProducts.length > 0 ? {
      id: 'low-stock',
      title: 'Arbitrer le réapprovisionnement',
      detail: 'Produits en rupture ou sous leur seuil d’alerte.',
      value: String(operations.lowStockProducts.length),
      path: '/stock-achats',
      icon: PackageSearch,
      severity: 'attention',
      priority: 70,
    } : null,
    operations.urgentDeadlinesCount > 0 ? {
      id: 'deadlines',
      title: 'Sécuriser les échéances proches',
      detail: 'Paiements ou engagements arrivant à échéance dans les trois jours.',
      value: String(operations.urgentDeadlinesCount),
      path: '/finance?tab=echeances',
      icon: CalendarClock,
      severity: 'normal',
      priority: 50,
    } : null,
  ].filter(Boolean).sort((a, b) => b.priority - a.priority) as PriorityTask[];

  return (
    <div className="space-y-7 pb-4">
      <PageIntro
        eyebrow="Superadministrateur · contrôle central"
        title="Vue d’ensemble"
        description="Les décisions qui protègent la boutique, classées avant les chiffres. Vous gardez la main sans traverser chaque module."
        onRefresh={operations.refresh}
        refreshing={operations.loading}
      />
      {operations.partialError && <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"><AlertTriangle size={17} /> Certaines données n’ont pas répondu. Les informations disponibles restent affichées.</p>}

      <section aria-labelledby="super-decisions-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Ordre de décision</p><h2 id="super-decisions-title" className="font-display text-xl font-bold text-[#0B1636]">À décider maintenant</h2></div>
          <Link to="/a-valider" className="hidden text-sm font-bold text-primary hover:underline sm:inline">Centre de validation</Link>
        </div>
        <PriorityList tasks={tasks} emptyLabel="Aucune décision sensible ni alerte majeure ne requiert votre intervention immédiate." />
      </section>

      <section aria-labelledby="super-signals-title" className="space-y-3">
        <h2 id="super-signals-title" className="font-display text-xl font-bold text-[#0B1636]">Signaux de pilotage</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Trésorerie globale" value={money(operations.globalCashBalance)} detail="Solde consolidé" icon={Banknote} tone="success" />
          <Metric label="Commandes web" value={String(operations.pendingOrders.length)} detail="En attente de traitement" icon={ReceiptText} tone={operations.pendingOrders.length ? 'warning' : 'primary'} />
          <Metric label="Encours clients" value={money(operations.customerCreditTotal)} detail={`${operations.customerCredits.length} dossier(s)`} icon={Users} />
          <Metric label="Stock à surveiller" value={String(operations.lowStockProducts.length)} detail="Ruptures et seuils bas" icon={Boxes} tone={operations.lowStockProducts.length ? 'warning' : 'success'} />
        </div>
      </section>

      <section aria-labelledby="super-access-title" className="space-y-3">
        <h2 id="super-access-title" className="font-display text-xl font-bold text-[#0B1636]">Espaces de contrôle</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <QuickLink to="/finance" icon={CircleDollarSign} label="Finance" detail="Caisse, coffres, crédits et échéances" />
          <QuickLink to="/stock-achats" icon={Boxes} label="Stock & achats" detail="Réapprovisionnement et inventaires" />
          <QuickLink to="/equipe-acces" icon={Users} label="Équipe & accès" detail="Comptes, rôles et délégations" />
        </div>
      </section>
    </div>
  );
};

const AdminToday = () => {
  const { admin } = useAdminAuth();
  const operations = useAdminOperations();
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const tasks: PriorityTask[] = [
    operations.cashSessionStatus !== 'OUVERTE' ? {
      id: 'open-cash', title: 'Rendre la caisse opérationnelle', detail: operations.cashSessionStatus === 'FERMEE' ? 'La session du jour est fermée.' : 'Aucune session ouverte pour les encaissements.', path: '/caisse-admin', icon: WalletCards, severity: 'critical', priority: 100,
    } : null,
    operations.pendingTickets.length > 0 ? {
      id: 'tickets', title: 'Encaisser les tickets en attente', detail: 'Les vendeurs attendent le passage en caisse.', value: String(operations.pendingTickets.length), path: '/file-caissier', icon: ReceiptText, severity: 'critical', priority: 95,
    } : null,
    operations.staleOrdersCount > 0 ? {
      id: 'orders', title: 'Traiter les commandes qui vieillissent', detail: 'Commandes web en attente depuis plus de 24 heures.', value: String(operations.staleOrdersCount), path: '/ventes-commandes?tab=commandes', icon: Clock3, severity: 'attention', priority: 80,
    } : null,
    operations.lowStockProducts.length > 0 ? {
      id: 'stock', title: 'Préparer le réapprovisionnement', detail: 'Produits en rupture ou proches du seuil minimal.', value: String(operations.lowStockProducts.length), path: '/stock-achats', icon: PackageSearch, severity: 'attention', priority: 70,
    } : null,
    operations.queuedOperations > 0 ? {
      id: 'sync', title: 'Synchroniser les opérations locales', detail: 'Des ventes ou tickets restent stockés sur ce poste.', value: String(operations.queuedOperations), path: '/offline-queue', icon: RefreshCw, severity: 'normal', priority: 60,
    } : null,
    operations.urgentDeadlinesCount > 0 ? {
      id: 'deadlines', title: 'Vérifier les échéances proches', detail: 'Engagements arrivant à échéance dans les trois jours.', value: String(operations.urgentDeadlinesCount), path: '/echeances', icon: CalendarClock, severity: 'normal', priority: 50,
    } : null,
  ].filter(Boolean).sort((a, b) => b.priority - a.priority) as PriorityTask[];

  return (
    <div className="space-y-7 pb-4">
      <PageIntro
        eyebrow={`${today} · ${admin?.nom || 'Administration'}`}
        title="Aujourd’hui"
        description="Commencez par les tâches qui bloquent la vente, puis avancez sur le stock et le suivi client."
        onRefresh={operations.refresh}
        refreshing={operations.loading}
      />
      {operations.partialError && <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"><AlertTriangle size={17} /> Une partie des données est momentanément indisponible. Réessayez dans quelques instants.</p>}

      <section aria-labelledby="admin-priorities-title" className="space-y-3">
        <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">File de travail</p><h2 id="admin-priorities-title" className="font-display text-xl font-bold text-[#0B1636]">Vos priorités</h2></div>
        <PriorityList tasks={tasks} emptyLabel="La caisse, les commandes, le stock et la synchronisation ne signalent aucun blocage." />
      </section>

      <section aria-labelledby="admin-actions-title" className="space-y-3">
        <h2 id="admin-actions-title" className="font-display text-xl font-bold text-[#0B1636]">Actions directes</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink to="/pos" icon={ShoppingBag} label="Nouvelle vente" detail="Ouvrir le comptoir" />
          <QuickLink to="/file-caissier" icon={ReceiptText} label="Encaisser" detail={`${operations.pendingTickets.length} ticket(s) en attente`} />
          <QuickLink to="/stock-achats" icon={Boxes} label="Stock & achats" detail="Traiter alertes et réappro" />
          <QuickLink to="/clients" icon={Users} label="Clients" detail="Fiches, crédits et historique" />
        </div>
      </section>

      <section aria-labelledby="admin-pulse-title" className="space-y-3">
        <h2 id="admin-pulse-title" className="font-display text-xl font-bold text-[#0B1636]">Pouls de la journée</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Caisse du jour" value={money(operations.cashSessionBalance)} detail={operations.cashSessionStatus === 'OUVERTE' ? 'Session ouverte' : 'Session non ouverte'} icon={WalletCards} tone={operations.cashSessionStatus === 'OUVERTE' ? 'success' : 'warning'} />
          <Metric label="Commandes web" value={String(operations.pendingOrders.length)} detail="À traiter" icon={ReceiptText} tone={operations.pendingOrders.length ? 'warning' : 'primary'} />
          <Metric label="Stock faible" value={String(operations.lowStockProducts.length)} detail="Produits à vérifier" icon={PackageSearch} tone={operations.lowStockProducts.length ? 'warning' : 'success'} />
          <Metric label="Encours clients" value={money(operations.customerCreditTotal)} detail={`${operations.customerCredits.length} client(s)`} icon={Users} />
        </div>
      </section>
    </div>
  );
};

export const AdministrationDashboard = () => {
  const { admin } = useAdminAuth();
  const operations = useAdminOperations();
  if (operations.loading && !operations.lastUpdated) return <DashboardSkeleton />;
  return admin?.role === 'SUPER_ADMIN' ? <SuperAdminOverview /> : <AdminToday />;
};
