import { productDocumentId, injectProductFragment } from './initialProduct.js';

export async function productBackendFragment(url, descriptor, fetcher = fetch, timeoutMs = 2500) {
  // Query-bearing visits keep the normal client path. No arbitrary URL values
  // are forwarded into the anonymous backend HTML or its hydration snapshot.
  if (!productDocumentId(url.pathname) || url.search) return null;
  if (!/^[a-f0-9]{64}$/.test(descriptor?.rendererId)) throw Error('Invalid product renderer identity');
  const endpoint = new URL('https://api.newoteg.com/api/storefront/product');
  endpoint.searchParams.set('renderer', descriptor.rendererId);
  endpoint.searchParams.set('url', url.pathname + url.search);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
  let reader;
  try {
    const response = await fetcher(new Request(endpoint, { signal: controller.signal, redirect: 'manual', headers: { Accept: 'text/html' } }));
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || response.headers.get('X-Catalogue-Renderer') !== descriptor.rendererId) {
      await response.body?.cancel(); throw Error('Product renderer unavailable or incompatible');
    }
    if (!response.body) throw Error('Missing product HTML');
    reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let html = '', bytes = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 512 * 1024) throw Error('Product HTML too large');
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    // Validate this envelope before the Worker receives a release-owned fragment.
    injectProductFragment('<html><head></head><div id="root"></div></html>', html, ['/assets/validation.css']);
    return html;
  } catch (error) { await reader?.cancel().catch(() => {}); throw error; }
  finally { clearTimeout(timer); controller.abort(); }
}
