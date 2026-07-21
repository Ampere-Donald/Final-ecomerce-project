import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Tags,
  Activity,
  Globe,
  Truck,
  Users,
  Factory,
  Wallet,
  Landmark,
  AlarmClock,
  HandCoins,
  Settings,
  LogOut,
  X,
  Shield,
  UserCog,
  Bell,
  AlertTriangle,
  ShoppingBag,
  Receipt,
  PiggyBank,
  Calculator,
  Award,
  ClipboardList,
  Banknote,
  BookOpen,
  ScanBarcode,
  CloudOff,
  History,
  CreditCard,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { brand } from '../config/brand';
import { can } from '../utils/permissions';
import { bonVenteApi } from '../services/api';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type Item = { label: string; icon: any; path: string };
type Group = { label: string; items: Item[] };

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { admin, logout } = useAdminAuth();
  const role = admin?.role;
  const [pendingCount, setPendingCount] = useState(0);

  // Badge "Mes tickets" : nombre de bons EN_ATTENTE du vendeur
  useEffect(() => {
    if (role !== 'VENDEUR') return;
    const load = () =>
      bonVenteApi.mesBons()
        .then((bons: any[]) =>
          setPendingCount(bons.filter((b: any) => b.statut === 'EN_ATTENTE').length)
        )
        .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [role]);

  const adminName = admin?.nom || admin?.username || 'Admin';
  const initials = adminName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Helper: ajoute un item si la permission est vraie
  const add = (cond: boolean, item: Item): Item[] => (cond ? [item] : []);

  const groups: Group[] = [
    {
      label: 'Caisse',
      items: [
        ...add(role === 'CAISSIER' && can.accessFileCaissier(role), {
          label: 'Encaissement',
          icon: CreditCard,
          path: '/file-caissier',
        }),
      ],
    },
    {
      label: 'Pilotage',
      items: [
        ...add(can.accessDashboard(role), { label: 'Tableau de bord', icon: LayoutDashboard, path: '/' }),
        ...add(can.accessAnalyses(role), { label: 'Analyses', icon: BarChart3, path: '/analyses' }),
        ...add(can.accessNotificationsPage(role), { label: 'Notifications', icon: Bell, path: '/notifications' }),
      ],
    },
    {
      label: 'Finance',
      items: [
        ...add(can.accessCaisseJour(role), {
          label: role === 'CAISSIER' ? 'Ouverture / fermeture' : 'Caisse du jour',
          icon: Wallet,
          path: '/caisse-jour',
        }),
        ...add(can.accessCaisseGlobale(role), { label: 'Caisse globale', icon: Landmark, path: '/caisse' }),
        ...add(can.accessCoffres(role), { label: 'Coffres', icon: PiggyBank, path: '/coffres' }),
        ...add(can.accessPaie(role), { label: 'Paie', icon: Banknote, path: '/paie' }),
        ...add(can.accessCredits(role), { label: 'Crédits clients', icon: HandCoins, path: '/credits' }),
        ...add(can.accessEcheances(role), { label: 'Échéances', icon: AlarmClock, path: '/echeances' }),
        ...add(can.accessCmup(role), { label: 'CMUP & Valorisation', icon: Calculator, path: '/cmup' }),
      ],
    },
    {
      label: 'Boutique',
      items: [
        ...add(role !== 'CAISSIER' && can.accessFileCaissier(role), {
          label: 'Encaissement',
          icon: CreditCard,
          path: '/file-caissier',
        }),
        ...add(can.accessPOSVendeur(role), { label: 'Vente en cours', icon: ShoppingBag, path: '/pos' }),
        ...add(can.accessMesTickets(role), { label: 'Mes tickets', icon: Receipt, path: '/mes-tickets' }),
        ...add(can.voirPrimes(role), { label: 'Primes vendeurs', icon: Award, path: '/primes' }),
      ],
    },
    {
      label: 'E-commerce',
      items: [
        ...add(can.accessCommandesEnLigne(role), { label: 'Commandes en ligne', icon: Globe, path: '/orders' }),
      ],
    },
    {
      label: 'Catalogue',
      items: [
        ...add(can.voirProduits(role), { label: 'Produits', icon: Package, path: '/produits' }),
        ...add(can.accessScanCode(role), { label: 'Scanner un produit', icon: ScanBarcode, path: '/scan-code' }),
        ...add(can.modifierProduits(role), { label: 'Catégories', icon: Tags, path: '/categories' }),
        ...add(can.accessStock(role), { label: 'Mouvements stock', icon: Activity, path: '/stock' }),
        ...add(can.accessInventaire(role), { label: 'Inventaire', icon: ClipboardList, path: '/inventaire' }),
        ...add(can.accessStock(role), { label: 'Alertes stock', icon: AlertTriangle, path: '/stock-alerts' }),
        ...add(can.accessCommandeFournisseur(role), { label: 'Bons de commande', icon: ShoppingBag, path: '/commandes-fournisseur' }),
        ...add(can.accessAchats(role), { label: 'Achats (Réappro)', icon: Truck, path: '/achats' }),
      ],
    },
    {
      label: 'Relation',
      items: [
        ...add(can.accessClients(role), { label: 'Clients', icon: Users, path: '/clients' }),
        ...add(can.accessFournisseurs(role), { label: 'Fournisseurs', icon: Factory, path: '/fournisseurs' }),
        ...add(can.accessEmployes(role), { label: 'Employés', icon: UserCog, path: '/employes' }),
        ...add(can.accessRoles(role), { label: 'Rôles', icon: Shield, path: '/roles' }),
      ],
    },
    {
      label: 'Système',
      items: [
        ...add(can.accessPrintAudit(role), { label: 'Journal impressions', icon: History, path: '/print-audit' }),
        ...add(Boolean(role), { label: 'Opérations hors ligne', icon: CloudOff, path: '/offline-queue' }),
        ...add(can.accessGuide(role), { label: 'Guide utilisateur', icon: BookOpen, path: '/guide' }),
        ...add(can.accessParametres(role), { label: 'Paramètres', icon: Settings, path: '/settings' }),
      ],
    },
  ];

  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const renderNavItem = (item: Item) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/'}
      onClick={onClose}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium transition-colors md:min-h-14 md:flex-col md:justify-center md:gap-1 md:px-1 md:text-center md:text-[10px] min-[1200px]:min-h-11 min-[1200px]:flex-row min-[1200px]:justify-start min-[1200px]:gap-3 min-[1200px]:px-3 min-[1200px]:text-left min-[1200px]:text-base ${
          isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
        }`
      }
    >
      <item.icon size={20} />
      <span className="flex-1 md:flex-none min-[1200px]:flex-1">{item.label}</span>
      {item.path === '/pos' && pendingCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
          {pendingCount}
        </span>
      )}
    </NavLink>
  );

  return (
    <aside className={`
      fixed md:sticky top-0 left-0 z-40 h-screen
      w-64 md:w-20 min-[1200px]:w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col
      transition-transform duration-300 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <div className="flex items-center gap-3 border-b border-slate-100 p-6 md:justify-center md:p-3 min-[1200px]:justify-start min-[1200px]:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="md:hidden absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          <img src="/logo.png" alt="Newoteg" className="w-full h-full object-contain drop-shadow-sm" />
        </div>
        <div className="min-w-0 md:hidden min-[1200px]:block">
          <h1 className="text-xl font-bold tracking-tight text-primary leading-tight">{brand.companyName}</h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{brand.branchName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4 md:px-2 md:py-4 min-[1200px]:p-4">
        {visibleGroups.map((g) => (
          <div key={g.label}>
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 md:hidden min-[1200px]:block">
              {g.label}
            </p>
            <div className="space-y-1">{g.items.map(renderNavItem)}</div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4 md:p-2 min-[1200px]:p-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-2 md:justify-center min-[1200px]:justify-start">
          {admin?.photoUrl ? (
            <img
              src={admin.photoUrl}
              alt={adminName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1 md:hidden min-[1200px]:block">
            <p className="text-sm font-semibold truncate">{adminName}</p>
            <p className="text-xs text-slate-500">{role || 'Utilisateur'}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) logout();
            }}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="text-slate-400 transition-colors hover:text-red-500 md:hidden min-[1200px]:block"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

