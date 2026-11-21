// URL language is authoritative, including before React starts. No cookies,
// browser preference or IP address may change the content of a French URL.
export const pathLanguage = pathname => /^\/en(?:\/|$)/i.test(pathname) ? 'en' : 'fr';
export const basePath = pathname => pathLanguage(pathname) === 'en' ? pathname.slice(3) || '/' : pathname;
export const localizedPath = (pathname, lang = 'fr') => {
  const path = basePath(pathname);
  return lang === 'en' ? '/en' + (path === '/' ? '/' : path) : path;
};
export const routerBasename = lang => lang === 'en' ? '/en' : '/';
