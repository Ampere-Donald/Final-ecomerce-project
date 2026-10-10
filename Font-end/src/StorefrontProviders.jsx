import { StrictMode } from 'react';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';

export default function StorefrontProviders({ children, initialLanguage, initialAnonymous = false }) {
  return <StrictMode><I18nProvider initialLanguage={initialLanguage}>
    <AuthProvider initialAnonymous={initialAnonymous}><CartProvider><FavoritesProvider>
      {children}
    </FavoritesProvider></CartProvider></AuthProvider>
  </I18nProvider></StrictMode>;
}
