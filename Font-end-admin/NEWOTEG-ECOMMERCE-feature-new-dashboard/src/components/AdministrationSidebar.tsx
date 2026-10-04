import { LogOut, Store, X, BookOpen, ClipboardList, ChartNoAxesCombined } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  administrationCounterAction,
  administrationNavigation,
  isAdministrationRole,
} from '../config/adminNavigation';
import { brand } from '../config/brand';

interface AdministrationSidebarProps {
  open: boolean;
  onClose: () => void;
}

export const AdministrationSidebar = ({ open, onClose }: AdministrationSidebarProps) => {
  const { admin, logout } = useAdminAuth();
  const role = admin?.role;
  if (!isAdministrationRole(role)) return null;

  const items = administrationNavigation[role];
  const counterAction = administrationCounterAction[role];
  const adminName = admin?.nom || admin?.username || 'Administrateur';
  const initials = adminName.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside
      aria-label={`Navigation ${role === 'SUPER_ADMIN' ? 'superadministrateur' : 'administrateur'}`}
      className={`fixed left-0 top-0 z-40 flex h-screen w-[17rem] shrink-0 flex-col border-r border-white/10 bg-[#0B1636] text-white transition-transform duration-300 md:sticky md:w-20 md:translate-x-0 min-[1200px]:w-[17rem] ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="relative flex min-h-[5.25rem] items-center gap-3 border-b border-white/10 px-5 md:justify-center md:px-2 min-[1200px]:justify-start min-[1200px]:px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="absolute right-3 top-3 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white md:hidden"
        >
          <X size={19} />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <img src="/logo.png" alt="Newoteg" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 md:hidden min-[1200px]:block">
          <p className="truncate font-display text-lg font-bold tracking-tight">{brand.companyName}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {role === 'SUPER_ADMIN' ? 'Pilotage boutique' : 'Opérations boutique'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5 md:px-2 min-[1200px]:px-3" aria-label="Destinations principales">
        {items.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            onClick={onClose}
            title={label}
            className={({ isActive }) =>
              `group relative flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors md:min-h-14 md:justify-center md:px-1 min-[1200px]:min-h-12 min-[1200px]:justify-start min-[1200px]:px-3 ${
                isActive
                  ? 'bg-white text-[#101D44] shadow-[0_8px_24px_rgba(0,0,0,0.16)]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`absolute -left-3 h-7 w-1 rounded-r-full bg-cyan-400 transition-opacity md:-left-2 min-[1200px]:-left-3 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} className="shrink-0" />
                <span className="truncate md:hidden min-[1200px]:block">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3 md:px-2 min-[1200px]:p-3">
        <NavLink to="/parcours" onClick={onClose} title="Parcours du site" className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
          <ChartNoAxesCombined size={19} /><span className="md:hidden min-[1200px]:inline">Parcours du site</span>
        </NavLink>
        <NavLink to="/projets" onClick={onClose} title="Projets boutique" className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
          <ClipboardList size={19} /><span className="md:hidden min-[1200px]:inline">Projets boutique</span>
        </NavLink>
        <NavLink to="/demandes-devis" onClick={onClose} title="Devis en ligne" className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
          <BookOpen size={19} /><span className="md:hidden min-[1200px]:inline">Devis en ligne</span>
        </NavLink>
        <NavLink
          to={counterAction.path}
          onClick={onClose}
          title={counterAction.label}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 text-sm font-bold text-cyan-100 transition-colors hover:bg-cyan-300 hover:text-[#0B1636]"
        >
          <Store size={19} />
          <span className="md:hidden min-[1200px]:inline">{counterAction.label}</span>
        </NavLink>

        <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-2 md:justify-center min-[1200px]:justify-start">
          {admin?.photoUrl ? (
            <img src={admin.photoUrl} alt={adminName} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-300 font-mono text-xs font-bold text-[#0B1636]">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1 md:hidden min-[1200px]:block">
            <p className="truncate text-xs font-bold text-white">{adminName}</p>
            <p className="truncate text-[10px] text-slate-400">{role === 'SUPER_ADMIN' ? 'Superadministrateur' : 'Administrateur'}</p>
          </div>
          <button
            type="button"
            aria-label="Se déconnecter"
            title="Se déconnecter"
            onClick={() => window.confirm('Voulez-vous vraiment vous déconnecter ?') && logout()}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-300 md:flex min-[1200px]:flex"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
};
