import { AlertTriangle, CheckCircle2, CloudOff, PackageSearch, Printer, RefreshCw, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminOperations, useShopConnectionStatus } from '../context/AdminOperationsContext';
import { isAdministrationRole } from '../config/adminNavigation';

const statusClass = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-400',
  danger: 'bg-red-500',
  neutral: 'bg-slate-400',
};

const HealthItem = ({
  icon: Icon,
  label,
  value,
  status,
  to,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  status: keyof typeof statusClass;
  to?: string;
}) => {
  const content = (
    <>
      <span className={`h-2 w-2 shrink-0 rounded-full ${statusClass[status]}`} />
      <Icon size={15} className="shrink-0 text-slate-500" />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <span className="whitespace-nowrap text-xs font-bold text-slate-800">{value}</span>
    </>
  );

  return to ? (
    <Link to={to} className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 hover:bg-slate-100 focus-visible:ring-offset-slate-50">
      {content}
    </Link>
  ) : (
    <div className="flex min-h-10 items-center gap-2 rounded-lg px-2.5">{content}</div>
  );
};

export const ShopHealthBar = () => {
  const { admin } = useAdminAuth();
  const online = useShopConnectionStatus();
  const operations = useAdminOperations();
  if (!isAdministrationRole(admin?.role)) return null;

  const cashStatus = operations.cashSessionStatus === 'OUVERTE'
    ? { value: 'Ouverte', status: 'ok' as const }
    : operations.cashSessionStatus === 'FERMEE'
      ? { value: 'Fermée', status: 'warning' as const }
      : operations.cashSessionStatus === 'ABSENTE'
        ? { value: 'À ouvrir', status: 'danger' as const }
        : { value: 'Inconnue', status: 'neutral' as const };
  const syncStatus = !online
    ? { value: 'Hors ligne', status: 'danger' as const }
    : operations.queuedOperations > 0
      ? { value: `${operations.queuedOperations} en attente`, status: 'warning' as const }
      : { value: 'À jour', status: 'ok' as const };
  const printerStatus = operations.printerState === 'PRETE'
    ? { value: 'Prête', status: 'ok' as const }
    : operations.printerState === 'CONFIGUREE'
      ? { value: 'À connecter', status: 'warning' as const }
      : { value: 'Non configurée', status: 'neutral' as const };

  return (
    <section aria-label="Santé de la boutique" className="border-b border-slate-200 bg-slate-50/95 px-3 py-1.5">
      <div className="scrollbar-hidden mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto" role="status" aria-live="polite">
        <div className="mr-1 hidden items-center gap-2 px-2 min-[1200px]:flex">
          <span className="font-display text-xs font-bold text-[#0B1636]">Santé boutique</span>
          <span className="h-4 w-px bg-slate-200" />
        </div>
        <HealthItem
          icon={WalletCards}
          label="Caisse"
          value={cashStatus.value}
          status={cashStatus.status}
          to={admin.role === 'SUPER_ADMIN' ? '/finance?tab=caisse-jour' : '/caisse-admin'}
        />
        <HealthItem icon={online ? RefreshCw : CloudOff} label="Synchro" value={syncStatus.value} status={syncStatus.status} to="/offline-queue" />
        <HealthItem icon={Printer} label="Impression" value={printerStatus.value} status={printerStatus.status} to="/settings" />
        <HealthItem
          icon={PackageSearch}
          label="Stock"
          value={operations.lowStockProducts.length ? `${operations.lowStockProducts.length} alerte${operations.lowStockProducts.length > 1 ? 's' : ''}` : 'Sain'}
          status={operations.lowStockProducts.length ? 'danger' : 'ok'}
          to="/stock-achats"
        />
        <HealthItem
          icon={admin.role === 'SUPER_ADMIN' ? AlertTriangle : CheckCircle2}
          label={admin.role === 'SUPER_ADMIN' ? 'Décisions' : 'À traiter'}
          value={admin.role === 'SUPER_ADMIN' ? String(operations.pendingApprovals.length) : String(operations.pendingTickets.length)}
          status={(admin.role === 'SUPER_ADMIN' ? operations.pendingApprovals.length : operations.pendingTickets.length) ? 'warning' : 'ok'}
          to={admin.role === 'SUPER_ADMIN' ? '/a-valider' : '/caisse-admin'}
        />
        <p className="ml-auto hidden whitespace-nowrap px-2 font-mono text-[10px] text-slate-400 sm:block">
          {operations.lastUpdated ? `Actualisé ${operations.lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Actualisation…'}
        </p>
      </div>
    </section>
  );
};
