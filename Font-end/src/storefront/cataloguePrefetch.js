// This function is also emitted in the document before the application runs.
// Keep it self-contained and compatible with the legacy browser baseline.
export function startCataloguePrefetch(win, apiBase, queryFor, canRender, leadImage) {
  if (!win.fetch || !win.AbortController || !win.URL || !win.URLSearchParams)
    return;
  var url = new win.URL(win.location.href);
  if (!canRender(url)) return;
  var root = win.document.getElementById("root");
  // A server-rendered catalogue already carries these exact resources.
  if (root && root.getAttribute("data-initial-catalogue")) return;
  var path = queryFor(url.searchParams).path;
  var base = apiBase.endsWith("/api") ? apiBase : apiBase + "/api";
  var origin = new win.URL(base, win.location.origin);
  if (origin.protocol !== "https:" && origin.protocol !== "http:") return;
  var state = { at: Date.now(), resources: {} };
  win.__newotegCataloguePrefetch = state;
  [path, "/categories"].forEach(function (key) {
    var controller = new win.AbortController();
    var timer = win.setTimeout(function () { controller.abort(); }, 8000);
    // Only public GETs. No session, cookies, persistent storage or write API.
    var request;
    try {
      request = win.fetch(base + key, {
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) { request = Promise.reject(error); }
    state.resources[key] = request.then(function (response) {
      if (!response.ok) throw new Error("Catalogue prefetch unavailable");
      return response.json();
    }).then(function (data) {
      win.clearTimeout(timer);
      if (key === path && leadImage && win.location.href === url.href &&
          win.__newotegCataloguePrefetch === state) {
        try {
          var image = leadImage(data);
          if (image) {
            var link = win.document.createElement("link");
            // Older browsers cannot reuse responsive preloads. Leave discovery
            // to the real image rather than downloading the wrong size as well.
            if (!image.srcSet || "imageSrcset" in link) {
              link.rel = "preload";
              link.as = "image";
              link.href = image.src;
              if (image.srcSet) {
                link.imageSrcset = image.srcSet;
                link.imageSizes = image.sizes;
              }
              link.setAttribute("fetchpriority", "high");
              win.document.head.appendChild(link);
            }
          }
        } catch (error) {
          // An optional image hint must not discard valid product data.
          void error;
        }
      }
      return { data: data };
    }, function () {
      win.clearTimeout(timer);
      // Resolve failed prefetches: no unhandled rejection before React starts.
      return null;
    });
  });
  win.setTimeout(function () {
    if (win.__newotegCataloguePrefetch === state)
      delete win.__newotegCataloguePrefetch;
  }, 15000);
}

export function cataloguePrefetch(path, win = globalThis.window) {
  const state = win?.__newotegCataloguePrefetch;
  if (!state || !Number.isFinite(state.at) || Date.now() - state.at < 0 ||
      Date.now() - state.at >= 15000) return null;
  const resource = state.resources?.[path];
  return resource && typeof resource.then === "function" ? resource : null;
}
