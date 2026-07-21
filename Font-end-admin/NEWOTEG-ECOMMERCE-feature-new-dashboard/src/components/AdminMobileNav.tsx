import { NavLink } from 'react-router-dom';
import {
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  ShoppingCart,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminMobileNavProps {
  hidden?: boolean;
  onMenuClick: () => void;
}

interface MobileNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

const itemsByRole: Record<string, MobileNavItem[]> = {
  SUPER_ADMIN: [
    { label: 'Accueil', path: '/', icon: LayoutDashboard, end: true },
    { label: 'Ventes', path: '/ventes', icon: ReceiptText },
    { label: 'Produits', path: '/produits', icon: Package },
    { label: 'Clients', path: '/clients', icon: Users },
  ],
  ADMIN: [
    { label: 'Accueil', path: '/', icon: LayoutDashboard, end: true },
    { label: 'Ventes', path: '/ventes', icon: ReceiptText },
    { label: 'Produits', path: '/produits', icon: Package },
    { label: 'Clients', path: '/clients', icon: Users },
  ],
  CAISSIER: [
    { label: 'Accueil', path: '/', icon: LayoutDashboard, end: true },
    { label: 'Encaisser', path: '/file-caissier', icon: CircleDollarSign },
    { label: 'Caisse', path: '/caisse-jour', icon: WalletCards },
    { label: 'Factures', path: '/invoices', icon: FileText },
  ],
  VENDEUR: [
    { label: 'Accueil', path: '/', icon: LayoutDashboard, end: true },
    { label: 'Vendre', path: '/pos', icon: ShoppingCart },
    { label: 'Tickets', path: '/mes-tickets', icon: ReceiptText },
    { label: 'Produits', path: '/produits', icon: Package },
  ],
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Admin',
  ADMIN: 'Admin',
  CAISSIER: 'Caissier',
  VENDEUR: 'Vendeur',
};

export const hasMobileNavigation = (role?: string | null) => Boolean(role && itemsByRole[role]);

export const AdminMobileNav = ({ hidden = false, onMenuClick }: AdminMobileNavProps) => {
  const { admin } = useAdminAuth();
  const role = admin?.role || '';
  const items = itemsByRole[role];
  if (!items || hidden) return null;

  return (
    <nav
      aria-label={`Navigation ${roleLabels[role]} mobile`}
      className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-2 pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `relative flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                isActive ? 'text-primary' : 'text-slate-500 active:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-x-4 -top-1.5 h-0.5 rounded-full bg-primary" />}
                <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold text-slate-500 transition-colors active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Ouvrir toutes les rubriques"
        >
          <Menu size={19} />
          <span>Plus</span>
        </button>
      </div>
    </nav>
  );
};
