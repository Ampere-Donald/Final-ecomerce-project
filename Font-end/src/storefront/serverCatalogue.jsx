import { basePath, pathLanguage, routerBasename } from './localePath.js';
import { Suspense } from 'react';
import { renderToString } from 'react-dom/server.browser';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import StorefrontProviders from '../StorefrontProviders';
import InitialResources from './InitialResources';
import PageMetadataProvider from './PageMetadataProvider';
import StorefrontFrame from './StorefrontFrame';
import Catalogue from './Catalogue';
import { seoFamilies, familyPath } from './seoFamilies.js';

export function renderCatalogue(snapshot) {
  const path = new URL(snapshot.url, 'https://newoteg.com').pathname, lang = pathLanguage(path);
  const output = renderToString(<StorefrontProviders initialLanguage={lang} initialAnonymous>
    <StaticRouter location={snapshot.url} basename={routerBasename(lang)}><InitialResources snapshot={snapshot}><PageMetadataProvider>
      <StorefrontFrame path={basePath(path)} initial><Suspense>
        <Routes><Route path="/catalogue" element={<Catalogue />} />
          {seoFamilies.map(family => <Route key={family.slug} path={familyPath(family)} element={<Catalogue />} />)}
        </Routes>
      </Suspense></StorefrontFrame>
    </PageMetadataProvider></InitialResources></StaticRouter>
  </StorefrontProviders>);
  const start = output.indexOf('<div class="app">');
  if (start < 0 || output.includes('<!--$!-->')) throw Error('Catalogue render failed');
  return output.slice(start);
}
