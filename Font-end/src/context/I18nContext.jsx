/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import fr from '../i18n/fr';
import en from '../i18n/en';

const translations = { fr, en };

const I18nContext = createContext();

function preferredLanguage() {
  try {
    const savedLang = localStorage.getItem('appLang');
    if (savedLang === 'fr' || savedLang === 'en') return savedLang;
  } catch { /* Browser storage may be unavailable. */ }
  const browserLang = typeof navigator === 'undefined' ? 'fr' : navigator.language || navigator.userLanguage || 'fr';
  return browserLang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const I18nProvider = ({ children, initialLanguage }) => {
  const [lang, setLangState] = useState(() => {
    return initialLanguage || preferredLanguage();
  });

  useEffect(() => {
    let active = true;
    if (initialLanguage) Promise.resolve().then(() => {
      if (active) setLangState(preferredLanguage());
    });
    return () => { active = false; };
  }, [initialLanguage]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (newLang) => {
    setLangState(newLang);
    try { localStorage.setItem('appLang', newLang); }
    catch { /* Language can still change for this visit. */ }
  };

  const t = (key, variables = {}) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) {
      if (val === undefined) break;
      val = val[k];
    }
    
    // Fallback to English if key missing in French, then fallback to key itself
    if (val === undefined && lang !== 'en') {
        val = translations['en'];
        for (const k of keys) {
            if (val === undefined) break;
            val = val[k];
        }
    }

    if (val === undefined) return key;

    // Handle string interpolation
    if (typeof val === 'string' && Object.keys(variables).length > 0) {
      return val.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, p1) => {
        return variables[p1] !== undefined ? variables[p1] : match;
      });
    }
    return val;
  };

  const toggleLang = () => setLang(lang === 'fr' ? 'en' : 'fr');

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
