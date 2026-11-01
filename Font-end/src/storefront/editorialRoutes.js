import { editorialIndex } from './editorialIndex.generated.js';
import { englishGuideIndex } from './englishRoutes.generated.js';
import { basePath, localizedPath, pathLanguage } from './localePath.js';
const index = [...editorialIndex, ...englishGuideIndex];
export const editorialBasePath = entry => `/${entry.type === 'guide' ? 'guides' : 'remplacement'}/${entry.slug}`;
export const editorialPath = entry => localizedPath(editorialBasePath(entry), entry.language);
export const editorialEntry = pathname => index.find(entry => editorialPath(entry) === pathname) || null;
export const editorialDocumentPaths = () => ['/guides', '/remplacement', '/en/guides', ...index.map(editorialPath)];
export const isEditorialDocument = pathname => editorialDocumentPaths().includes(pathname);
export const publicEditorialPaths = () => [
  ...(editorialIndex.some(entry => entry.type === 'replacement') ? ['/remplacement'] : []),
  '/en/guides', ...index.map(editorialPath),
];
export function editorialMetadata(pathname) {
  const lang = pathLanguage(pathname), english = lang === 'en';
  const entry = editorialEntry(pathname);
  if (entry) return { title: entry.title + ' — NEWOTEG', description: entry.summary,
    canonical: 'https://newoteg.com' + editorialPath(entry), robots: 'index, follow', private: false, lang };
  if (basePath(pathname) === '/guides' || pathname === '/remplacement') {
    const replacement = pathname === '/remplacement';
    const available = index.some(entry => entry.language === lang && entry.type === (replacement ? 'replacement' : 'guide'));
    return { title: (english ? 'Electronics selection guides' : replacement ? 'Dossiers de remplacement' : 'Guides de choix électronique') + ' — NEWOTEG',
      description: english ? 'Source-based guides to identify a reference and prepare your choice of components, connectors or a multimeter.'
        : replacement ? 'Des dossiers de remplacement sélectionnés selon les preuves disponibles et les conditions de leur validation.'
        : 'Des guides sourcés pour identifier une référence et préparer le choix de composants, de connecteurs ou d’un multimètre.',
      canonical: available ? 'https://newoteg.com' + pathname : null,
      robots: available ? 'index, follow' : 'noindex, follow', private: false, lang };
  }
  return null;
}
