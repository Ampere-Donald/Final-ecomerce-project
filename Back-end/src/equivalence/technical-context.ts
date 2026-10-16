import { publicDocumentation } from '../valeur-attribut/documentation-data';
import { technicalDictionaryEntries } from '../attribut/technical-dictionary';

// A reviewed characteristic is evidence about one article, never a verdict
// about replacing another article. Always derive it from the current context.
export function reviewedTechnicalContext(product: any) {
  return (product.attributs || [])
    .flatMap((attribute: any) =>
      (attribute.valeurs || []).flatMap((value: any) => {
        const documentation = publicDocumentation(
          value,
          attribute.version,
          product.version,
        );
        if (
          documentation.etat !== 'DOCUMENTE' ||
          !String(value.valeur ?? '').trim()
        )
          return [];
        return [
          {
            nomAttribut: String(attribute.nomAttribut).slice(0, 100),
            valeur: String(value.valeur).slice(0, 100),
            cleTechnique: Object.hasOwn(
              technicalDictionaryEntries,
              attribute.cleTechnique,
            )
              ? attribute.cleTechnique
              : null,
            documentation,
          },
        ];
      }),
    )
    .slice(0, 12);
}

// Internal selector: public browsing stays light. Limits apply to the source
// subset, not to any assertion that the complete component is verified.
export const technicalAttributesSelection = {
  orderBy: { id: 'asc' as const },
  take: 24,
  include: {
    valeurs: {
      orderBy: { id: 'asc' as const },
      take: 6,
      where: { documentation: { is: { etat: 'DOCUMENTE' as const } } },
      include: { documentation: true },
    },
  },
};
