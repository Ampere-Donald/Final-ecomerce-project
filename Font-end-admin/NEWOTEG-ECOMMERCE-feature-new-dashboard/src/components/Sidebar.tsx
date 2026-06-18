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
  Palette,
  UserCog,
  Bell,
  AlertTriangle,
  ShoppingBag,
  ListChecks,
  Receipt,
  PiggyBank,
  Calculator,
  Award,
  ClipboardList,
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
        ...add(can.accessCredits(role), { label: 'Crédits clients', icon: HandCoins, path: '/credits' }),
        ...add(can.accessEcheances(role), { label: 'Échéances', icon: AlarmClock, path: '/echeances' }),
        ...add(can.accessCmup(role), { label: 'CMUP & Valorisation', icon: Calculator, path: '/cmup' }),
      ],
    },
    {
      label: 'Boutique',
      items: [
        ...add(can.accessPOSVendeur(role), { label: 'Vente en cours', icon: ShoppingBag, path: '/pos' }),
        ...add(can.accessMesTickets(role), { label: 'Mes tickets', icon: Receipt, path: '/mes-tickets' }),
        ...add(can.accessFileCaissier(role), { label: "File d'attente", icon: ListChecks, path: '/file-caissier' }),
        ...add(can.voirFactures(role), { label: 'Factures', icon: Receipt, path: '/invoices' }),
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
        ...add(can.modifierProduits(role), { label: 'Catégories', icon: Tags, path: '/categories' }),
        ...add(can.modifierProduits(role), { label: 'Attributs', icon: Palette, path: '/attributs' }),
        ...add(can.accessStock(role), { label: 'Mouvements stock', icon: Activity, path: '/stock' }),
        ...add(can.accessInventaire(role), { label: 'Inventaire', icon: ClipboardList, path: '/inventaire' }),
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
      <span className="flex-1">{item.label}</span>
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
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-primary leading-tight">{brand.companyName}</h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{brand.branchName}</p>
        </div>
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
            onClick={() => {
              if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) logout();
            }}
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

