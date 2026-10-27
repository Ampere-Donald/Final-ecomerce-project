/* One-time transition for installed pages that predate the update notice.
 * Do not reload open pages, claim their controller, or delete their caches.
 * Next navigation uses the new worker; future updates retain the prompt.
 */
(function () {
  var markerCache = 'newoteg-update-migration-v3';
  var markerUrl = self.registration.scope + 'api/app-update/migration-v3';
  self.addEventListener('install', function (event) {
    event.waitUntil(caches.keys().then(function (names) {
      var legacy = names.some(function (name) { return name.indexOf('workbox-precache-') === 0; });
      if (!legacy || names.indexOf(markerCache) !== -1) return;
      return self.skipWaiting();
    }).catch(function () { /* An unavailable cache must not break installation. */ }));
  });
  self.addEventListener('activate', function (event) {
    event.waitUntil(caches.open(markerCache).then(function (cache) {
      return cache.put(markerUrl, new Response('ready'));
    }).catch(function () {}));
  });
}());
