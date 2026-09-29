const positive = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) > 0
    ? Number(value)
    : null;

export function stockState(product) {
  if (
    product.stock === null ||
    product.stock === undefined ||
    product.stock === "" ||
    !Number.isFinite(Number(product.stock))
  )
    return "unknown";
  if (Number(product.stock) <= 0) return "out";
  return Number(product.stock) <= (product.lowStockThreshold ?? 5)
    ? "low"
    : "ok";
}

export function canBuy(product) {
  return (
    ["ok", "low"].includes(stockState(product)) &&
    positive(product.retailPrice) !== null
  );
}

export function adaptProduct(raw, resolveImage) {
  return {
    id: raw.id,
    code: String(raw.id),
    reference: raw.code || null,
    model: raw.nomProduit,
    englishName: raw.designationEn,
    brand: raw.marque,
    description: raw.description,
    categoryName: raw.categorie?.nom || "",
    categoryId: raw.categorieId || raw.categorie?.id || "",
    retailPrice: positive(raw.prixDetail),
    wholesalePrice: positive(raw.prixGros),
    wholesaleMinimum: positive(raw.quantiteGros ?? raw.categorie?.quantiteGros),
    stock:
      raw.quantiteStock == null || raw.quantiteStock === ""
        ? null
        : Number(raw.quantiteStock),
    lowStockThreshold: positive(raw.seuilAlerte) ?? 5,
    image: resolveImage(raw.imageUrl) || "",
    images: [
      ...new Set(
        [raw.imageUrl, raw.imageUrl2, raw.imageUrl3]
          .filter(Boolean)
          .map(resolveImage)
          .filter(Boolean),
      ),
    ],
    urlDatasheet: /^https?:\/\//i.test(raw.urlDatasheet || "")
      ? raw.urlDatasheet
      : null,
    attributes: (raw.attributs || [])
      .map((a) => [
        a.nomAttribut,
        (a.valeurs || []).map((v) => v.valeur).join(", "),
      ])
      .filter((a) => a[0] && a[1]),
  };
}

export function resultPage(data) {
  const rows = Array.isArray(data) ? data : data?.data;
  if (!Array.isArray(rows)) throw new Error("Invalid catalogue response");
  return {
    rows,
    total: data?.meta?.total ?? rows.length,
    pages: Math.max(1, Number(data?.meta?.lastPage) || 1),
  };
}
