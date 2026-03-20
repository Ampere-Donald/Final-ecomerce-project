import React, { createContext, useState, useContext } from 'react';

const translations = {
  fr: {
    nav: { home: 'ACCUEIL', catalogue: 'CATALOGUE', about: 'À PROPOS', contact: 'CONTACT' },
    drawer: { home: 'Accueil', catalogue: 'Catalogue', about: 'À Propos', contact: 'Contact', cart: 'Panier', favorites: 'Favoris', profile: 'Mon Profil', login: 'Se Connecter', logout: 'Déconnexion' },
    mobileStrip: { home: 'Accueil', catalogue: 'Catalogue', about: 'À Propos', contact: 'Contact' },
    search: 'Rechercher un composant...',
    addToCart: 'Ajouter au panier',
    outOfStock: 'Indisponible',
    inStock: 'En stock',
    viewAll: 'Voir tout',
    footer: { rights: 'Tous droits réservés', terms: "Conditions d'utilisation", privacy: 'Politique de Confidentialité' },
  },
  en: {
    nav: { home: 'HOME', catalogue: 'CATALOGUE', about: 'ABOUT', contact: 'CONTACT' },
    drawer: { home: 'Home', catalogue: 'Catalogue', about: 'About', contact: 'Contact', cart: 'Cart', favorites: 'Favorites', profile: 'My Profile', login: 'Sign In', logout: 'Sign Out' },
    mobileStrip: { home: 'Home', catalogue: 'Catalogue', about: 'About', contact: 'Contact' },
    search: 'Search a component...',
    addToCart: 'Add to cart',
    outOfStock: 'Out of stock',
    inStock: 'In stock',
    viewAll: 'View all',
    footer: { rights: 'All rights reserved', terms: 'Terms of Use', privacy: 'Privacy Policy' },
  },
};

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState('fr');
  const t = (key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) {
      val = val?.[k];
    }
    return val || key;
  };
  const toggleLang = () => setLang(prev => prev === 'fr' ? 'en' : 'fr');
  return (
    <I18nContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
