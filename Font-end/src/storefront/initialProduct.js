import { basePath } from './localePath.js';
import { publicCatalogueData, catalogueBootJSON } from './initialCatalogue.js';
import { readTechnicalSource } from './technicalProvenance.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const scalarText = value => typeof value === 'string' ? value : null;
export function productDocumentId(pathname) {
  const match = /^\/product\/([^/]+)\/?$/.exec(basePath(pathname));
  return match && uuid.test(match[1]) ? match[1] : null;
}

// This is the only raw product data permitted in the anonymous hydration
// payload. Nested relations never inherit extra fields from the API response.
export function publicProductData(raw, id) {
  if (!raw || !uuid.test(id) || raw.id?.toLowerCase() !== id.toLowerCase() || raw.estActif !== true)
    throw Error('Invalid public product detail');
  const row = publicCatalogueData({ data: [raw], meta: { total: 1, lastPage: 1 } }).data[0];
  for (const key of ['description', 'urlDatasheet', 'sousCategorieId']) {
    if (raw[key] != null && typeof raw[key] !== 'string') throw Error('Invalid product text');
    if (typeof raw[key] === 'string') row[key] = raw[key];
  }
  if (raw.sousCategorie) {
    if (typeof raw.sousCategorie.id !== 'string' || typeof raw.sousCategorie.nom !== 'string') throw Error('Invalid product subcategory');
    row.sousCategorie = { id: raw.sousCategorie.id, nom: raw.sousCategorie.nom };
  }
  if (raw.attributs != null && (!Array.isArray(raw.attributs) || raw.attributs.length > 150)) throw Error('Invalid product attributes');
  row.attributs = (raw.attributs || []).map(attribute => {
    if (typeof attribute?.nomAttribut !== 'string' || !Array.isArray(attribute.valeurs) || attribute.valeurs.length > 100) throw Error('Invalid product attribute');
    return {
      nomAttribut: attribute.nomAttribut,
      ...(typeof attribute.cleTechnique === 'string' ? { cleTechnique: attribute.cleTechnique } : {}),
      ...(typeof attribute.libelleTechnique?.fr === 'string' && typeof attribute.libelleTechnique?.en === 'string'
        ? { libelleTechnique: { fr: attribute.libelleTechnique.fr, en: attribute.libelleTechnique.en } } : {}),
      valeurs: attribute.valeurs.map(value => {
        if (!value || !['string', 'number'].includes(typeof value.valeur) || (typeof value.valeur === 'number' && !Number.isFinite(value.valeur))) throw Error('Invalid product attribute value');
        const source = readTechnicalSource(value.documentation);
        // Explicitly copy the public provenance contract after normalization.
        const documentation = { etat: source.etat, obsolete: source.obsolete, reluLe: source.reluLe || null,
          sourceUrl: source.sourceUrl || null };
        for (const key of ['uniteSource', 'valeurNormalisee', 'uniteNormalisee', 'conditions', 'sourceDocument', 'sourceRepere', 'sourceRevision', 'motif']) {
          if (scalarText(source[key]) !== null) documentation[key] = source[key];
        }
        return { valeur: value.valeur, documentation };
      }),
    };
  });
  if (new TextEncoder().encode(catalogueBootJSON(row)).length > 256 * 1024) throw Error('Product detail too large');
  return row;
}

export function productSnapshot(url, raw, at = Date.now()) {
  const id = productDocumentId(url.pathname);
  if (!id || url.search || !Number.isSafeInteger(at) || at < 0) throw Error('Invalid product snapshot');
  return { version: 1, type: 'product', url: url.pathname + url.search, at,
    resources: { ['/produits/' + id]: publicProductData(raw, id) } };
}

export function readProductBoot(text, url) {
  try {
    const snapshot = JSON.parse(text), id = productDocumentId(url.pathname);
    if (!id || snapshot?.version !== 1 || snapshot.type !== 'product' || snapshot.url !== url.pathname + url.search ||
        !Number.isSafeInteger(snapshot.at) || snapshot.at < 0 || snapshot.at > Date.now() + 60000) return null;
    return productSnapshot(url, snapshot.resources['/produits/' + id], snapshot.at);
  } catch { return null; }
}

export function injectProductFragment(document, fragment, css, lang = 'fr') {
  if (!fragment.startsWith(`<div id="root" data-initial-product="${lang}"><div class="app">`) ||
      !fragment.includes('</div><script type="application/json" id="initial-product-data">') || !fragment.endsWith('</script>') ||
      (fragment.match(/<script\b/gi) || []).length !== 2 ||
      !fragment.includes('<script type="application/ld+json" data-product-schema="true">') ||
      !Array.isArray(css) || !css.length || !css.every(path => /^\/assets\/[\w.-]+\.css$/.test(path)) ||
      !document.includes('<div id="root"></div>')) throw Error('Invalid product render envelope');
  const styles = css.filter(path => !document.includes(`href="${path}"`)).map(path => `<link rel="stylesheet" href="${path}" />`).join('');
  return document.replace('</head>', styles + '</head>').replace('<div id="root"></div>', () => fragment);
}
