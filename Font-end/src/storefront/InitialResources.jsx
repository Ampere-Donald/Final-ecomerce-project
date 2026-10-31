import { useState } from 'react';
import { useLocation } from './LocaleRouter';
import { InitialResourceContext } from './initialResourceContext';
import { useI18n } from '../context/I18nContext';
import { localizedPath } from './localePath.js';

export default function InitialResources({ snapshot, children }) {
  const location = useLocation();
  const { lang } = useI18n();
  const key = localizedPath(location.pathname, lang) + location.search;
  const [active, setActive] = useState(Boolean(snapshot));
  // A later navigation, including browser Back, must fetch a fresh catalogue.
  if (active && snapshot.url !== key) setActive(false);
  return <InitialResourceContext.Provider value={active && snapshot.url === key ? snapshot : null}>
    {children}
  </InitialResourceContext.Provider>;
}
