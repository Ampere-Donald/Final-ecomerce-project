import { normalizeEligibilityText } from './equivalence-eligibility';

// Lexical retrieval only: a similar marking does not establish compatibility.
export function referenceHints(query: string) {
  const matches =
    normalizeEligibilityText(query).match(
      /\b(?:\d[a-z]{1,3}|[a-z]{1,6})[\s_-]*\d{2,7}[a-z0-9]*\b/g,
    ) || [];
  return (
    [...new Set(matches.map((s) => s.replace(/[\s_-]/g, '')))]
      .slice(0, 4)
      .map((compact) => {
        const parts = compact.match(/^(\d?[a-z]+)(\d.*)$/)!;
        return { compact, prefix: parts[1], spaced: `${parts[1]} ${parts[2]}` };
      })
      // In "5 V 10 mA", V10 is a pair of values, not a component marking.
      .filter(
        (h) =>
          ![
            'v',
            'a',
            'ma',
            'ua',
            'w',
            'kw',
            'hz',
            'khz',
            'mhz',
            'uf',
            'nf',
            'pf',
            'ohm',
            'kohm',
            'mohm',
          ].includes(h.prefix),
      )
  );
}

export function rankCandidates<
  T extends { id: string; nomProduit: string; code: string | null },
>(query: string, candidates: T[], limit = 40): T[] {
  const hints = referenceHints(query);
  const words = normalizeEligibilityText(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
  return candidates
    .map((product) => {
      const name = normalizeEligibilityText(product.nomProduit);
      const markings = referenceHints(name).map((h) => h.compact);
      const score =
        hints.reduce(
          (sum, h) =>
            sum +
            (markings.includes(h.compact)
              ? 100
              : markings.some((m) => m.startsWith(h.prefix))
                ? 20
                : 0),
          0,
        ) + words.reduce((sum, w) => sum + (name.includes(w) ? 1 : 0), 0);
      return { product, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.nomProduit.localeCompare(b.product.nomProduit) ||
        a.product.id.localeCompare(b.product.id),
    )
    .slice(0, limit)
    .map((r) => r.product);
}
