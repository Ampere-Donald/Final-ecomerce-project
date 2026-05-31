import React from 'react';
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
  Settings,
  LogOut,
  X,
  Shield,
  Palette,
  UserCog,
  Bell,
  AlertTriangle,
  ShoppingBag,
  ListChecks,
  Receipt,
  PiggyBank,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type Item = { label: string; icon: any; path: string };
type Group = { label: string; items: Item[] };

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { admin, logout } = useAdminAuth();
  const role = admin?.role;

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
        ...add(can.accessCaisseJour(role), { label: 'Caisse du jour', icon: Wallet, path: '/caisse-jour' }),
        ...add(can.accessCaisseGlobale(role), { label: 'Caisse globale', icon: Landmark, path: '/caisse' }),
        ...add(can.accessCoffres(role), { label: 'Coffres', icon: PiggyBank, path: '/coffres' }),
        ...add(can.accessEcheances(role), { label: 'Échéances', icon: AlarmClock, path: '/echeances' }),
      ],
    },
    {
      label: 'Boutique',
      items: [
        ...add(can.accessPOSVendeur(role), { label: 'Vente en cours', icon: ShoppingBag, path: '/pos' }),
        ...add(can.accessMesTickets(role), { label: 'Mes tickets', icon: Receipt, path: '/mes-tickets' }),
        ...add(can.accessFileCaissier(role), { label: "File d'attente", icon: ListChecks, path: '/file-caissier' }),
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
        ...add(can.modifierProduits(role), { label: 'Catégories', icon: Tags, path: '/categories' }),
        ...add(can.modifierProduits(role), { label: 'Attributs', icon: Palette, path: '/attributs' }),
        ...add(can.accessStock(role), { label: 'Mouvements stock', icon: Activity, path: '/stock' }),
        ...add(can.accessStock(role), { label: 'Alertes stock', icon: AlertTriangle, path: '/stock-alerts' }),
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
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium ${
          isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
        }`
      }
    >
      <item.icon size={20} />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <aside className={`
      fixed md:sticky top-0 left-0 z-40 h-screen
      w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col
      transition-transform duration-300 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <button
          onClick={onClose}
          className="md:hidden absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
        <div className="w-10 h-10 flex items-center justify-center">
          <img src="/logo.png" alt="Newoteg" className="w-full h-full object-contain drop-shadow-sm" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-primary">NEWOTEG</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {visibleGroups.map((g) => (
          <div key={g.label}>
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {g.label}
            </p>
            <div className="space-y-1">{g.items.map(renderNavItem)}</div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{adminName}</p>
            <p className="text-xs text-slate-500">{role || 'Utilisateur'}</p>
          </div>
          <button
            onClick={logout}
            title="Se déconnecter"
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

