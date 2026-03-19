import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'newoteg_token';
const USER_KEY = 'newoteg_user';

function initAuth() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => initAuth().token);
  const [user, setUser] = useState(() => initAuth().user);
  const [loading, setLoading] = useState(true);

  // Set default Authorization header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  // Try to restore session on mount
  useEffect(() => {
    const restore = async () => {
      const saved = initAuth();
      if (saved.token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${saved.token}`;
          const { data } = await axios.get(`${API}/auth/me`);
          setUser(data);
          setToken(saved.token);
        } catch {
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const login = useCallback(async (identifiant, motDePasse) => {
    const { data } = await axios.post(`${API}/auth/login`, { identifiant, motDePasse });
    setToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (formData) => {
    const { data } = await axios.post(`${API}/auth/signup`, formData);
    return data;
  }, []);

  const verifyOtp = useCallback(async (email, code) => {
    const { data } = await axios.post(`${API}/auth/verify-otp`, { email, code });
    return data;
  }, []);

  const resendOtp = useCallback(async (email) => {
    const { data } = await axios.post(`${API}/auth/resend-otp`, { email });
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    signup,
    verifyOtp,
    resendOtp,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
