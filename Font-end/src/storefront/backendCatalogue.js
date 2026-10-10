import { canRenderCatalogue } from './catalogueQuery.js';

export async function catalogueBackendFragment(url, descriptor, fetcher = fetch, timeoutMs = 2000) {
  if (!canRenderCatalogue(url)) return null;
  if (!/^[a-f0-9]{64}$/.test(descriptor?.rendererId)) throw Error('Invalid catalogue renderer identity');
  const endpoint = new URL('https://api.newoteg.com/api/storefront/catalogue');
  endpoint.searchParams.set('renderer', descriptor.rendererId);
  endpoint.searchParams.set('url', url.pathname + url.search);
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), timeoutMs);
  let reader;
  try {
    // Public GET only. Never forward a visitor's cookies or authorization.
    const response = await fetcher(new Request(endpoint, { signal: abort.signal, redirect: 'manual',
      headers: { Accept: 'text/html' } }));
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html') ||
        response.headers.get('X-Catalogue-Renderer') !== descriptor.rendererId) {
      await response.body?.cancel(); throw Error('Catalogue runtime unavailable or incompatible');
    }
    if (!response.body) throw Error('Missing catalogue HTML');
    reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let html = '', bytes = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 512 * 1024) throw Error('Catalogue HTML too large');
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    if (!html.startsWith('<div id="root" data-initial-catalogue="fr"><div class="app">') ||
        !html.includes('</div><script type="application/json" id="initial-catalogue-data">') ||
        !html.endsWith('</script>') || (html.match(/<script\b/gi) || []).length !== 1)
      throw Error('Invalid catalogue HTML envelope');
    return html;
  } catch (error) { await reader?.cancel().catch(() => {}); throw error; }
  finally { clearTimeout(timer); abort.abort(); }
}

export function injectBackendCatalogue(document, fragment, css) {
  if (!Array.isArray(css) || !css.length || !css.every(path => /^\/assets\/[\w.-]+\.css$/.test(path)) ||
      !document.includes('<div id="root"></div>')) throw Error('Invalid catalogue document');
  const styles = css.filter(path => !document.includes(`href="${path}"`))
    .map(path => `<link rel="stylesheet" href="${path}" />`).join('');
  return document.replace('</head>', styles + '</head>').replace('<div id="root"></div>', () => fragment);
}
