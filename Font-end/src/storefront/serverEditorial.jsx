import { Suspense } from 'react';
import { renderToString } from 'react-dom/server.browser';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import StorefrontProviders from '../StorefrontProviders';
import InitialResources from './InitialResources';
import PageMetadataProvider from './PageMetadataProvider';
import StorefrontFrame from './StorefrontFrame';
import TechnicalLibrary from './TechnicalLibrary';
import { isEditorialDocument } from './editorialRoutes.js';

// Static, reviewed content only. No API, visitor state, price or stock snapshot.
export function renderEditorialResponse(path) {
  if (!isEditorialDocument(path)) throw Error('Unknown published editorial path');
  const output = renderToString(<StorefrontProviders initialLanguage="fr" initialAnonymous>
    <StaticRouter location={path}><InitialResources><PageMetadataProvider>
      <StorefrontFrame path={path} initial><Suspense><Routes>
        <Route path="/guides" element={<TechnicalLibrary />} />
        <Route path="/guides/:slug" element={<TechnicalLibrary />} />
        <Route path="/remplacement" element={<TechnicalLibrary />} />
        <Route path="/remplacement/:slug" element={<TechnicalLibrary />} />
      </Routes></Suspense></StorefrontFrame>
    </PageMetadataProvider></InitialResources></StaticRouter>
  </StorefrontProviders>);
  const start = output.indexOf('<div class="app">');
  if (start < 0 || output.includes('<!--$!-->')) throw Error('Editorial render failed');
  return `<div id="root" data-initial-editorial="fr">${output.slice(start)}</div>`;
}
