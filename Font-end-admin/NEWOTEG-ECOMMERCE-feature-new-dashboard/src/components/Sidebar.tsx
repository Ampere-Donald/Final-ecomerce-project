import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Layers,
  Activity,
  ShoppingCart,
  Truck,
  Users,
  Factory,
  Wallet,
  Landmark,
  Settings,
  LifeBuoy,
  LogOut,
  Package2,
  ClipboardList,
  X,
  Shield,
  Palette,
  UserCog,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { admin, logout } = useAdminAuth();
  const role = admin?.role;

  const adminName = admin?.nom || admin?.email || 'Admin';
  const initials = adminName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const catalogueItems = [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
    { label: 'Produits', icon: Package, path: '/produits' },
    { label: 'Catégories', icon: Tags, path: '/categories' },
    { label: 'Attributs', icon: Palette, path: '/attributs' },
  ];

  const operationItems = [
    { label: 'Commandes', icon: ClipboardList, path: '/orders' },
    { label: 'Mouvements Stock', icon: Activity, path: '/stock' },
    { label: 'Ventes', icon: ShoppingCart, path: '/ventes' },
    { label: 'Achats (Réappro)', icon: Truck, path: '/achats' },
    { label: 'Alertes Stock', icon: AlertTriangle, path: '/stock-alerts' },
  ];

  const tiersItems = [
    { label: 'Clients', icon: Users, path: '/clients' },
    { label: 'Fournisseurs', icon: Factory, path: '/fournisseurs' },
  ];

  // Finance items - filtered by role
  const financeItems = [
    ...(can.accessCaisse(role) ? [{ label: 'Caisse', icon: Wallet, path: '/caisse' }] : []),
    ...(can.accessCoffres(role) ? [{ label: 'Coffres', icon: Landmark, path: '/coffres' }] : []),
    ...(can.accessRoles(role) ? [{ label: 'Rôles', icon: Shield, path: '/roles' }] : []),
  ];

  // Admin-only items
  const adminItems = [
    ...(can.accessAccounts(role) ? [{ label: 'Comptes Admin', icon: UserCog, path: '/comptes' }] : []),
    ...(can.accessNotificationsPage(role) ? [{ label: 'Notifications', icon: Bell, path: '/notifications' }] : []),
  ];

  const secondaryItems = [
    { label: 'Paramètres', icon: Settings, path: '/settings' },
    { label: 'Support', icon: LifeBuoy, path: '/support' },
  ];

  const renderNavItems = (items: typeof catalogueItems) =>
    items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
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
    ));

  return (
    <aside className={`
      fixed md:sticky top-0 left-0 z-40 h-screen
      w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col
      transition-transform duration-300 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        {/* Bouton fermer visible uniquement sur mobile */}
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

        {/* CATALOGUE */}
        <div>
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Catalogue</p>
          <div className="space-y-1">
            {renderNavItems(catalogueItems)}
          </div>
        </div>

        {/* OPERATIONS */}
        <div>
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Opérations</p>
          <div className="space-y-1">
            {renderNavItems(operationItems)}
          </div>
        </div>

        {/* TIERS & FINANCE */}
        <div>
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tiers & Finance</p>
          <div className="space-y-1">
            {renderNavItems([...tiersItems, ...financeItems])}
          </div>
        </div>

        {/* ADMINISTRATION (SUPER_ADMIN only) */}
        {adminItems.length > 0 && (
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Administration</p>
            <div className="space-y-1">
              {renderNavItems(adminItems)}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 space-y-1">
          {renderNavItems(secondaryItems)}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{adminName}</p>
            <p className="text-xs text-slate-500">{admin?.role || 'Administrateur'}</p>
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
