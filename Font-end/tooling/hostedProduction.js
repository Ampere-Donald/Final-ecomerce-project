import process from 'node:process';

// Cloudflare's production build can supply a legacy direct API origin.
// Production uses the storefront proxy (/api), including on older Android.
// Apply this before Vite loads environment files, and identically for both
// independent renderer builds. Explicit API variants remain available outside
// this named production deployment profile.
export function applyHostedProductionDefaults(env = process.env) {
  if (env.WORKERS_CI === '1' && env.WORKERS_CI_BRANCH === 'main') {
    env.VITE_API_URL = '/api';
  }
}
