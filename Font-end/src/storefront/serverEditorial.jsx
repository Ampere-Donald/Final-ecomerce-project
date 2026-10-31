import { basePath, pathLanguage, routerBasename } from './localePath.js';
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
  const lang = pathLanguage(path);
  if (!isEditorialDocument(path)) throw Error('Unknown published editorial path');
  const output = renderToString(<StorefrontProviders initialLanguage={lang} initialAnonymous>
    <StaticRouter location={path} basename={routerBasename(lang)}><InitialResources><PageMetadataProvider>
      <StorefrontFrame path={basePath(path)} initial><Suspense><Routes>
        <Route path="/guides" element={<TechnicalLibrary />} />
        <Route path="/guides/:slug" element={<TechnicalLibrary />} />
        <Route path="/remplacement" element={<TechnicalLibrary />} />
        <Route path="/remplacement/:slug" element={<TechnicalLibrary />} />
      </Routes></Suspense></StorefrontFrame>
    </PageMetadataProvider></InitialResources></StaticRouter>
  </StorefrontProviders>);
  const start = output.indexOf('<div class="app">');
  if (start < 0 || output.includes('<!--$!-->')) throw Error('Editorial render failed');
  return `<div id="root" data-initial-editorial="${lang}">${output.slice(start)}</div>`;
}
