import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { admin } = useAdminAuth();

  if (!admin?.role || !allowedRoles.includes(admin.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
