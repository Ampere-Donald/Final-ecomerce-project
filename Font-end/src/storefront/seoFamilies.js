// Public category identifiers verified against the catalogue on 2026-10-27.
// Slugs are stable editorial destinations; prices and stock remain API data.
export const seoFamilies = [
  {
    slug: 'condensateurs', category: '4412d73b-1cbd-4996-a5ad-993101657e74', subcategory: '66b0437b-5863-4527-8088-6b4833fdc033',
    fr: 'Condensateurs', en: 'Capacitors',
    descriptionFr: 'Comparez les condensateurs du catalogue X-Electronic à Douala : références, caractéristiques, prix et disponibilité à vérifier avant votre choix.',
    descriptionEn: 'Compare capacitors from X-Electronic in Douala: references, specifications, prices and availability to check before choosing.',
  },
  {
    slug: 'transistors', category: '4412d73b-1cbd-4996-a5ad-993101657e74', subcategory: '2131b777-869a-4f06-83be-f7e62b1f9bad',
    fr: 'Transistors', en: 'Transistors',
    descriptionFr: 'Retrouvez les transistors proposés par X-Electronic à Douala. Vérifiez la référence complète et les caractéristiques de votre montage avant de commander.',
    descriptionEn: 'Find transistors offered by X-Electronic in Douala. Check the complete reference and your circuit requirements before ordering.',
  },
  {
    slug: 'circuits-integres-audio', category: '69e8ab9e-bf6a-41de-9093-028170405f55', subcategory: '4aab0f26-c07a-4102-bc78-82fe24ba5e02',
    fr: 'Circuits intégrés audio et TV', en: 'Audio and TV integrated circuits',
    descriptionFr: 'Retrouvez les circuits intégrés audio et TV de X-Electronic au Cameroun. Identifiez la fonction et la référence complète de chaque circuit avant de comparer ses caractéristiques.',
    descriptionEn: 'Find audio and TV integrated circuits at X-Electronic in Cameroon. Identify each circuit’s function and complete reference before comparing its specifications.',
  },
  {
    slug: 'alimentations-stabilisees', category: 'e8df4ded-9ae1-47ce-b733-41c2dda3158c', subcategory: 'dbf79a9a-4474-4de8-81ce-753f9937452b',
    fr: 'Alimentations stabilisées', en: 'Regulated power supplies',
    descriptionFr: 'Consultez les alimentations stabilisées de X-Electronic à Douala. Comparez les caractéristiques annoncées et faites confirmer la référence adaptée à votre besoin.',
    descriptionEn: 'Browse regulated power supplies at X-Electronic in Douala. Compare listed specifications and confirm the reference suited to your needs.',
  },
  {
    slug: 'multimetres', category: '773bcbec-0100-4ea0-88d2-2df52d528a47', subcategory: 'b3d91692-18ae-4085-80b3-38b59616f992',
    fr: 'Multimètres', en: 'Multimeters',
    descriptionFr: 'Découvrez les multimètres du catalogue X-Electronic à Douala. Examinez leurs fonctions, accessoires, prix et disponibilité avant votre achat.',
    descriptionEn: 'Discover multimeters in the X-Electronic catalogue in Douala. Check functions, accessories, prices and availability before buying.',
  },
];

export const familyPath = family => `/catalogue/${family.slug}`;

export function seoFamily(pathname) {
  const normalized = String(pathname).toLowerCase().replace(/\/+$/, '');
  return seoFamilies.find(family => familyPath(family) === normalized) || null;
}

// Additional filters are explicit in the query string; never silently ignore
// them on a dedicated page. Matching locked parameters are harmless aliases.
export function familyParameters(params, family) {
  const next = new URLSearchParams(params);
  if (family) {
    next.set('category', family.category);
    next.set('sub', family.subcategory);
  }
  return next;
}

export function familyMetadata(family, search = '', lang = 'fr') {
  const params = new URLSearchParams(search);
  const allowed = new Set(['page', 'category', 'sub']);
  const validPage = !params.has('page') || /^[1-9]\d*$/.test(params.get('page'));
  const page = validPage ? Number(params.get('page') || 1) : 1;
  const filtered = !validPage || !Number.isSafeInteger(page) ||
    [...params.keys()].some(key => !allowed.has(key) || params.getAll(key).length !== 1) ||
    (params.has('category') && params.get('category') !== family.category) ||
    (params.has('sub') && params.get('sub') !== family.subcategory);
  return {
    title: `${lang === 'en' ? family.en : family.fr} — X-Electronic`,
    description: lang === 'en' ? family.descriptionEn : family.descriptionFr,
    canonical: 'https://newoteg.com' + familyPath(family) + (!filtered && page > 1 ? `?page=${page}` : ''),
    robots: filtered ? 'noindex, follow' : 'index, follow', private: false,
  };
}
