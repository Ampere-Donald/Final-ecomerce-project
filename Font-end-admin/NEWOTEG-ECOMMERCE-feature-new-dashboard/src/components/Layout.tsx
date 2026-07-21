import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import { AdminMobileNav, hasMobileNavigation } from './AdminMobileNav';
import { useAdminAuth } from '../context/AdminAuthContext';
import { FlowShellProvider, useFlowShell } from '../context/FlowShellContext';

const LayoutFrame = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin } = useAdminAuth();
  const { focused } = useFlowShell();
  const location = useLocation();
  const hasRoleMobileNav = hasMobileNavigation(admin?.role);
  const isPosRoute = location.pathname === '/pos' || location.pathname === '/file-caissier';

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Overlay mobile pour fermer la sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex h-screen flex-1 flex-col min-w-0 overflow-hidden">
        <div className={isPosRoute ? 'min-[1200px]:block hidden' : 'block'}>
          <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />
        </div>
        <div className={isPosRoute ? 'min-[1200px]:block hidden' : 'block'}>
          <OfflineSyncStatus />
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto ${isPosRoute ? 'p-0 md:p-3 min-[1200px]:p-8' : 'px-3 py-4 sm:px-5 md:p-6 min-[1200px]:p-8'} ${hasRoleMobileNav && !focused ? 'pb-24 md:pb-6 min-[1200px]:pb-8' : ''}`}>
          <div className={isPosRoute ? 'mx-auto max-w-[1680px]' : 'mx-auto max-w-7xl'}>
            <Outlet />
          </div>
        </div>
      </main>
      <AdminMobileNav hidden={focused} onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
};

export const Layout = () => (
  <FlowShellProvider>
    <LayoutFrame />
  </FlowShellProvider>
);
