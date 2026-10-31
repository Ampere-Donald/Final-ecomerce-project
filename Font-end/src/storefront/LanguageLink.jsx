import { useLocation } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { hasEnglishRoute, languageDestination } from './localeRoutes.js';

export default function LanguageLink({ children }) {
  const { pathname, search, hash } = useLocation();
  const { lang } = useI18n();
  const target = lang === 'fr' ? 'en' : 'fr';
  const label = target === 'fr' ? 'Français' : hasEnglishRoute(pathname) ? 'English' : 'English homepage';
  return <a href={languageDestination(pathname, search, hash, target)} hrefLang={target} lang={target}>
    {children}{label}
  </a>;
}
