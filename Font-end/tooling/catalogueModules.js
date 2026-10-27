// Resolve only the catalogue's static graph from this exact Rollup build. Never
// guess hashed filenames or follow dynamic imports into unrelated pages.
export function catalogueModules(bundle) {
  const candidates = Object.values(bundle || {}).filter(chunk => chunk.type === 'chunk' &&
    chunk.isDynamicEntry && chunk.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/storefront/Catalogue.jsx'));
  if (candidates.length !== 1) throw Error('Missing unique catalogue chunk');
  const seen = new Set(), modules = [];
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const chunk = bundle[file];
    if (chunk?.type !== 'chunk' || !/^assets\/[\w.-]+\.js$/.test(file))
      throw Error('Invalid catalogue module graph');
    if (!chunk.isEntry) modules.push('/' + file);
    for (const dependency of chunk.imports) visit(dependency);
  }
  visit(candidates[0].fileName);
  return modules;
}

// Emitted as a small classic script in the head. No imports are evaluated here;
// browsers without native modulepreload retain Vite's existing legacy path.
export function startCatalogueModules(win, paths, canRender) {
  if (!win.URL || !canRender(new win.URL(win.location.href))) return;
  try {
    var probe = win.document.createElement('link');
    if (!probe.relList || !probe.relList.supports || !probe.relList.supports('modulepreload')) return;
    paths.forEach(function (path) {
      var link = win.document.createElement('link');
      link.rel = 'modulepreload';
      link.crossOrigin = '';
      link.href = path;
      link.setAttribute('data-catalogue-module', '');
      win.document.head.appendChild(link);
    });
  } catch { /* An optional hint must never prevent normal catalogue startup. */ }
}
