import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { InitialResourceContext } from './initialResourceContext';

export default function InitialResources({ snapshot, children }) {
  const location = useLocation();
  const key = location.pathname + location.search;
  const [active, setActive] = useState(Boolean(snapshot));
  // A later navigation, including browser Back, must fetch a fresh catalogue.
  if (active && snapshot.url !== key) setActive(false);
  return <InitialResourceContext.Provider value={active && snapshot.url === key ? snapshot : null}>
    {children}
  </InitialResourceContext.Provider>;
}
