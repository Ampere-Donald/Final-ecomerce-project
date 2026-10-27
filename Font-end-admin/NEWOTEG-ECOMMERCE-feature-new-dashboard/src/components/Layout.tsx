import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import { AdminMobileNav, hasMobileNavigation } from './AdminMobileNav';
import { useAdminAuth } from '../context/AdminAuthContext';
import { FlowShellProvider, useFlowShell } from '../context/FlowShellContext';
import { CashierDesktopTopBar } from '../features/cashier-pos/CashierDesktopShell';
import { AdminOperationsProvider } from '../context/AdminOperationsContext';
import { ShopHealthBar } from './ShopHealthBar';
import { WorkspaceScreen } from './WorkspaceScreen';
import { useWorkspaceViewport } from '../hooks/useWorkspaceViewport';
import { CataloguePricingProvider } from '../context/CataloguePricingContext';

const CASHIER_WORKSPACE_PATHS = ['/file-caissier', '/caisse-jour', '/clients', '/print-audit', '/guide', '/settings'];

const LayoutFrame = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const viewportRef = useWorkspaceViewport();
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const { admin } = useAdminAuth();
  const { focused } = useFlowShell();
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    closeSidebar();
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [location.pathname, closeSidebar]);
  const hasRoleMobileNav = hasMobileNavigation(admin?.role);
  const isCashierRoute = location.pathname === '/file-caissier';
  const isCashierRoleWorkspace = admin?.role === 'CAISSIER' && CASHIER_WORKSPACE_PATHS.includes(location.pathname);
  const isCashierSessionRoute = admin?.role === 'CAISSIER' && location.pathname === '/caisse-jour';
  const isCashierWorkspace = isCashierRoute || isCashierRoleWorkspace;
  const isGenericCashierWorkspace = isCashierRoleWorkspace && !isCashierRoute && !isCashierSessionRoute;
  const isPosRoute = location.pathname === '/pos' || isCashierWorkspace;

  return (
    <div ref={viewportRef} className={`admin-workspace workspace-viewport flex overflow-hidden bg-background-light ${isCashierWorkspace ? 'is-cashier-workspace' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} compact={isCashierWorkspace} />

      {/* Overlay mobile pour fermer la sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main inert={sidebarOpen ? true : undefined} className="flex h-full flex-1 flex-col min-w-0 overflow-hidden">
        <div className={`shrink-0 ${isCashierWorkspace ? 'hidden' : isPosRoute ? 'min-[1200px]:block hidden' : 'block'}`}>
          <Header menuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(prev => !prev)} />
          <ShopHealthBar />
        </div>
        <div className={`shrink-0 ${isCashierWorkspace ? 'hidden' : isPosRoute ? 'min-[1200px]:block hidden' : 'block'}`}>
          <OfflineSyncStatus />
        </div>
        {isGenericCashierWorkspace && <div className="hidden min-[1200px]:block"><CashierDesktopTopBar caisseStatus={undefined} /></div>}
        <div ref={contentRef} id="workspace-content" tabIndex={-1} className={`admin-content min-h-0 flex-1 overflow-y-auto ${isCashierRoute ? 'p-0' : isCashierSessionRoute ? 'px-3 py-4 sm:px-5 md:p-6 min-[1200px]:p-0' : isGenericCashierWorkspace ? 'px-3 py-4 sm:px-5 md:p-6 min-[1200px]:p-8' : isPosRoute ? 'p-0 md:p-3 min-[1200px]:p-8' : 'px-4 py-5 sm:px-6 md:p-7 min-[1200px]:p-9'} ${hasRoleMobileNav && !focused ? 'has-mobile-navigation lg:pb-6 min-[1200px]:pb-9' : ''}`}>
          <div className={isCashierRoute ? 'w-full' : isCashierSessionRoute ? 'mx-auto max-w-7xl min-[1200px]:h-full min-[1200px]:max-w-none' : isPosRoute ? 'mx-auto max-w-[1680px]' : 'mx-auto max-w-7xl'}>
            <WorkspaceScreen routeKey={location.pathname}><Outlet /></WorkspaceScreen>
          </div>
        </div>
      </main>
      <AdminMobileNav hidden={focused || sidebarOpen} onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
};

export const Layout = () => (
  <FlowShellProvider>
    <AdminOperationsProvider>
      <CataloguePricingProvider>
      <LayoutFrame />
      </CataloguePricingProvider>
    </AdminOperationsProvider>
  </FlowShellProvider>
);
