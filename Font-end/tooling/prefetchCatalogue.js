import { startCataloguePrefetch } from '../src/storefront/cataloguePrefetch.js';
import { catalogueQuery, canRenderCatalogue } from '../src/storefront/catalogueQuery.js';
import { catalogueLeadImage } from '../src/storefront/catalogueLeadImage.js';
import { cardImage } from '../src/storefront/cardImage.js';
import { transformWithEsbuild } from 'vite';

export default function prefetchCatalogue() {
  let config;
  return {
    name: 'newoteg-public-catalogue-prefetch',
    apply: 'build',
    configResolved(value) { config = value; },
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        if (config.env.VITE_CATALOGUE_PREFETCH === 'false') return;
        const base = config.env.VITE_API_URL || '/api';
        // No React, runtime import or Worker request. Start the public reads in
        // parallel with deferred scripts; use the same filter contract as React.
        const source = `(function(){var catalogueQuery=${catalogueQuery.toString()};var canRenderCatalogue=${canRenderCatalogue.toString()};var cardImage=${cardImage.toString()};var catalogueLeadImage=${catalogueLeadImage.toString()};(${startCataloguePrefetch.toString()})(window,${JSON.stringify(base)},catalogueQuery,canRenderCatalogue,catalogueLeadImage);})();`;
        const { code } = await transformWithEsbuild(source, 'catalogue-prefetch.js',
          { minify: true, target: 'es2017' });
        // Before parser-blocking legacy scripts, after the root so the SSR
        // marker is available. Deferred modern scripts have not run yet.
        return html.replace('<div id="root"></div>',
          `<div id="root"></div><script data-catalogue-prefetch>${code}</script>`);
      },
    },
  };
}
