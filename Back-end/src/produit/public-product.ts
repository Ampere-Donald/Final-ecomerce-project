import { cataloguePricing } from '../pricing/catalogue-price';
import { publicDocumentation } from '../valeur-attribut/documentation-data';

/** Same projection for the public JSON API and the initial storefront HTML. */
export function masquerCouts(p: any, now = new Date(), publicView = true): any {
  if (!p || typeof p !== 'object') return p;
  const copie: any = { ...p };
  if (Array.isArray(copie.attributs))
    copie.attributs = copie.attributs.map((a: any) => ({
      ...a,
      valeurs: Array.isArray(a.valeurs)
        ? a.valeurs.map((v: any) => ({
            ...v,
            documentation: publicDocumentation(v, a.version, copie.version),
          }))
        : a.valeurs,
    }));
  for (const field of [
    'cmupActuel',
    'dernierCoutAchatFcfa',
    'derniereDeviseAchat',
    'dernierFournisseurId',
    'dernierAchatAt',
  ])
    delete copie[field];
  if (publicView) {
    if (copie.quantiteDisponibleVente !== undefined)
      copie.quantiteStock = copie.quantiteDisponibleVente;
    delete copie.quantiteReservee;
  }
  return { ...copie, ...cataloguePricing(copie, now) };
}
