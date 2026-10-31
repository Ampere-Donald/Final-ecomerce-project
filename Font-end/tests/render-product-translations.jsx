// Component recipe only. The English public URL/Worker integration is separate.
import { Suspense } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import StorefrontProviders from '../src/StorefrontProviders';
import InitialResources from '../src/storefront/InitialResources';
import PageMetadataProvider from '../src/storefront/PageMetadataProvider';
import StorefrontFrame from '../src/storefront/StorefrontFrame';
import Product from '../src/storefront/Product';

export function renderTranslationPreview(snapshot) {
  const output=renderToString(<StorefrontProviders initialLanguage="en" initialAnonymous>
    <StaticRouter location={snapshot.url}><InitialResources snapshot={snapshot}><PageMetadataProvider>
      <StorefrontFrame path={snapshot.url} initial><Suspense><Routes><Route path="/product/:id" element={<Product />} /></Routes></Suspense></StorefrontFrame>
    </PageMetadataProvider></InitialResources></StaticRouter>
  </StorefrontProviders>);
  if(output.includes('<!--$!-->')) throw Error('English component render suspended');
  return output;
}
