import { adaptProduct } from "./productData.js";

export function projectLink(value, image = false) {
  if (typeof value !== "string" || !value) return null;
  if (image && /^\/(design-e|images|uploads)\/[^?#\\\s]+$/.test(value)) {
    const path = new URL(value, "https://newoteg.invalid").pathname;
    return /^\/(design-e|images|uploads)\//.test(path) ? path : null;
  }
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

// Published project data has a separate contract from administration rows.
// Unknown prices/stocks never become zero and all approval flags are explicit.
export function readProject(value, slug) {
  const p = value;
  const text = (v) => typeof v === "string";
  const nullableText = (v) => v == null || text(v);
  if (
    !p ||
    !text(p.id) ||
    !p.id ||
    !text(p.slug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) ||
    (slug && p.slug !== slug) ||
    !Number.isSafeInteger(p.version) ||
    p.version < 1 ||
    !["titre", "resume", "objectif", "prerequis", "contraintes"].every((k) =>
      text(p[k]),
    ) ||
    !["titreEn", "resumeEn", "imageUrl"].every((k) => nullableText(p[k])) ||
    !["DEBUTANT", "INTERMEDIAIRE", "AVANCE"].includes(p.niveau) ||
    typeof p.validationActuelle !== "boolean" ||
    typeof p.materielRequisDisponible !== "boolean" ||
    !Array.isArray(p.documents) ||
    p.documents.length > 8 ||
    !p.documents.every((d) => d && text(d.titre) && text(d.url)) ||
    !Array.isArray(p.lignes) ||
    !p.lignes.length ||
    p.lignes.length > 30 ||
    new Set(p.lignes.map((l) => l?.id)).size !== p.lignes.length ||
    !p.lignes.every(
      (l) =>
        l &&
        text(l.id) &&
        text(l.role) &&
        text(l.nomAttendu) &&
        nullableText(l.referenceAttendue) &&
        Number.isSafeInteger(l.quantite) &&
        l.quantite >= 1 &&
        l.quantite <= 10000 &&
        typeof l.necessaire === "boolean" &&
        typeof l.validationActuelle === "boolean" &&
        typeof l.disponible === "boolean" &&
        typeof l.prixConnu === "boolean" &&
        (!l.produit ||
          (text(l.produit.id) &&
            text(l.produit.nomProduit) &&
            l.produit.estActif === true &&
            nullableText(l.produit.code) &&
            [
              "designationEn",
              "marque",
              "description",
              "categorieId",
              "imageUrl",
              "imageUrl2",
              "imageUrl3",
              "urlDatasheet",
            ].every((k) => nullableText(l.produit[k])) &&
            (l.produit.categorie == null ||
              (nullableText(l.produit.categorie.id) &&
                nullableText(l.produit.categorie.nom))) &&
            Array.isArray(l.produit.attributs) &&
            l.produit.attributs.every(
              (a) =>
                a &&
                text(a.nomAttribut) &&
                Array.isArray(a.valeurs) &&
                a.valeurs.every((v) => v && text(v.valeur)),
            ))),
    )
  )
    throw Error("Invalid public project");
  const products = p.lignes.map((l) => l.produit?.id).filter(Boolean);
  if (new Set(products).size !== products.length)
    throw Error("Repeated project product");
  return p;
}

export function readProjectPage(value) {
  if (
    !value ||
    !Array.isArray(value.data) ||
    value.data.length > 24 ||
    !value.meta ||
    !Number.isSafeInteger(value.meta.lastPage) ||
    value.meta.lastPage < 1 ||
    !Number.isSafeInteger(value.meta.total) ||
    value.meta.total < 0 ||
    new Set(value.data.map((p) => p?.id)).size !== value.data.length
  )
    throw Error("Invalid projects page");
  return {
    rows: value.data.map((p) => readProject(p)),
    pages: value.meta.lastPage,
  };
}

export function initialChoices(project) {
  return Object.fromEntries(
    project.lignes.map((l) => [
      l.id,
      { selected: l.necessaire, quantity: String(l.quantite) },
    ]),
  );
}

export function materialRows(
  project,
  resolveImage,
  oldRows = [],
  choices = {},
) {
  const rows = project.lignes.map((line) => {
    const raw = line.produit;
    const product = raw ? adaptProduct(raw, resolveImage) : null;
    let reason = !product
      ? "missing"
      : !line.validationActuelle ||
          !project.validationActuelle ||
          raw.code !== line.referenceAttendue
        ? "approval"
        : null;
    if (
      !reason &&
      (!Number.isSafeInteger(raw.quantiteStock) || raw.quantiteStock < 0)
    )
      reason = "availability";
    if (!reason && raw.quantiteStock === 0) reason = "out";
    if (
      !reason &&
      (!line.prixConnu ||
        !["number", "string"].includes(typeof raw.prixDetail) ||
        !product.retailPrice ||
        product.retailPrice > Number.MAX_SAFE_INTEGER)
    )
      reason = "price";
    return { ...line, product, reason };
  });
  // A previously chosen line removed from the new project stays visible until
  // the customer unchecks it; it cannot disappear into a partial cart silently.
  for (const old of oldRows)
    if (choices[old.id]?.selected && !rows.some((r) => r.id === old.id))
      rows.push({ ...old, product: null, reason: "removed" });
  return rows;
}

export function projectSelection(rows, choices, cartItems) {
  const chosen = rows.filter((r) => choices[r.id]?.selected);
  let total = 0;
  const items = [];
  let error = chosen.length ? null : "empty";
  for (const row of chosen) {
    const quantity = Number(choices[row.id].quantity);
    const inCart =
      cartItems.find((p) => p.id === row.product?.id)?.quantity || 0;
    if (row.reason) error ||= row.reason;
    else if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 10000
    )
      error ||= "quantity";
    else if (quantity + inCart > row.product.stock) error ||= "insufficient";
    if (!row.reason && Number.isSafeInteger(quantity) && quantity > 0) {
      total += row.product.retailPrice * quantity;
      items.push({ product: row.product, quantity });
    }
  }
  if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER)
    error ||= "price";
  const partial = rows.some(
    (r) =>
      r.necessaire &&
      (!choices[r.id]?.selected ||
        Number(choices[r.id].quantity) < r.quantite ||
        r.reason),
  );
  return { items, total, error, partial, count: chosen.length };
}

export function selectionChanged(
  previous,
  current,
  previousRows,
  currentRows,
  choices,
) {
  if (
    previous.id !== current.id ||
    previous.version !== current.version ||
    previous.validationActuelle !== current.validationActuelle
  )
    return true;
  return previousRows.some((row) => {
    if (!choices[row.id]?.selected) return false;
    const fresh = currentRows.find((r) => r.id === row.id);
    return (
      !fresh ||
      fresh.reason ||
      row.product?.id !== fresh.product?.id ||
      row.product?.reference !== fresh.product?.reference ||
      row.product?.retailPrice !== fresh.product?.retailPrice ||
      row.product?.stock !== fresh.product?.stock
    );
  });
}
