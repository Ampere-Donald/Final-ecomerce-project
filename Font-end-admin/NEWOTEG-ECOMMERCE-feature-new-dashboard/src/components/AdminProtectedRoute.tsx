import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminLogin } from './AdminLogin';
import { Loader2 } from 'lucide-react';

export const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return <>{children}</>;
};
