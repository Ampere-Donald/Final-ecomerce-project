export function readProductContent(value, lang = "fr") {
  if (value?.schemaVersion !== 1 || !value.locales?.[lang]) return null;
  const c = value.locales[lang];
  if (typeof c.summary !== "string" || !c.summary.trim()) return null;
  for (const key of [
    "paragraphs",
    "applications",
    "integration",
    "replacement",
    "missing",
    "faq",
    "documents",
  ])
    if (!Array.isArray(c[key])) return null;
  if (
    ![
      "paragraphs",
      "applications",
      "integration",
      "replacement",
      "missing",
    ].every((k) => c[k].every((v) => typeof v === "string"))
  )
    return null;
  if (
    !c.faq.every(
      (q) =>
        q && typeof q.question === "string" && typeof q.answer === "string",
    )
  )
    return null;
  const documents = c.documents.filter((d) => {
    try {
      const u = new URL(d.url);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        typeof d.label === "string" &&
        ["product", "family"].includes(d.scope)
      );
    } catch {
      return false;
    }
  });
  return {
    summary: c.summary,
    paragraphs: [...c.paragraphs],
    applications: [...c.applications],
    integration: [...c.integration],
    replacement: [...c.replacement],
    missing: [...c.missing],
    faq: c.faq.map((q) => ({ question: q.question, answer: q.answer })),
    documents: documents.map((d) => ({
      label: d.label,
      url: d.url,
      scope: d.scope,
    })),
  };
}
export function publicProductDocumentation(value) {
  if (
    ![
      "passifs",
      "semiconducteurs",
      "alimentations",
      "modules",
      "connectique",
      "mesure-outillage",
      "equipement",
    ].includes(value?.family)
  )
    return null;
  const fr = readProductContent(value, "fr");
  if (!fr) return null;
  const en = readProductContent(value, "en");
  return {
    schemaVersion: 1,
    family: value.family,
    locales: { fr, ...(en ? { en } : {}) },
  };
}
export function mergeEditorialContent(content, legacy) {
  if (!legacy) return content;
  const paragraphs = [...content.paragraphs];
  if (
    legacy.summary &&
    legacy.summary !== content.summary &&
    !paragraphs.includes(legacy.summary)
  )
    paragraphs.push(legacy.summary);
  const replacement = [
    ...new Set([...content.replacement, ...(legacy.checks || [])]),
  ];
  const documents = [...content.documents];
  for (const source of legacy.sources || []) {
    try {
      const u = new URL(source.url);
      if (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !documents.some((d) => d.url === u.href)
      )
        documents.push({ label: source.label, url: u.href, scope: "family" });
    } catch {
      /* Ignore malformed legacy links. */
    }
  }
  return { ...content, paragraphs, replacement, documents };
}
export function essentialSpecifications(product, lang = "fr") {
  const documented = (product.technicalAttributes || []).flatMap((a) =>
    a.values
      .filter((v) => v.source?.etat === "DOCUMENTE" && !v.source?.obsolete)
      .map((v) => ({
        label: a.technicalLabels?.[lang] || a.label,
        value: v.value,
      })),
  );
  return (
    documented.length ? documented : designationSpecifications(product, lang)
  ).slice(0, 3);
}
// View-only extraction of explicit catalogue wording; never manufactures an attribute
// or converts a document-of-family limit into a specification of the sold item.
export function designationSpecifications(product, lang = "fr") {
  const title = product.model || "";
  if (!/condensateur|\bcondo\b/i.test(title)) return [];
  const result = [];
  const capacitance = title.match(
    /\b(\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?)\s*(µF|uF|nF|pF)\b/i,
  );
  const voltage = title.match(/\b(\d+(?:[.,]\d+)?)\s*(V(?:AC|DC)?)(?:\b|~)/i);
  if (capacitance)
    result.push({
      label: lang === "en" ? "Stated capacitance" : "Capacité indiquée",
      value: capacitance[1] + " " + capacitance[2],
      designation: true,
    });
  if (voltage)
    result.push({
      label: lang === "en" ? "Stated voltage" : "Tension indiquée",
      value: voltage[1] + " " + voltage[2],
      designation: true,
    });
  if (/\bpolarisé/i.test(title) && !/non[ -]polarisé/i.test(title))
    result.push({
      label: lang === "en" ? "Stated type" : "Type indiqué",
      value: lang === "en" ? "Polarised" : "Polarisé",
      designation: true,
    });
  return result;
}
