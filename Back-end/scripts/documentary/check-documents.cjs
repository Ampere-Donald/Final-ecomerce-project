'use strict';
const fs = require('node:fs');
const primary = [
  'st.com',
  'ti.com',
  'onsemi.com',
  'vishay.com',
  'nexperia.com',
  'nichicon.co.jp',
  'omron.com',
  'tdk.com',
  'openstax.org',
  'microchip.com',
  'infineon.com',
  'analog.com',
  'nxp.com',
  'renesas.com',
  'toshiba-semicon-storage.com',
  'rohm.com',
  'panasonic.com',
  'chemi-con.co.jp',
  'rubycon.co.jp',
  'diodes.com',
  'littelfuse.com',
  'bourns.com',
  'espressif.com',
  'arduino.cc',
];
function primaryUrl(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      primary.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))
    );
  } catch {
    return false;
  }
}
async function check(url) {
  if (!primaryUrl(url))
    return { url, available: false, reason: 'not_registered_primary_host' };
  const signal = AbortSignal.timeout(12000);
  let target = url;
  try {
    for (let i = 0; i < 4; i++) {
      const r = await fetch(target, {
        method: 'HEAD',
        redirect: 'manual',
        signal,
      });
      if (r.status >= 300 && r.status < 400) {
        target = new URL(r.headers.get('location'), target).href;
        if (!primaryUrl(target))
          return { url, available: false, reason: 'unregistered_redirect' };
        continue;
      }
      return {
        url,
        available: r.ok,
        status: r.status,
        type: r.headers.get('content-type'),
        checkedAt: new Date().toISOString(),
        method: 'HEAD',
      };
    }
  } catch {
    return {
      url,
      available: false,
      reason: 'network_or_timeout',
      checkedAt: new Date().toISOString(),
    };
  }
  return { url, available: false, reason: 'redirect_limit' };
}
async function main() {
  const [prepared, projects, out] = process.argv.slice(2);
  if (!out) throw Error('INPUT_PATHS_REQUIRED');
  const rows = fs
      .readFileSync(prepared, 'utf8')
      .trim()
      .split('\n')
      .map(JSON.parse),
    dossiers = JSON.parse(fs.readFileSync(projects, 'utf8'));
  const urls = [
    ...new Set([
      ...rows.flatMap((p) => p.content.locales.fr.documents.map((d) => d.url)),
      ...dossiers.flatMap((p) => p.dto.documents.map((d) => d.url)),
    ]),
  ];
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < urls.length) {
        const url = urls[next++];
        results.push(await check(url));
      }
    }),
  );
  fs.writeFileSync(out, JSON.stringify(results, null, 2) + '\n', {
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      sources: results.length,
      available: results.filter((r) => r.available).length,
    }),
  );
}
if (require.main === module)
  main().catch(() => {
    console.error('DOCUMENT_AVAILABILITY_CHECK_FAILED');
    process.exitCode = 1;
  });
module.exports = { primaryUrl, check };
