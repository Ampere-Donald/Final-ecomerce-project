const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Presentation groups only. Every destination comes from a category returned by the API.
const groups = [
  [
    "cables",
    "Câbles & connectique",
    "Cables & connectors",
    ["Câbles & Connectique"],
  ],
  [
    "power",
    "Alimentation",
    "Power supplies",
    ["Alimentation & Energie", "Chargeurs & Power Banks", "Piles & Batteries"],
  ],
  ["components", "Composants", "Components", ["Composants Électroniques"]],
  [
    "tools",
    "Outillage",
    "Tools",
    ["Outillage", "Mesure & Test", "Loupe & Optique"],
  ],
  [
    "video",
    "Vidéo & adaptateurs",
    "Video & adapters",
    ["Satellite & TV", "Télécommandes"],
  ],
];

export function catalogueFamilies(data) {
  const categories = (Array.isArray(data) ? data : data?.data || []).filter(
    (c) => c?.id && c?.nom,
  );
  const used = new Set();
  const families = groups.flatMap(([key, fr, en, names]) => {
    const rows = categories.filter((c) =>
      names.some((name) => normalize(name) === normalize(c.nom)),
    );
    rows.forEach((c) => used.add(c.id));
    return rows.length ? [{ key, fr, en, categories: rows }] : [];
  });
  return [
    ...families,
    ...categories
      .filter((c) => !used.has(c.id))
      .map((c) => ({ key: c.id, fr: c.nom, en: c.nom, categories: [c] })),
  ];
}

export function categoryDestination(id) {
  return `/catalogue?category=${encodeURIComponent(id)}`;
}

export function suggestionPath(query) {
  return (
    "/produits?" +
    new URLSearchParams({
      search: query.trim(),
      salesSearch: "true",
      limit: "8",
    })
  );
}

// Preserve accents in the visible text while matching accented/unaccented input.
export function highlightParts(text, query) {
  const value = String(text || "");
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  const normalized = normalize(value);
  const matches = [];
  for (const token of tokens) {
    let start = normalized.indexOf(token);
    while (start >= 0) {
      matches.push([start, start + token.length]);
      start = normalized.indexOf(token, start + token.length);
    }
  }
  matches.sort((a, b) => a[0] - b[0]);
  const ranges = [];
  for (const [start, end] of matches) {
    const last = ranges.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
  }
  const parts = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor)
      parts.push({ text: value.slice(cursor, start), match: false });
    parts.push({ text: value.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < value.length)
    parts.push({ text: value.slice(cursor), match: false });
  return parts;
}
