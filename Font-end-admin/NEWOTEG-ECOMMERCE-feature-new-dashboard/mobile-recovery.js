// This document is served below /api/, which even legacy service workers exclude
// from their navigation cache. It must not depend on React or a cached bundle.
export function recoveryClient(context) {
  var window = context;
  var document = window.document;
  var navigator = window.navigator;
  var caches = window.caches;
  var XMLHttpRequest = window.XMLHttpRequest;
  var button = document.getElementById('repair');
  var status = document.getElementById('status');
  button.onclick = function () {
    button.disabled = true;
    status.textContent = 'Vérification de la connexion…';
    var request = new XMLHttpRequest();
    request.open('GET', '/api/health?update=' + Date.now(), true);
    request.timeout = 15000;
    function fail() {
      status.textContent = 'Le serveur est injoignable. Vérifiez Internet puis réessayez. Vos données sont conservées.';
      button.disabled = false;
    }
    request.onerror = fail;
    request.ontimeout = fail;
    request.onload = function () {
      var healthy = false;
      try { healthy = request.status === 200 && JSON.parse(request.responseText).status === 'ok'; } catch (_) {}
      if (!healthy) { fail(); return; }
      status.textContent = 'Chargement de la nouvelle interface…';
      var registrations = Promise.resolve([]);
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        registrations = navigator.serviceWorker.getRegistrations();
      }
      registrations.then(function (items) {
        return Promise.all(items.filter(function (item) {
          return item.scope === window.location.origin + '/';
        }).map(function (item) { return item.unregister(); }));
      }).then(function () {
        if (!('caches' in window)) return;
        return caches.keys().then(function (names) {
          return Promise.all(names.filter(function (name) {
            return name.indexOf('workbox-precache-') === 0 ||
              name.indexOf('newoteg-admin-ui-v3-precache-') === 0 ||
              name === 'newoteg-on-demand-modules-v2';
          }).map(function (name) { return caches.delete(name); }));
        });
      }).then(function () {
        window.location.replace('/?interface=mobile-v3');
      }).catch(function () {
        status.textContent = 'La mise à jour n’a pas pu se terminer. Réessayez ou fermez complètement l’application puis rouvrez-la. Vos données sont conservées.';
        button.disabled = false;
      });
    };
    try { request.send(); } catch (_) { fail(); }
  };
}

export function mobileRecoveryResponse(method = 'GET') {
  const html = `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Mettre Newoteg à jour</title><meta name="theme-color" content="#1c19a3"><style>
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#10213a;font:16px/1.6 system-ui,-apple-system,Arial,sans-serif}main{width:100%;max-width:520px;margin:0 auto;padding:36px 20px}header{display:flex;align-items:center;gap:12px;margin-bottom:32px}img{width:42px;height:42px}header strong{font-size:20px}small{display:block;color:#627189;font-size:13px}section{padding:24px;background:white;border:1px solid #e0e6f0;border-radius:20px}h1{font-size:27px;line-height:1.2;margin:0 0 16px}p{margin:12px 0;color:#506079}button{width:100%;min-height:52px;padding:12px 16px;border:0;border-radius:12px;background:#3029ca;color:white;font:600 16px/1.4 system-ui,Arial,sans-serif;margin-top:16px;cursor:pointer}button:disabled{opacity:.65;cursor:wait}button:focus,a:focus{outline:3px solid #8882ff;outline-offset:3px}#status{min-height:52px;font-size:14px;margin-top:16px}a{display:inline-block;min-height:44px;padding:10px 0;color:#3029ca}footer{margin-top:20px;font-size:13px;color:#627189}.notice{border-left:3px solid #8d88ef;padding-left:12px;font-size:14px}
</style></head><body><main><header><img src="/logo.png" alt=""><div><strong>NEWOTEG</strong><small>Espace boutique</small></div></header><section><h1>Retrouver la nouvelle interface</h1><p>Ce bouton remplace les anciens fichiers d’affichage enregistrés sur cet appareil.</p><p>Vos comptes, vos prix et vos ventes en attente restent conservés.</p><p class="notice">Enregistrez les saisies en cours et fermez les autres onglets Newoteg avant de continuer.</p><button id="repair" type="button">Charger la nouvelle version</button><p id="status" role="status" aria-live="polite"></p><a href="/">Revenir à la boutique</a></section><footer>Mise à jour de l’affichage mobile · octobre 2026</footer></main><script>(${recoveryClient.toString()})(window);</script></body></html>`;
  return new Response(method === 'HEAD' ? null : html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  });
}
