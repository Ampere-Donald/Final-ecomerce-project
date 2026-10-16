// The service owns matching. Never substitute generic catalogue matches here.
import { readTechnicalSource } from "./technicalProvenance.js";
export function parseEquivalences(data, targetId) {
  if (!data || !Array.isArray(data.suggestions))
    throw new Error("Invalid equivalence response");
  const seen = new Set();
  const suggestions = data.suggestions
    .filter((s) => {
      if (
        !s ||
        typeof s.produitId !== "string" ||
        !s.produitId ||
        s.produitId === targetId ||
        seen.has(s.produitId) ||
        typeof s.nomProduit !== "string" ||
        !(Number(s.quantiteStock) > 0)
      )
        return false;
      seen.add(s.produitId);
      return true;
    })
    .slice(0, 5)
    .map((s) => ({
      ...Object.fromEntries(
        Object.entries(s).filter(
          ([key]) => !["dossiers", "decision"].includes(key),
        ),
      ),
      // Only the separate, freshly read human register supplies decisions.
      // Ignore any such fields in a model/legacy suggestion payload.
      compatibilite: ["haute", "moyenne", "faible"].includes(s.compatibilite)
        ? s.compatibilite
        : "inconnue",
      raison: typeof s.raison === "string" ? s.raison : "",
      avertissement: typeof s.avertissement === "string" ? s.avertissement : "",
      ...(Array.isArray(s.caracteristiques)
        ? {
            caracteristiques: s.caracteristiques
              .slice(0, 12)
              .filter(
                (c) =>
                  typeof c?.nomAttribut === "string" &&
                  typeof c.valeur === "string",
              )
              .map((c) => ({
                nomAttribut: c.nomAttribut.slice(0, 100),
                valeur: c.valeur.slice(0, 100),
                documentation: readTechnicalSource(c.documentation),
              }))
              .filter((c) => c.documentation.etat === "DOCUMENTE"),
          }
        : {}),
    }));
  return {
    suggestions,
    message: typeof data.message === "string" ? data.message : "",
    catalogueOnly:
      data.mode === "catalogue" ||
      (data.mode == null &&
        typeof data.message === "string" &&
        data.message.includes("sans IA distante")),
  };
}

const verdicts = new Set([
  "DIRECT_DOCUMENTE",
  "ADAPTATION_NECESSAIRE",
  "REFUSE",
  "A_CONFIRMER",
]);
export const replacementScope = (value) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ");
export function parseReplacementDossiers(data, application, targetId) {
  if (
    !data ||
    !Array.isArray(data.dossiers) ||
    !(
      data.nextPage === null ||
      (Number.isInteger(data.nextPage) &&
        data.nextPage > 0 &&
        data.nextPage <= 1000)
    )
  )
    throw Error("Invalid replacement register response");
  const suggestions = new Map();
  for (const entry of data.dossiers.slice(0, 5)) {
    const p = entry?.produit,
      d = entry?.decision;
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      p.id === targetId ||
      typeof p.nomProduit !== "string" ||
      !(Number(p.quantiteStock) > 0) ||
      !d ||
      !verdicts.has(d.verdict)
    )
      continue;
    const fields = {
      reference: 255,
      application: 500,
      justification: 1500,
      limites: 1500,
    };
    if (
      Object.entries(fields).some(
        ([key, max]) =>
          typeof d[key] !== "string" || !d[key].trim() || d[key].length > max,
      ) ||
      typeof d.reluLe !== "string" ||
      !Number.isFinite(Date.parse(d.reluLe))
    )
      continue;
    if (
      d.verdict === "ADAPTATION_NECESSAIRE" &&
      (typeof d.adaptations !== "string" ||
        !d.adaptations.trim() ||
        d.adaptations.length > 1500)
    )
      continue;
    let url;
    try {
      url = new URL(d.source?.url);
      if (url.protocol !== "https:" || url.username || url.password) continue;
    } catch {
      continue;
    }
    if (
      typeof d.source.document !== "string" ||
      !d.source.document.trim() ||
      typeof d.source.repere !== "string" ||
      !d.source.repere.trim()
    )
      continue;
    const dossier = {
      ...Object.fromEntries(Object.keys(fields).map((key) => [key, d[key]])),
      verdict: d.verdict,
      reluLe: d.reluLe,
      adaptations: d.verdict === "ADAPTATION_NECESSAIRE" ? d.adaptations : null,
      source: {
        url: url.href,
        document: d.source.document,
        repere: d.source.repere,
        revision:
          typeof d.source.revision === "string" ? d.source.revision : null,
      },
      correspondAuMontage:
        entry.correspondAuMontage === true &&
        Boolean(application.trim()) &&
        replacementScope(d.application) === replacementScope(application),
    };
    if (!suggestions.has(p.id))
      suggestions.set(p.id, {
        ...Object.fromEntries(
          [
            "nomProduit",
            "designationEn",
            "marque",
            "codeFamille",
            "code",
            "quantiteStock",
            "prixDetail",
            "prixPromo",
            "prixPublic",
            "offre",
            "imageUrl",
          ].map((key) => [key, p[key]]),
        ),
        produitId: p.id,
        compatibilite: "inconnue",
        raison: "",
        avertissement: "",
        dossiers: [],
        caracteristiques: (p.attributs || [])
          .flatMap((a) =>
            (a.valeurs || []).map((v) => ({
              nomAttribut: a.nomAttribut,
              valeur: v.valeur,
              documentation: readTechnicalSource(v.documentation),
            })),
          )
          .filter(
            (c) =>
              typeof c.nomAttribut === "string" &&
              typeof c.valeur === "string" &&
              c.documentation.etat === "DOCUMENTE",
          )
          .slice(0, 12),
      });
    const list = suggestions.get(p.id).dossiers;
    if (!list.some((old) => old.application === dossier.application))
      list.push(dossier);
  }
  return {
    suggestions: [...suggestions.values()],
    nextPage: data.nextPage,
    limiteAtteinte: data.limiteAtteinte === true,
  };
}

export function mergeReplacementSuggestions(model, register) {
  const ids = new Set(register.suggestions.map((s) => s.produitId));
  return [
    ...register.suggestions,
    ...model.suggestions.filter((s) => !ids.has(s.produitId)),
  ].slice(0, 5);
}
