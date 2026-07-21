import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import { AdminMobileNav, hasMobileNavigation } from './AdminMobileNav';
import { useAdminAuth } from '../context/AdminAuthContext';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin } = useAdminAuth();
  const hasRoleMobileNav = hasMobileNavigation(admin?.role);

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
        <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />
        <OfflineSyncStatus />
        <div className={`min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 md:p-8 ${hasRoleMobileNav ? 'pb-24 md:pb-8' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
      <AdminMobileNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
};
