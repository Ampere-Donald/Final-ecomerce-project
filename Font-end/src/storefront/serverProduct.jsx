import { basePath, pathLanguage, routerBasename } from './localePath.js';
import { getRawProductTranslation } from './productTranslation.js';
import { Suspense } from 'react';
import { renderToString } from 'react-dom/server.browser';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import StorefrontProviders from '../StorefrontProviders';
import InitialResources from './InitialResources';
import PageMetadataProvider from './PageMetadataProvider';
import StorefrontFrame from './StorefrontFrame';
import Product from './Product';
import { productSnapshot, productDocumentId } from './initialProduct';
import { catalogueBootJSON } from './initialCatalogue';

export function parseProductRequest(text) {
  if (typeof text !== 'string' || text.length > 2200 || !/^\/(?:en\/)?product\//.test(text)) throw Error('Invalid product URL');
  const url = new URL(text, 'https://newoteg.com');
  const id = productDocumentId(url.pathname);
  if (!id || url.search || url.hash || url.pathname + url.search !== text) throw Error('Invalid product URL');
  return { id, url };
}

export function renderProductResponse(text, raw, at) {
  const { url } = parseProductRequest(text);
  const lang = pathLanguage(url.pathname);
  if (lang === 'en' && !getRawProductTranslation(raw)) throw Error('English product translation unavailable');
  const snapshot = productSnapshot(url, raw, at);
  const output = renderToString(<StorefrontProviders initialLanguage={lang} initialAnonymous>
    <StaticRouter location={snapshot.url} basename={routerBasename(lang)}><InitialResources snapshot={snapshot}><PageMetadataProvider>
      <StorefrontFrame path={basePath(url.pathname)} initial><Suspense>
        <Routes><Route path="/product/:id" element={<Product />} /></Routes>
      </Suspense></StorefrontFrame>
    </PageMetadataProvider></InitialResources></StaticRouter>
  </StorefrontProviders>);
  const start = output.indexOf('<div class="app">');
  if (start < 0 || output.includes('<!--$!-->')) throw Error('Product render failed');
  return `<div id="root" data-initial-product="${lang}">${output.slice(start)}</div>` +
    `<script type="application/json" id="initial-product-data">${catalogueBootJSON(snapshot)}</script>`;
}
