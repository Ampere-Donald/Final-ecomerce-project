import { SITE_ORIGIN } from './routeMetadata.js';
import { shopContact } from './shopContact.js';

// Public identity already displayed by the shop. Omit unconfirmed legal IDs,
// exact map location, hours, shipping coverage, reviews and return policies.
export function organizationData() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization',
    '@id': SITE_ORIGIN + '/#organization', name: 'NEWOTEG', url: SITE_ORIGIN,
    logo: SITE_ORIGIN + '/logo.png',
    brand: { '@type': 'Brand', name: 'X-Electronic' },
    email: shopContact.email, telephone: shopContact.phone,
  };
}

export const organizationJSON = (value = organizationData()) => JSON.stringify(value)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
