import React, { createContext, useState, useContext, useEffect } from 'react';
import fr from '../i18n/fr';
import en from '../i18n/en';

const translations = { fr, en };

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('appLang');
    if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
      setLangState(savedLang);
      document.documentElement.lang = savedLang;
    } else {
      const browserLang = navigator.language || navigator.userLanguage;
      const initialLang = browserLang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
      setLangState(initialLang);
      document.documentElement.lang = initialLang;
    }
  }, []);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem('appLang', newLang);
    document.documentElement.lang = newLang;
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
