import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthApi } from '../services/api';
import {
  clearAdminSession,
  getAdminToken,
  getStoredAdmin,
  storeAdminSession,
  updateStoredAdmin,
} from '../services/adminSession';

export interface AdminUser {
  id: string;
  nom: string;
  username: string;
  email?: string | null;
  role: string;
  photoUrl?: string | null;
  mustChangeCredential?: boolean;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AdminUser>;
  loginPin: (username: string, pin: string) => Promise<AdminUser>;
  refreshAdmin: () => Promise<AdminUser>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const OFFLINE_CACHE_NAME = 'newoteg-offline-data-v1';

// Vide le cache PWA de consultation hors-ligne pour éviter qu'un utilisateur
// suivant ne voie les données mises en cache pour le compte précédent
// (le service worker ne peut pas lire le token/l'identité, donc cette purge
// applicative est le seul point de contrôle).
const clearOfflineCache = () => {
  if (typeof caches !== 'undefined') {
    caches.delete(OFFLINE_CACHE_NAME).catch(() => {});
  }
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    return getStoredAdmin<AdminUser>();
  });
  const [loading, setLoading] = useState(true);

  // Validate stored token on mount
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    adminAuthApi.getMe()
      .then((data) => {
        setAdmin(data);
        updateStoredAdmin(data);
      })
      .catch(() => {
        clearAdminSession();
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await adminAuthApi.login(username, password);
    const authenticatedAdmin = data.admin as AdminUser;
    clearOfflineCache();
    storeAdminSession(data.access_token, authenticatedAdmin);
    setAdmin(authenticatedAdmin);
    return authenticatedAdmin;
  }, []);

  const loginPin = useCallback(async (username: string, pin: string) => {
    const data = await adminAuthApi.loginPin(username, pin);
    const authenticatedAdmin = data.admin as AdminUser;
    clearOfflineCache();
    storeAdminSession(data.access_token, authenticatedAdmin);
    setAdmin(authenticatedAdmin);
    return authenticatedAdmin;
  }, []);

  const refreshAdmin = useCallback(async () => {
    const refreshedAdmin = await adminAuthApi.getMe() as AdminUser;
    setAdmin(refreshedAdmin);
    updateStoredAdmin(refreshedAdmin);
    return refreshedAdmin;
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
    clearOfflineCache();
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, loginPin, refreshAdmin, logout, isAuthenticated: !!admin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
