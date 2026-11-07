// Only a build-generated, anonymous home document may populate the public root.
export function injectInitialHome(document, snapshot, lang = 'fr') {
  if (snapshot?.version !== 1 || snapshot.language !== lang || !['fr', 'en'].includes(lang) ||
      typeof snapshot.html !== 'string' || !snapshot.html.startsWith('<div class="app">') ||
      /<script\b/i.test(snapshot.html) || !Array.isArray(snapshot.css) || !snapshot.css.length ||
      !snapshot.css.every(path => /^\/assets\/[\w.-]+\.css$/.test(path)) ||
      !document.includes('<div id="root"></div>')) return document;
  const styles = snapshot.css.filter(path => !document.includes(`href="${path}"`))
    .map(path => `<link data-initial-home-css rel="stylesheet" href="${path}" />`).join('');
  return document.replace('</head>', styles + '</head>')
    .replace('<div id="root"></div>', `<div id="root" data-initial-home="${lang}">${snapshot.html}</div>`);
}

export function initialHomeStyles(manifest) {
  const css = new Set(), seen = new Set();
  function visit(key) {
    if (seen.has(key)) return;
    seen.add(key);
    const entry = manifest[key];
    if (!entry) throw new Error(`Missing client manifest entry: ${key}`);
    for (const path of entry.css || []) css.add('/' + path);
    for (const key of entry.imports || []) visit(key);
  }
  visit('index.html');
  // Rollup may name a shared dynamic home chunk by its hash instead of source
  // when the home and a lazy shelf share modules. Follow the entry's real edge.
  const home = manifest['src/storefront/Home.jsx'] ? 'src/storefront/Home.jsx' :
    [...new Set(manifest['index.html']?.dynamicImports || [])]
      .filter(key => manifest[key]?.name === 'Home' && manifest[key]?.isDynamicEntry);
  if (Array.isArray(home) && home.length !== 1) throw new Error('Missing client manifest entry: unique Home');
  visit(Array.isArray(home) ? home[0] : home);
  return [...css];
}
