import { Suspense } from 'react';
import { renderToString } from 'react-dom/server.browser';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import StorefrontProviders from '../StorefrontProviders';
import InitialResources from './InitialResources';
import PageMetadataProvider from './PageMetadataProvider';
import StorefrontFrame from './StorefrontFrame';
import Catalogue from './Catalogue';

export function renderCatalogue(snapshot) {
  const output = renderToString(<StorefrontProviders initialLanguage="fr" initialAnonymous>
    <StaticRouter location={snapshot.url}><InitialResources snapshot={snapshot}><PageMetadataProvider>
      <StorefrontFrame path="/catalogue" initial><Suspense>
        <Routes><Route path="/catalogue" element={<Catalogue />} /></Routes>
      </Suspense></StorefrontFrame>
    </PageMetadataProvider></InitialResources></StaticRouter>
  </StorefrontProviders>);
  const start = output.indexOf('<div class="app">');
  if (start < 0 || output.includes('<!--$!-->')) throw Error('Catalogue render failed');
  return output.slice(start);
}
