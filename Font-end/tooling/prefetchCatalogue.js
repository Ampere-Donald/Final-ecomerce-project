import { startCataloguePrefetch } from '../src/storefront/cataloguePrefetch.js';
import { catalogueQuery, canRenderCatalogue } from '../src/storefront/catalogueQuery.js';
import { catalogueLeadImage } from '../src/storefront/catalogueLeadImage.js';
import { cardImage } from '../src/storefront/cardImage.js';
import { transformWithEsbuild } from 'vite';
import { productImageUrl, productMediaBase } from '../src/utils/productImageUrl.js';
import { catalogueModules, startCatalogueModules } from './catalogueModules.js';

export default function prefetchCatalogue() {
  let config;
  return {
    name: 'newoteg-public-catalogue-prefetch',
    apply: 'build',
    configResolved(value) { config = value; },
    transformIndexHtml: {
      order: 'post',
      async handler(html, context) {
        if (config.env.VITE_CATALOGUE_PREFETCH === 'false') return;
        const base = config.env.VITE_API_URL || '/api';
        // No React, runtime import or Worker request. Start the public reads in
        // parallel with deferred scripts; use the same filter contract as React.
        const modules = catalogueModules(context.bundle);
        const source = `(function(){var catalogueQuery=${catalogueQuery.toString()};var canRenderCatalogue=${canRenderCatalogue.toString()};var cardImage=${cardImage.toString()};var productImageUrl=${productImageUrl.toString()};var productMediaBase=${productMediaBase.toString()};var catalogueLeadImage=${catalogueLeadImage.toString()};(${startCataloguePrefetch.toString()})(window,${JSON.stringify(base)},catalogueQuery,canRenderCatalogue,catalogueLeadImage);(${startCatalogueModules.toString()})(window,${JSON.stringify(modules)},canRenderCatalogue);})();`;
        const { code } = await transformWithEsbuild(source, 'catalogue-prefetch.js',
          { minify: true, target: 'es2017' });
        // A classic script placed after a stylesheet waits for that stylesheet.
        // Start public reads in the head before CSS/network can hold it up.
        // Successful SSR injection removes this hint before serving the document.
        return html.replace(/<meta\s+charset=["']utf-8["']\s*\/?>/i,
          tag => `${tag}<script data-catalogue-prefetch>${code}</script>`);
      },
    },
  };
}
