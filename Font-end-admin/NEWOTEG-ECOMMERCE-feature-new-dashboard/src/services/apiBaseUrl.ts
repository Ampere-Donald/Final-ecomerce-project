/** Production devices use the HTTPS proxy, including builds with an old API env value. */
export function resolveApiBaseUrl(configuredUrl: string | undefined, hostname: string): string {
  if (hostname === 'admin.newoteg.com' || /(?:^|-)newoteg-admin\.fotsodonaldampere\.workers\.dev$/.test(hostname)) {
    return '/api';
  }
  const url = (configuredUrl || '/api').replace(/\/+$/, '');
  return url.endsWith('/api') ? url : `${url}/api`;
}

export function resolveProductImageUrl(raw: string | null | undefined, configuredUrl: string | undefined, hostname: string): string | null {
  if (!raw) return null;
  const api = resolveApiBaseUrl(configuredUrl || 'http://localhost:3000/api', hostname);
  if (api === '/api' && /^https?:\/\/api\.newoteg\.com\/uploads\//.test(raw)) {
    return raw.replace(/^https?:\/\/api\.newoteg\.com/, '');
  }
  if (/^https?:\/\//.test(raw)) return raw;
  return `${api.replace(/\/api$/, '')}${raw.startsWith('/') ? '' : '/'}${raw}`;
}
