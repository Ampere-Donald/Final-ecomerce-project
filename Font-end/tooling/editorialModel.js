// Build-only model. Never import the private authoring registry into client code.
const text = value => typeof value === 'string' && value.trim().length > 0;
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
function date(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function assert(condition, message) { if (!condition) throw Error('Editorial: ' + message); }
function only(object, allowed, label) {
  assert(object && typeof object === 'object' && !Array.isArray(object), label + ' must be an object');
  assert(Object.keys(object).every(key => allowed.includes(key)), label + ' has an unknown field');
}
function strings(values, label, required = false) {
  assert(Array.isArray(values) && values.every(text) && (!required || values.length > 0), label + ' must contain text');
}

export const editorialPath = entry => `${entry.language === 'en' ? '/en' : ''}/${entry.type === 'guide' ? 'guides' : 'remplacement'}/${entry.slug}`;
export function compileEditorial(entries, families, today = new Date().toISOString().slice(0, 10)) {
  assert(Array.isArray(entries) && entries.length <= 200, 'invalid registry');
  const ids = new Set(), paths = new Set();
  for (const entry of entries) {
    only(entry, ['id', 'slug', 'language', 'type', 'status', 'title', 'summary', 'createdAt', 'reviewedAt', 'sources',
      'families', 'products', 'sections', 'limits', 'review', 'replacement', 'publicationBlockers'], 'entry');
    assert(slug(entry.id) && slug(entry.slug), 'invalid identifier or slug');
    assert(['fr', 'en'].includes(entry.language) && ['guide', 'replacement'].includes(entry.type), 'invalid language/type');
    assert(['draft', 'review', 'published'].includes(entry.status), 'invalid publication status');
    assert(!ids.has(entry.id) && !paths.has(editorialPath(entry)), 'duplicate id or route');
    ids.add(entry.id); paths.add(editorialPath(entry));
    assert(text(entry.title) && date(entry.createdAt) && entry.createdAt <= today, 'invalid title/creation date');
    assert(Array.isArray(entry.families) && entry.families.every(value => families.includes(value)), 'unknown family');
    assert(Array.isArray(entry.products) && entry.products.every(product => {
      only(product, ['id', 'label'], 'product link');
      return uuid(product.id) && text(product.label);
    }), 'invalid product link');
    assert(Array.isArray(entry.sources), 'invalid sources');
    const sourceIds = new Set();
    for (const source of entry.sources) {
      only(source, ['id', 'label', 'url', 'locator', 'checkedAt'], 'source');
      assert(slug(source.id) && !sourceIds.has(source.id) && text(source.label) && text(source.locator), 'invalid source identity');
      sourceIds.add(source.id);
      let url;
      try { url = new URL(source.url); } catch { throw Error('Editorial: invalid source URL'); }
      assert(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash, 'source must be a stable credential-free HTTPS URL');
      assert(date(source.checkedAt) && source.checkedAt <= today, 'invalid source check date');
    }
    assert(Array.isArray(entry.sections), 'invalid sections');
    const sectionIds = new Set();
    for (const section of entry.sections) {
      only(section, ['id', 'title', 'paragraphs', 'bullets', 'table', 'sources'], 'section');
      assert(slug(section.id) && !sectionIds.has(section.id) && text(section.title), 'invalid section identity');
      sectionIds.add(section.id);
      strings(section.paragraphs, 'paragraphs'); strings(section.bullets, 'bullets');
      assert(Array.isArray(section.sources) && section.sources.every(id => sourceIds.has(id)), 'unknown section source');
      if (section.table) {
        only(section.table, ['caption', 'headers', 'rows'], 'table');
        assert(text(section.table.caption), 'missing table caption');
        strings(section.table.headers, 'table headers', true);
        assert(Array.isArray(section.table.rows) && section.table.rows.length > 0 && section.table.rows.every(row =>
          Array.isArray(row) && row.length === section.table.headers.length && row.every(text)), 'invalid table dimensions');
      }
      assert(section.paragraphs.length || section.bullets.length || section.table, 'empty section');
    }
    strings(entry.limits, 'limits');
    if (entry.reviewedAt != null) assert(date(entry.reviewedAt) && entry.reviewedAt >= entry.createdAt && entry.reviewedAt <= today, 'invalid review date');
    if (entry.status !== 'published') continue;
    assert(entry.language === 'fr', 'English publication requires the URL-language delivery first');
    assert(!entry.publicationBlockers?.length, 'publication still blocked');
    assert(text(entry.summary) && date(entry.reviewedAt) && entry.sources.length > 0 && entry.sections.length > 0 && entry.limits.length > 0,
      'incomplete published content');
    only(entry.review, ['method', 'scope'], 'review');
    assert(['documentary', 'bench'].includes(entry.review.method) && text(entry.review.scope), 'missing review scope');
    if (entry.type === 'replacement') {
      const replacement = entry.replacement;
      only(replacement, ['original', 'candidate', 'context', 'differences', 'conditions', 'conclusion', 'validation'], 'replacement');
      for (const key of ['original', 'candidate', 'context', 'conclusion']) assert(text(replacement[key]), 'missing replacement ' + key);
      strings(replacement.differences, 'replacement differences', true);
      strings(replacement.conditions, 'replacement conditions', true);
      only(replacement.validation, ['status', 'caseId', 'reviewedAt', 'evidence'], 'replacement validation');
      assert(replacement.validation.status === 'verified' && uuid(replacement.validation.caseId) &&
        date(replacement.validation.reviewedAt) && replacement.validation.reviewedAt <= today, 'missing verified business case');
      strings(replacement.validation.evidence, 'replacement evidence', true);
      assert(replacement.validation.evidence.every(id => sourceIds.has(id)), 'unknown replacement evidence');
    }
  }
  // Explicit publication boundary: drafts and internal blockers never enter any
  // client, Worker, server-renderer, search index or sitemap import graph.
  return entries.filter(entry => entry.status === 'published').map(entry => {
    const { id, slug, language, type, title, summary, createdAt, reviewedAt, sources, families, products, sections, limits, review, replacement } = entry;
    return { id, slug, language, type, title, summary, createdAt, reviewedAt, sources, families, products, sections, limits, review,
      ...(replacement ? { replacement } : {}) };
  });
}

export const editorialModule = entries => '// Generated from editorial/entries.json by tooling/prepareEditorial.mjs. Published content only.\n' +
  `export const publishedEditorial = ${JSON.stringify(entries, null, 2)};\n`;
