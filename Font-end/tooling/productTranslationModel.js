import { createHash } from 'node:crypto';
const text = value => typeof value === 'string' && value.trim().length > 0;
const fingerprint = entry => createHash('sha256').update(JSON.stringify({expected:entry.expected, fr:entry.fr})).digest('hex');
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function compileProductTranslations(translations, entries, today = new Date().toISOString().slice(0,10)) {
  if (!Array.isArray(translations) || translations.length > 200) throw Error('Invalid product translations');
  const ids = new Set();
  return translations.map(copy => {
    if (!copy || typeof copy !== 'object' || Object.keys(copy).some(key => !['id','reviewedAt','name','description','title','summary','checks','sourceLabels','sourceSha256'].includes(key)))
      throw Error('Unknown translation field');
    const entry = entries.find(entry => entry.id === copy.id && entry.status === 'published');
    if (!entry || ids.has(copy.id)) throw Error('Unknown or duplicate translated product');
    ids.add(copy.id);
    if (copy.sourceSha256 !== fingerprint(entry)) throw Error('French source changed; review English translation: ' + copy.id);
    if (!validDate(copy.reviewedAt) || copy.reviewedAt < entry.reviewedAt || copy.reviewedAt > today) throw Error('Invalid translation review date');
    if (['name','description','title','summary'].some(key => !text(copy[key])) ||
      !Array.isArray(copy.checks) || copy.checks.length !== entry.fr.checks.length || !copy.checks.every(text) ||
      !Array.isArray(copy.sourceLabels) || copy.sourceLabels.length !== entry.fr.sources.length || !copy.sourceLabels.every(text))
      throw Error('Incomplete product translation: ' + copy.id);
    // Every source is inherited in order from the reviewed French version.
    // Translators cannot substitute a different datasheet, price or stock.
    return { id:entry.id, expected:entry.expected, sourceSha256:copy.sourceSha256, reviewedAt:copy.reviewedAt,
      en:{name:copy.name, description:copy.description, title:copy.title, summary:copy.summary, checks:copy.checks,
        sources:entry.fr.sources.map((source,index) => ({label:copy.sourceLabels[index],url:source.url}))} };
  });
}
export const translationModule = translations => '// Generated from editorial/product-english.json. Reviewed source-bound English copy; no commercial snapshot.\n' +
  `export const productEnglishTranslations = ${JSON.stringify(translations,null,2)};\n`;
