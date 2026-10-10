import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import StorefrontProviders from '../StorefrontProviders';
import App from '../App';
import Home from './Home';

export function renderHome() {
  const output = renderToString(<StorefrontProviders initialLanguage="fr" initialAnonymous>
    <App router={StaticRouter} initialHome={Home} />
  </StorefrontProviders>);
  // React hoists metadata and image hints before the application. The document
  // metadata owner already provides those tags; only the app belongs in #root.
  const start = output.indexOf('<div class="app">');
  if (start < 0) throw new Error('Public home render did not produce the application');
  return output.slice(start);
}
