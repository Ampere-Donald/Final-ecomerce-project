// The service owns matching. Never substitute generic catalogue matches here.
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
      ...s,
      compatibilite: ["haute", "moyenne", "faible"].includes(s.compatibilite)
        ? s.compatibilite
        : "inconnue",
      raison: typeof s.raison === "string" ? s.raison : "",
      avertissement: typeof s.avertissement === "string" ? s.avertissement : "",
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
