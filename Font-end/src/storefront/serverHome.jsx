import { localizedPath } from './localePath.js';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import StorefrontProviders from '../StorefrontProviders';
import App from '../App';
import Home from './Home';

export function renderHome(lang = 'fr') {
  const output = renderToString(<StorefrontProviders initialLanguage={lang} initialAnonymous>
    <App router={StaticRouter} routerProps={{ location: localizedPath('/', lang) }} initialHome={Home} />
  </StorefrontProviders>);
  // React hoists metadata and image hints before the application. The document
  // metadata owner already provides those tags; only the app belongs in #root.
  const start = output.indexOf('<div class="app">');
  if (start < 0) throw new Error('Public home render did not produce the application');
  return output.slice(start);
}
