import {
  BadgeCheck,
  Banknote,
  Boxes,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  ShoppingBasket,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

export type AdministrationRole = 'SUPER_ADMIN' | 'ADMIN';

export interface AdministrationNavItem {
  label: string;
  shortLabel?: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

export const administrationNavigation: Record<AdministrationRole, AdministrationNavItem[]> = {
  SUPER_ADMIN: [
    { label: "Vue d'ensemble", shortLabel: 'Vue globale', path: '/', icon: LayoutDashboard, end: true },
    { label: 'À valider', path: '/a-valider', icon: BadgeCheck },
    { label: 'Finance', path: '/finance', icon: Banknote },
    { label: 'Stock & achats', shortLabel: 'Stock', path: '/stock-achats', icon: Boxes },
    { label: 'Équipe & accès', shortLabel: 'Équipe', path: '/equipe-acces', icon: ShieldCheck },
  ],
  ADMIN: [
    { label: "Aujourd'hui", path: '/', icon: LayoutDashboard, end: true },
    { label: 'Ventes & commandes', shortLabel: 'Ventes', path: '/ventes-commandes', icon: ReceiptText },
    { label: 'Stock & achats', shortLabel: 'Stock', path: '/stock-achats', icon: ShoppingBasket },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Caisse', path: '/caisse-admin', icon: WalletCards },
  ],
};

export const administrationCounterAction: Record<AdministrationRole, { label: string; path: string }> = {
  SUPER_ADMIN: { label: 'Passer en mode comptoir', path: '/pos' },
  ADMIN: { label: 'Ouvrir le comptoir', path: '/pos' },
};

export const isAdministrationRole = (role?: string | null): role is AdministrationRole =>
  role === 'SUPER_ADMIN' || role === 'ADMIN';

export const getAdministrationNavigation = (role?: string | null): AdministrationNavItem[] =>
  isAdministrationRole(role) ? administrationNavigation[role] : [];
