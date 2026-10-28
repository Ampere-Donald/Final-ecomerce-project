export const acquisitionChannels = Object.freeze([
  'RECHERCHE_NATURELLE', 'CAMPAGNE_PAYANTE', 'SOCIAL', 'SITE_REFERENT', 'DIRECT_OU_INCONNU',
]);
const unknown = 'DIRECT_OU_INCONNU';
const searchDomains = ['google.com', 'google.cm', 'google.fr', 'google.co.uk', 'google.co.za',
  'google.com.ng', 'google.com.gh', 'google.co.ke', 'google.co.ma', 'google.dz', 'google.tn',
  'google.sn', 'google.ci', 'google.cd', 'google.ga', 'google.bj', 'google.tg', 'google.ne',
  'google.bf', 'google.ml', 'google.mg', 'google.mu', 'google.rw', 'google.co.ug', 'google.co.tz',
  'google.com.eg', 'google.ca', 'google.be', 'google.ch', 'bing.com', 'yahoo.com', 'duckduckgo.com',
  'search.brave.com', 'ecosia.org', 'yandex.com'];
const socialDomains = ['facebook.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'youtube.com', 'x.com', 't.co', 'pinterest.com', 'wa.me', 'whatsapp.com'];
const within = (host, domain) => host === domain || host.endsWith('.' + domain);

// This function returns an enum only. Raw URLs never leave the classifier.
export function classifyAcquisition(href, referrer) {
  try {
    const page = new URL(href);
    if (!['http:', 'https:'].includes(page.protocol)) return unknown;
    const paid = ['cpc', 'ppc', 'paid', 'paid_social', 'paid-social', 'display', 'cpm'];
    if (['gclid', 'gbraid', 'wbraid', 'msclkid'].some(key => page.searchParams.get(key)) ||
      paid.includes((page.searchParams.get('utm_medium') || '').toLowerCase())) return 'CAMPAGNE_PAYANTE';
    if (!referrer) return unknown;
    const previous = new URL(referrer);
    if (!['http:', 'https:'].includes(previous.protocol) || previous.origin === page.origin ||
      previous.hostname.replace(/^www\./, '') === page.hostname.replace(/^www\./, '')) return unknown;
    const host = previous.hostname.toLowerCase().replace(/\.$/, '');
    if (searchDomains.some(domain => within(host, domain))) return 'RECHERCHE_NATURELLE';
    if (socialDomains.some(domain => within(host, domain))) return 'SOCIAL';
    return 'SITE_REFERENT';
  } catch { return unknown; }
}

export function createAcquisitionReader({ storage, href, referrer, now = Date.now }) {
  const key = 'newoteg_entry_channel_v1', ttl = 30 * 60 * 1000;
  let channel;
  return () => {
    if (channel) return channel;
    const time = now();
    try {
      const saved = JSON.parse(storage?.getItem(key) || 'null');
      if (saved && Object.keys(saved).sort().join(',') === 'at,channel' &&
        acquisitionChannels.includes(saved.channel) && Number.isSafeInteger(saved.at) &&
        saved.at <= time && time - saved.at < ttl) channel = saved.channel;
    } catch { /* Classification remains available without browser storage. */ }
    if (!channel) {
      channel = classifyAcquisition(href(), referrer());
      try { storage?.setItem(key, JSON.stringify({ at: time, channel })); } catch { /* Memory only. */ }
    }
    return channel;
  };
}

let browserReader;
export function entryChannel() {
  if (typeof window === 'undefined') return unknown;
  if (!browserReader) {
    let storage;
    try { storage = window.sessionStorage; } catch { /* Storage may be denied. */ }
    browserReader = createAcquisitionReader({ storage, href: () => window.location.href, referrer: () => document.referrer });
  }
  return browserReader();
}
