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
  if (typeof text !== 'string' || text.length > 2200 || !text.startsWith('/product/')) throw Error('Invalid product URL');
  const url = new URL(text, 'https://newoteg.com');
  const id = productDocumentId(url.pathname);
  if (!id || url.search || url.hash || url.pathname + url.search !== text) throw Error('Invalid product URL');
  return { id, url };
}

export function renderProductResponse(text, raw, at) {
  const { url } = parseProductRequest(text);
  const snapshot = productSnapshot(url, raw, at);
  const output = renderToString(<StorefrontProviders initialLanguage="fr" initialAnonymous>
    <StaticRouter location={snapshot.url}><InitialResources snapshot={snapshot}><PageMetadataProvider>
      <StorefrontFrame path={url.pathname} initial><Suspense>
        <Routes><Route path="/product/:id" element={<Product />} /></Routes>
      </Suspense></StorefrontFrame>
    </PageMetadataProvider></InitialResources></StaticRouter>
  </StorefrontProviders>);
  const start = output.indexOf('<div class="app">');
  if (start < 0 || output.includes('<!--$!-->')) throw Error('Product render failed');
  return `<div id="root" data-initial-product="fr">${output.slice(start)}</div>` +
    `<script type="application/json" id="initial-product-data">${catalogueBootJSON(snapshot)}</script>`;
}
