import React, { useEffect, useRef, useState } from 'react';
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
  Search,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { brand } from '../config/brand';
import { can } from '../utils/permissions';
import { bonVenteApi } from '../services/api';
import { useCataloguePricing } from '../context/CataloguePricingContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  compact?: boolean;
}

type Item = { label: string; icon: any; path: string };
type Group = { label: string; items: Item[] };

export const Sidebar = ({ open, onClose, compact = false }: SidebarProps) => {
  const { admin, logout } = useAdminAuth();
  const role = admin?.role;
  const [pendingCount, setPendingCount] = useState(0);
  const [navigationQuery, setNavigationQuery] = useState('');
  const { summary } = useCataloguePricing();
  const asideRef = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.('(max-width: 767px)').matches ?? false,
  );
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 767px)');
    if (!media) return;
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!mobile || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    asideRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const elements = [
        ...(asideRef.current?.querySelectorAll<HTMLElement>('a,button,input') ||
          []),
      ].filter((element) => !element.hasAttribute('disabled'));
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previous?.focus();
    };
  }, [mobile, open, onClose]);

  // Badge "Mes tickets" : nombre de bons EN_ATTENTE du vendeur
  useEffect(() => {
    if (role !== 'VENDEUR') return;
    const load = () =>
      bonVenteApi
        .mesBons()
        .then((bons: any[]) =>
          setPendingCount(
            bons.filter((b: any) => b.statut === 'EN_ATTENTE').length,
          ),
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
        ...add(can.accessDashboard(role), {
          label: 'Tableau de bord',
          icon: LayoutDashboard,
          path: '/',
        }),
        ...add(can.accessAnalyses(role), {
          label: 'Analyses',
          icon: BarChart3,
          path: '/analyses',
        }),
        ...add(can.accessNotificationsPage(role), {
          label: 'Notifications',
          icon: Bell,
          path: '/notifications',
        }),
        ...add(role === 'SUPER_ADMIN', {
          label: 'Validations',
          icon: Shield,
          path: '/a-valider',
        }),
      ],
    },
    {
      label: 'Finance',
      items: [
        ...add(can.accessCaisseJour(role), {
          label: role === 'CAISSIER' ? 'Session de caisse' : 'Caisse du jour',
          icon: Wallet,
          path: '/caisse-jour',
        }),
        ...add(can.accessCaisseGlobale(role), {
          label: 'Caisse globale',
          icon: Landmark,
          path: '/caisse',
        }),
        ...add(can.accessCoffres(role), {
          label: 'Coffres',
          icon: PiggyBank,
          path: '/coffres',
        }),
        ...add(can.accessPaie(role), {
          label: 'Paie',
          icon: Banknote,
          path: '/paie',
        }),
        ...add(can.accessCredits(role), {
          label: 'Crédits clients',
          icon: HandCoins,
          path: '/credits',
        }),
        ...add(can.accessEcheances(role), {
          label: 'Échéances',
          icon: AlarmClock,
          path: '/echeances',
        }),
        ...add(can.accessCmup(role), {
          label: 'CMUP & Valorisation',
          icon: Calculator,
          path: '/cmup',
        }),
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
        ...add(can.accessPOSVendeur(role), {
          label: 'Vente en cours',
          icon: ShoppingBag,
          path: '/pos',
        }),
        ...add(can.accessTicketsJour(role), {
          label: 'Ventes',
          icon: Receipt,
          path: '/ventes',
        }),
        ...add(can.accessMesTickets(role), {
          label: 'Mes tickets',
          icon: Receipt,
          path: '/mes-tickets',
        }),
        ...add(can.voirProformas(role), {
          label: 'Devis et proformas',
          icon: BookOpen,
          path: '/proformas',
        }),
        ...add(can.voirFactures(role), {
          label: 'Factures',
          icon: Receipt,
          path: '/invoices',
        }),
        ...add(can.voirPrimes(role), {
          label: 'Primes vendeurs',
          icon: Award,
          path: '/primes',
        }),
      ],
    },
    {
      label: 'E-commerce',
      items: [
        ...add(can.accessCommandesEnLigne(role), {
          label: 'Commandes en ligne',
          icon: Globe,
          path: '/orders',
        }),
        ...add(['SUPER_ADMIN', 'ADMIN', 'VENDEUR'].includes(role || ''), {
          label: 'Devis en ligne',
          icon: BookOpen,
          path: '/demandes-devis',
        }),
        ...add(['SUPER_ADMIN', 'ADMIN'].includes(role || ''), {
          label: 'Avis clients',
          icon: BookOpen,
          path: '/avis',
        }),
      ],
    },
    {
      label: 'Catalogue',
      items: [
        ...add(can.renseignerPrixManquants(role), {
          label: 'Prix à renseigner',
          icon: Tags,
          path: '/prix-a-renseigner',
        }),
        ...add(can.voirProduits(role), {
          label: 'Produits',
          icon: Package,
          path: '/produits',
        }),
        ...add(can.accessScanCode(role), {
          label: 'Scanner un produit',
          icon: ScanBarcode,
          path: '/scan-code',
        }),
        ...add(can.modifierProduits(role), {
          label: 'Catégories',
          icon: Tags,
          path: '/categories',
        }),
        ...add(can.accessStock(role), {
          label: 'Mouvements stock',
          icon: Activity,
          path: '/stock',
        }),
        ...add(can.accessInventaire(role), {
          label: 'Inventaire',
          icon: ClipboardList,
          path: '/inventaire',
        }),
        ...add(can.accessStock(role), {
          label: 'Alertes stock',
          icon: AlertTriangle,
          path: '/stock-alerts',
        }),
        ...add(can.accessCommandeFournisseur(role), {
          label: 'Bons de commande',
          icon: ShoppingBag,
          path: '/commandes-fournisseur',
        }),
        ...add(can.accessAchats(role), {
          label: 'Achats (Réappro)',
          icon: Truck,
          path: '/achats',
        }),
      ],
    },
    {
      label: 'Relation',
      items: [
        ...add(can.accessClients(role), {
          label: 'Clients',
          icon: Users,
          path: '/clients',
        }),
        ...add(can.accessFournisseurs(role), {
          label: 'Fournisseurs',
          icon: Factory,
          path: '/fournisseurs',
        }),
        ...add(can.accessEmployes(role), {
          label: 'Employés',
          icon: UserCog,
          path: '/employes',
        }),
        ...add(can.accessRoles(role), {
          label: 'Rôles',
          icon: Shield,
          path: '/roles',
        }),
        ...add(can.accessAccounts(role), {
          label: 'Comptes et accès',
          icon: UserCog,
          path: '/comptes',
        }),
      ],
    },
    {
      label: 'Système',
      items: [
        ...add(['SUPER_ADMIN', 'ADMIN'].includes(role || ''), {
          label: 'Cas de remplacement',
          icon: ClipboardList,
          path: '/cas-remplacement',
        }),
        ...add(['SUPER_ADMIN', 'ADMIN'].includes(role || ''), {
          label: 'Incompatibilités',
          icon: AlertTriangle,
          path: '/incompatibilites',
        }),
        ...add(['SUPER_ADMIN', 'ADMIN'].includes(role || ''), {
          label: 'Parcours du site',
          icon: BarChart3,
          path: '/parcours',
        }),
        ...add(['SUPER_ADMIN', 'ADMIN'].includes(role || ''), {
          label: 'Projets boutique',
          icon: ClipboardList,
          path: '/projets',
        }),
        ...add(can.accessPrintAudit(role), {
          label: 'Journal impressions',
          icon: History,
          path: '/print-audit',
        }),
        ...add(Boolean(role), {
          label: 'Opérations hors ligne',
          icon: CloudOff,
          path: '/offline-queue',
        }),
        ...add(can.accessGuide(role), {
          label: 'Guide utilisateur',
          icon: BookOpen,
          path: '/guide',
        }),
        ...add(can.accessParametres(role), {
          label: 'Paramètres',
          icon: Settings,
          path: '/settings',
        }),
      ],
    },
  ];

  const normalizedQuery = navigationQuery.trim().toLocaleLowerCase('fr');
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !normalizedQuery ||
          `${group.label} ${item.label}`
            .toLocaleLowerCase('fr')
            .includes(normalizedQuery),
      ),
    }))
    .filter((group) => group.items.length);
  const compactPaths = [
    '/file-caissier',
    '/caisse-jour',
    '/prix-a-renseigner',
    '/clients',
    '/print-audit',
    '/guide',
    '/settings',
  ];
  const compactItems = groups
    .flatMap((group) => group.items)
    .filter((item) => compactPaths.includes(item.path));
  const roleLabel =
    (
      {
        SUPER_ADMIN: 'Propriétaire',
        ADMIN: 'Administrateur',
        CAISSIER: 'Caissier',
        VENDEUR: 'Vendeur',
        MANAGER: 'Responsable',
      } as Record<string, string>
    )[role || ''] || 'Équipe boutique';

  const renderNavItem = (item: Item, rail = false) => (
    <NavLink
      key={item.path}
      to={item.path}
      title={rail ? item.label : undefined}
      aria-label={rail ? item.label : undefined}
      end={item.path === '/'}
      onClick={() => {
        onClose();
        setNavigationQuery('');
      }}
      className={({ isActive }) =>
        `workspace-nav-link ${rail ? 'flex-col justify-center px-1 text-center text-[10px]' : ''} ${isActive ? 'is-active' : ''}`
      }
    >
      <item.icon size={18} strokeWidth={1.8} />
      <span className={rail ? 'sr-only' : 'min-w-0 flex-1'}>{item.label}</span>
      {item.path === '/prix-a-renseigner' &&
        summary &&
        summary.missingCount > 0 &&
        !rail && (
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            {summary.missingCount.toLocaleString('fr-FR')}
          </span>
        )}
      {item.path === '/pos' && pendingCount > 0 && (
        <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-bold text-amber-800">
          {pendingCount}
        </span>
      )}
    </NavLink>
  );

  return (
    <aside
      ref={asideRef}
      inert={mobile && !open}
      aria-hidden={mobile && !open ? true : undefined}
      aria-label="Menu de la boutique"
      className={`workspace-sidebar fixed left-0 top-0 z-40 flex h-[100dvh] w-[272px] shrink-0 flex-col border-r bg-white transition-transform duration-200 md:sticky ${compact ? 'md:w-20' : 'md:w-[248px] min-[1440px]:w-[264px]'} ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      <div
        className={`relative flex min-h-[76px] shrink-0 items-center gap-3 border-b border-slate-100 px-5 ${compact ? 'md:justify-center md:px-2' : ''}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 md:hidden"
        >
          <X size={18} />
        </button>
        <img
          src="/logo.png"
          alt="Newoteg"
          className="h-10 w-10 shrink-0 object-contain"
        />
        <div className={`min-w-0 ${compact ? 'md:hidden' : ''}`}>
          <p className="font-display text-lg font-bold tracking-tight text-slate-950">
            {brand.companyName}
          </p>
          <p className="mt-0.5 text-[10px] font-medium tracking-[0.12em] text-slate-400">
            ESPACE BOUTIQUE
          </p>
        </div>
      </div>
      <div className={`px-4 pb-2 pt-4 ${compact ? 'md:hidden' : ''}`}>
        <label className="relative block">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            aria-label="Trouver une rubrique"
            placeholder="Trouver une rubrique…"
            value={navigationQuery}
            onChange={(event) => setNavigationQuery(event.target.value)}
            className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs placeholder:text-slate-400"
          />
        </label>
      </div>
      <nav
        aria-label="Navigation principale"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]"
      >
        {compact && (
          <div className="hidden space-y-3 md:block">
            {compactItems.map((item) => renderNavItem(item, true))}
          </div>
        )}
        <div className={`space-y-6 ${compact ? 'md:hidden' : ''}`}>
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="workspace-nav-label">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => renderNavItem(item))}
              </div>
            </div>
          ))}
          {visibleGroups.length === 0 && (
            <p className="px-3 text-xs leading-relaxed text-slate-500">
              Aucune rubrique. Essayez un autre mot.
            </p>
          )}
        </div>
      </nav>
      <div className="shrink-0 border-t border-slate-100 p-3">
        <div
          className={`flex items-center gap-2.5 rounded-xl bg-slate-50 p-2 ${compact ? 'md:flex-col' : ''}`}
        >
          {admin?.photoUrl ? (
            <img
              src={admin.photoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-primary">
              {initials}
            </div>
          )}
          <div className={`min-w-0 flex-1 ${compact ? 'md:hidden' : ''}`}>
            <p className="truncate text-xs font-semibold text-slate-800">
              {adminName}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{roleLabel}</p>
          </div>
          <button
            type="button"
            title="Se déconnecter"
            aria-label="Se déconnecter"
            onClick={() => {
              if (window.confirm('Voulez-vous vraiment vous déconnecter ?'))
                logout();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
};
