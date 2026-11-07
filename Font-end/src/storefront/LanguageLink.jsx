import useBrowserReady from './useBrowserReady.js';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { hasEnglishRoute, languageDestination } from './localeRoutes.js';

export default function LanguageLink({ children }) {
  const { pathname, search, hash } = useLocation();
  const { lang } = useI18n();
  // The server receives the path and query only, even on direct fragment visits.
  const hydrated = useBrowserReady();
  const target = lang === 'fr' ? 'en' : 'fr';
  const label = target === 'fr' ? 'Français' : hasEnglishRoute(pathname) ? 'English' : 'English homepage';
  return <a href={languageDestination(pathname, search, hydrated ? hash : '', target)} hrefLang={target} lang={target}>
    {children}{label}
  </a>;
}
