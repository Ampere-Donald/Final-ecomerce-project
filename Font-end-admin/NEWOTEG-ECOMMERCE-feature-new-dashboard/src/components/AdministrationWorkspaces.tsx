import { lazy, Suspense, type ReactNode } from 'react';
import {
  AlarmClock,
  Banknote,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  Landmark,
  Package,
  PackageSearch,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  Users,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { WorkspaceTabs, type WorkspaceTab } from './WorkspaceTabs';

const Produits = lazy(() => import('./Produits').then((module) => ({ default: module.Produits })));
const Inventaire = lazy(() => import('./Inventaire').then((module) => ({ default: module.Inventaire })));
const Achats = lazy(() => import('./Achats').then((module) => ({ default: module.Achats })));
const Fournisseurs = lazy(() => import('./Fournisseurs').then((module) => ({ default: module.Fournisseurs })));
const StockAlerts = lazy(() => import('./StockAlerts').then((module) => ({ default: module.StockAlerts })));
const CaisseJour = lazy(() => import('./CaisseJour').then((module) => ({ default: module.CaisseJour })));
const Caisse = lazy(() => import('./Caisse').then((module) => ({ default: module.Caisse })));
const Coffres = lazy(() => import('./Coffres').then((module) => ({ default: module.Coffres })));
const Echeances = lazy(() => import('./Echeances').then((module) => ({ default: module.Echeances })));
const CreditsClients = lazy(() => import('./CreditsClients').then((module) => ({ default: module.CreditsClients })));
const Invoices = lazy(() => import('./Invoices').then((module) => ({ default: module.Invoices })));
const Paie = lazy(() => import('./Paie').then((module) => ({ default: module.Paie })));
const Ventes = lazy(() => import('./Ventes').then((module) => ({ default: module.Ventes })));
const Orders = lazy(() => import('./Orders').then((module) => ({ default: module.Orders })));
const FileCaissier = lazy(() => import('./FileCaissier').then((module) => ({ default: module.FileCaissier })));
const Proformas = lazy(() => import('./Proformas').then((module) => ({ default: module.Proformas })));
const Employes = lazy(() => import('./Employes').then((module) => ({ default: module.Employes })));
const AdminAccounts = lazy(() => import('./AdminAccounts').then((module) => ({ default: module.AdminAccounts })));
const Roles = lazy(() => import('./Roles').then((module) => ({ default: module.Roles })));
const AppSettings = lazy(() => import('./Settings').then((module) => ({ default: module.Settings })));

const WorkspaceLoading = () => (
  <div className="space-y-4 py-4" aria-label="Chargement de la rubrique">
    <div className="skeleton h-9 w-64" />
    <div className="skeleton h-14 w-full" />
    <div className="skeleton h-72 w-full" />
  </div>
);

const load = (content: ReactNode) => <Suspense fallback={<WorkspaceLoading />}>{content}</Suspense>;

const TopAction = ({ to, children, primary = false }: { to: string; children: ReactNode; primary?: boolean }) => (
  <Link
    to={to}
    className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold shadow-sm ${primary ? 'bg-primary text-white hover:bg-primary/90' : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/30 hover:text-primary'}`}
  >
    {children}
  </Link>
);

const StockTriage = () => {
  const { admin } = useAdminAuth();
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-[#0B1636]">Commencez par les ruptures et seuils critiques</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Vérifiez la disponibilité, préparez l’achat, puis suivez la réception depuis ce même espace.</p>
        </div>
        {admin?.role === 'SUPER_ADMIN' && <TopAction to="/commandes-fournisseur">Bons fournisseurs</TopAction>}
      </div>
      {load(<StockAlerts />)}
    </div>
  );
};

export const StockPurchasingWorkspace = () => {
  const tabs: WorkspaceTab[] = [
    { id: 'a-traiter', label: 'À traiter', icon: PackageSearch, content: <StockTriage /> },
    { id: 'produits', label: 'Produits', icon: Package, content: load(<Produits />) },
    { id: 'inventaires', label: 'Inventaires', icon: ClipboardList, content: load(<Inventaire />) },
    { id: 'achats', label: 'Achats', icon: Truck, content: load(<Achats />) },
    { id: 'fournisseurs', label: 'Fournisseurs', icon: Building2, content: load(<Fournisseurs />) },
  ];
  return (
    <WorkspaceTabs
      eyebrow="Administration boutique"
      title="Stock & achats"
      description="Un parcours continu, de l’alerte de rupture jusqu’à l’achat et au fournisseur, sans changer de section principale."
      tabs={tabs}
      actions={<><TopAction to="/stock">Mouvements de stock</TopAction><TopAction to="/achats" primary>Nouvel achat</TopAction></>}
    />
  );
};

export const FinanceWorkspace = () => {
  const tabs: WorkspaceTab[] = [
    { id: 'caisse-jour', label: 'Caisse du jour', icon: WalletCards, content: load(<CaisseJour />) },
    { id: 'caisse-globale', label: 'Caisse globale', icon: Landmark, content: load(<Caisse />) },
    { id: 'coffres', label: 'Coffres', icon: Store, content: load(<Coffres />) },
    { id: 'echeances', label: 'Échéances', icon: AlarmClock, content: load(<Echeances />) },
    { id: 'credits', label: 'Crédits clients', icon: Users, content: load(<CreditsClients />) },
    { id: 'factures', label: 'Factures', icon: FileText, content: load(<Invoices />) },
    { id: 'paie', label: 'Paie', icon: Banknote, content: load(<Paie />) },
  ];
  return (
    <WorkspaceTabs
      eyebrow="Superadministrateur · contrôle financier"
      title="Finance"
      description="Trésorerie, caisse, crédits et engagements sont rassemblés pour contrôler avant d’agir."
      tabs={tabs}
      actions={<TopAction to="/analyses">Voir les analyses</TopAction>}
    />
  );
};

export const SalesOrdersWorkspace = () => {
  const tabs: WorkspaceTab[] = [
    { id: 'ventes', label: 'Ventes', icon: ReceiptText, content: load(<Ventes />) },
    { id: 'commandes', label: 'Commandes web', icon: ShoppingCart, content: load(<Orders />) },
    { id: 'encaissements', label: 'À encaisser', icon: WalletCards, content: load(<FileCaissier />) },
    { id: 'factures', label: 'Factures', icon: FileText, content: load(<Invoices />) },
    { id: 'proformas', label: 'Proformas', icon: ClipboardList, content: load(<Proformas />) },
  ];
  return (
    <WorkspaceTabs
      eyebrow="Administrateur · cycle de vente"
      title="Ventes & commandes"
      description="Suivez la vente, les commandes en ligne, l’encaissement et les documents commerciaux dans un seul parcours."
      tabs={tabs}
      actions={<TopAction to="/pos" primary>Nouvelle vente</TopAction>}
    />
  );
};

export const CashWorkspace = () => {
  const tabs: WorkspaceTab[] = [
    { id: 'caisse-jour', label: 'Caisse du jour', icon: WalletCards, content: load(<CaisseJour />) },
    { id: 'encaisser', label: 'À encaisser', icon: ReceiptText, content: load(<FileCaissier />) },
    { id: 'mouvements', label: 'Mouvements', icon: Landmark, content: load(<Caisse />) },
    { id: 'coffres', label: 'Coffres', icon: Store, content: load(<Coffres />) },
    { id: 'echeances', label: 'Échéances', icon: AlarmClock, content: load(<Echeances />) },
  ];
  return (
    <WorkspaceTabs
      eyebrow="Administrateur · opérations de caisse"
      title="Caisse"
      description="Ouvrez la session, encaissez, contrôlez les mouvements puis clôturez sans perdre le fil."
      tabs={tabs}
      actions={<TopAction to="/file-caissier" primary>Ouvrir l’encaissement</TopAction>}
    />
  );
};

export const TeamAccessWorkspace = () => {
  const tabs: WorkspaceTab[] = [
    { id: 'equipe', label: 'Équipe', icon: Users, content: load(<Employes />) },
    { id: 'comptes', label: 'Comptes', icon: UserCog, content: load(<AdminAccounts />) },
    { id: 'roles', label: 'Rôles & droits', icon: ShieldCheck, content: load(<Roles />) },
    { id: 'parametres', label: 'Paramètres', icon: Settings, content: load(<AppSettings />) },
  ];
  return (
    <WorkspaceTabs
      eyebrow="Superadministrateur · gouvernance"
      title="Équipe & accès"
      description="Gérez les personnes, les comptes et les responsabilités depuis un espace réservé au superadministrateur."
      tabs={tabs}
    />
  );
};
