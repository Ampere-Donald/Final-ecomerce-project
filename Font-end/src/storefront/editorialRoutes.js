import { editorialIndex } from './editorialIndex.generated.js';
export const editorialPath = entry => `/${entry.type === 'guide' ? 'guides' : 'remplacement'}/${entry.slug}`;
export const editorialEntry = pathname => editorialIndex.find(entry => editorialPath(entry) === pathname) || null;
export const editorialDocumentPaths = () => ['/guides', '/remplacement', ...editorialIndex.map(editorialPath)];
export const isEditorialDocument = pathname => editorialDocumentPaths().includes(pathname);
export const publicEditorialPaths = () => [
  ...(editorialIndex.some(entry => entry.type === 'replacement') ? ['/remplacement'] : []),
  ...editorialIndex.map(editorialPath),
];
export function editorialMetadata(pathname) {
  const entry = editorialEntry(pathname);
  if (entry) return { title: entry.title + ' — NEWOTEG', description: entry.summary,
    canonical: 'https://newoteg.com' + editorialPath(entry), robots: 'index, follow', private: false, lang: 'fr' };
  if (pathname === '/guides' || pathname === '/remplacement') {
    const replacement = pathname === '/remplacement';
    const available = editorialIndex.some(entry => entry.type === (replacement ? 'replacement' : 'guide'));
    return { title: (replacement ? 'Dossiers de remplacement' : 'Guides de choix électronique') + ' — NEWOTEG',
      description: replacement ? 'Des dossiers de remplacement sélectionnés selon les preuves disponibles et les conditions de leur validation.'
        : 'Des guides sourcés pour identifier une référence et préparer le choix de composants, de connecteurs ou d’un multimètre.',
      canonical: available ? 'https://newoteg.com' + pathname : null,
      robots: available ? 'index, follow' : 'noindex, follow', private: false, lang: 'fr' };
  }
  return null;
}
