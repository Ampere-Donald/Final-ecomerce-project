import { isEditorialDocument } from './editorialRoutes.js';

export function injectEditorialFragment(document, path, fragments, css) {
  if (!isEditorialDocument(path)) return null;
  const fragment = fragments?.[path];
  if (typeof fragment !== 'string' || !fragment.startsWith('<div id="root" data-initial-editorial="fr"><div class="app">') ||
      !fragment.endsWith('</div>') || /<script\b/i.test(fragment) || !document.includes('<div id="root"></div>') ||
      !Array.isArray(css) || !css.length || !css.every(value => /^\/assets\/[\w.-]+\.css$/.test(value)))
    throw Error('Invalid static editorial envelope');
  const styles = css.filter(value => !document.includes(`href="${value}"`)).map(value => `<link rel="stylesheet" href="${value}" />`).join('');
  return document.replace('</head>', styles + '</head>').replace('<div id="root"></div>', () => fragment);
}
