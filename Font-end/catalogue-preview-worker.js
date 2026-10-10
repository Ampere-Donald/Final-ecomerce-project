import worker from './catalogue-worker.js';

// Unactivated preview only. It must not expose purchases, account access or
// operational writes on a second origin while measuring public catalogue HTML.
export default {
  fetch(request, env, context) {
    const url = new URL(request.url);
    const publicAPI = /^\/api\/(produits|categories|projets)(?:\/|$)/.test(url.pathname) || url.pathname === '/api/parcours/disponibilite';
    const document = ['/', '/catalogue', '/favicon.ico', '/robots.txt'].includes(url.pathname);
    const asset = /^\/(assets|product-images|design-e|uploads)\//.test(url.pathname) || /^\/logo-header-\d+\.webp$/.test(url.pathname);
    if (!['GET', 'HEAD'].includes(request.method) || !(publicAPI || document || asset)) {
      return new Response('Read-only catalogue experiment', { status: 403, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
    }
    let failure;
    return worker.fetch(request, { ...env, reportCatalogueFailure: error => {
      failure = String(error?.message || 'Render failed').slice(0, 200);
    } }, context).then(response => {
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      if (failure) headers.set('X-Catalogue-Experiment-Failure', failure.replace(/[^\x20-\x7e]/g, '?'));
      return new Response(response.body, { status: response.status, headers });
    });
  },
};
