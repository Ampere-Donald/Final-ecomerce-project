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
  Settings,
  LifeBuoy,
  LogOut,
  Package2,
  ClipboardList,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const catalogueItems = [
  { label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
  { label: 'Produits', icon: Package, path: '/produits' },
  { label: 'Catégories', icon: Tags, path: '/categories' },
];

const operationItems = [
  { label: 'Commandes', icon: ClipboardList, path: '/orders' },
  { label: 'Mouvements Stock', icon: Activity, path: '/stock' },
  { label: 'Ventes', icon: ShoppingCart, path: '/ventes' },
  { label: 'Achats (Réappro)', icon: Truck, path: '/achats' },
];

const tiersItems = [
  { label: 'Clients', icon: Users, path: '/clients' },
  { label: 'Fournisseurs', icon: Factory, path: '/fournisseurs' },
];

const financeItems = [
  { label: 'Caisse', icon: Wallet, path: '/caisse' },
];

const secondaryItems = [
  { label: 'Paramètres', icon: Settings, path: '/settings' },
  { label: 'Support', icon: LifeBuoy, path: '/support' },
];

export const Sidebar = ({ open, onClose }: SidebarProps) => {
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
            {catalogueItems.map((item) => (
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
            ))}
          </div>
        </div>

        {/* OPERATIONS */}
        <div>
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Opérations</p>
          <div className="space-y-1">
            {operationItems.map((item) => (
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
            ))}
          </div>
        </div>

        {/* TIERS & FINANCE */}
        <div>
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tiers & Finance</p>
          <div className="space-y-1">
            {[...tiersItems, ...financeItems].map((item) => (
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
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-1">
          {secondaryItems.map((item) => (
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
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Jean Dupont</p>
            <p className="text-xs text-slate-500">VIP Member</p>
          </div>
          <button className="text-slate-400 hover:text-primary transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
