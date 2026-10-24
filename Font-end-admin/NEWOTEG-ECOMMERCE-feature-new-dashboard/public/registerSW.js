// Compatibility entry point referenced by HTML cached before AppUpdateNotice.
// New pages register through AppUpdateNotice and do not load this script.
if ('serviceWorker' in navigator) {
  var registerLegacyWorker = function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(function () { /* Keep the installed app usable while offline. */ });
  };
  if (document.readyState === 'complete') registerLegacyWorker();
  else window.addEventListener('load', registerLegacyWorker, { once: true });
}
