import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

export const projectProductSelect = {
  id: true,
  nomProduit: true,
  designationEn: true,
  description: true,
  code: true,
  codeFamille: true,
  marque: true,
  categorieId: true,
  categorie: { select: { id: true, nom: true } },
  estActif: true,
  prixDetail: true,
  quantiteStock: true,
  seuilAlerte: true,
  imageUrl: true,
  imageUrl2: true,
  imageUrl3: true,
  urlDatasheet: true,
  attributs: {
    select: { nomAttribut: true, valeurs: { select: { valeur: true } } },
  },
} as const;
function canonical(value: any): any {
  if (value instanceof Date) return value.toJSON();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
export const hash = (data: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(data)))
    .digest('hex');
export function technicalFingerprint(product: any) {
  return hash({
    id: product.id,
    code: product.code || null,
    codeFamille: product.codeFamille || null,
    nomProduit: product.nomProduit,
    description: product.description || null,
    marque: product.marque || null,
    categorieId: product.categorieId,
    urlDatasheet: product.urlDatasheet || null,
    attributs: (product.attributs || [])
      .map((a: any) => ({
        nom: a.nomAttribut,
        valeurs: [
          ...new Set((a.valeurs || []).map((v: any) => v.valeur)),
        ].sort(),
      }))
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom)),
  });
}
export function projectUrl(value: string, image = false) {
  if (image && /^\/(uploads|design-e|images)\/[^?#\\\s]+$/.test(value))
    return value;
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw Error();
    return url.href;
  } catch {
    throw new BadRequestException(
      'Utilisez une URL publique http(s) sans identifiants intégrés.',
    );
  }
}
export function publicProject(row: any) {
  const validation =
    row.validationVersion === row.version && Boolean(row.valideAt);
  const lignes = row.lignes.map((line: any) => {
    const raw = line.produit;
    const produit: Record<string, any> | null = raw?.estActif
      ? {
          ...Object.fromEntries(
            Object.keys(projectProductSelect).map((key) => [key, raw[key]]),
          ),
          categorie: raw.categorie
            ? { id: raw.categorie.id, nom: raw.categorie.nom }
            : null,
          attributs: (raw.attributs || []).map((a: any) => ({
            nomAttribut: a.nomAttribut,
            valeurs: (a.valeurs || []).map((v: any) => ({ valeur: v.valeur })),
          })),
        }
      : null;
    const validationActuelle =
      validation &&
      Boolean(
        produit &&
        line.empreinteTechnique &&
        technicalFingerprint(produit) === line.empreinteTechnique,
      );
    const prix = produit?.prixDetail;
    const montant = prix * line.quantite;
    const prixConnu =
      typeof prix === 'number' &&
      Number.isFinite(prix) &&
      prix > 0 &&
      Number.isFinite(montant) &&
      montant <= Number.MAX_SAFE_INTEGER;
    const stock = produit?.quantiteStock;
    const disponible = Number.isSafeInteger(stock) && stock >= line.quantite;
    return {
      id: line.id,
      ordre: line.ordre,
      role: line.role,
      quantite: line.quantite,
      necessaire: line.necessaire,
      referenceAttendue: line.reference,
      nomAttendu: line.nomProduit,
      produit,
      validationActuelle,
      disponible: Boolean(produit && disponible),
      prixConnu,
      montant: prixConnu ? montant : null,
    };
  });
  const required = lignes.filter((line: any) => line.necessaire);
  return {
    id: row.id,
    slug: row.slug,
    titre: row.titre,
    titreEn: row.titreEn,
    resume: row.resume,
    resumeEn: row.resumeEn,
    objectif: row.objectif,
    prerequis: row.prerequis,
    contraintes: row.contraintes,
    niveau: row.niveau,
    imageUrl: row.imageUrl,
    documents: row.documents,
    version: row.version,
    valideAt: row.valideAt,
    validationActuelle:
      validation && lignes.every((line: any) => line.validationActuelle),
    materielRequisDisponible:
      required.length > 0 &&
      required.every(
        (line: any) =>
          line.validationActuelle && line.disponible && line.prixConnu,
      ),
    lignes,
  };
}

export function adminProject(row: any) {
  return {
    ...row,
    lignes: row.lignes.map((line: any) => ({
      ...line,
      empreinteActuelle: line.produit?.estActif
        ? technicalFingerprint(line.produit)
        : null,
    })),
  };
}
