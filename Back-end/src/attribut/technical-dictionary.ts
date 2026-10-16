import { CleAttributTechnique } from '@prisma/client';

// Semantic identities only. No specification, mandatory field or substitution
// threshold is inferred from a name/photo/category by this dictionary.
const groups = {
  commun: [
    'Identité et caractéristiques communes',
    'Identity and common specifications',
  ],
  alimentation: ['Alimentation', 'Power supplies'],
  cable: ['Câbles et adaptateurs vidéo', 'Cables and video adapters'],
  relais: ['Relais', 'Relays'],
  condensateur: ['Condensateurs', 'Capacitors'],
  mesure: ['Multimètres et mesure', 'Multimeters and measurement'],
  semiconductor: ['Semi-conducteurs et modules', 'Semiconductors and modules'],
} as const;
type Entry = { group: keyof typeof groups; fr: string; en: string };
const entry = (group: Entry['group'], fr: string, en: string): Entry => ({
  group,
  fr,
  en,
});

export const technicalDictionaryEntries = {
  REFERENCE_FABRICANT: entry(
    'commun',
    'Référence fabricant',
    'Manufacturer reference',
  ),
  ALIAS_RECHERCHE: entry('commun', 'Alias de recherche', 'Search alias'),
  FABRICANT: entry('commun', 'Fabricant', 'Manufacturer'),
  FONCTION: entry('commun', 'Fonction', 'Function'),
  UNITE_VENDUE: entry('commun', 'Unité vendue', 'Sales unit'),
  BOITIER: entry('commun', 'Boîtier', 'Package'),
  BROCHAGE: entry('commun', 'Brochage', 'Pinout'),
  DIMENSIONS: entry('commun', 'Dimensions', 'Dimensions'),
  ACCESSOIRES: entry('commun', 'Accessoires inclus', 'Included accessories'),
  REVISION_ARTICLE: entry('commun', 'Révision de l’article', 'Item revision'),
  ALIMENTATION_ENTREE_NATURE: entry(
    'alimentation',
    'Nature de l’entrée (AC/DC)',
    'Input type (AC/DC)',
  ),
  ALIMENTATION_ENTREE_PLAGE: entry(
    'alimentation',
    'Plage de tension d’entrée',
    'Input voltage range',
  ),
  ALIMENTATION_ENTREE_FREQUENCE: entry(
    'alimentation',
    'Fréquence d’entrée',
    'Input frequency',
  ),
  ALIMENTATION_SORTIE_NATURE: entry(
    'alimentation',
    'Nature de la sortie (AC/DC)',
    'Output type (AC/DC)',
  ),
  ALIMENTATION_SORTIE_TENSION: entry(
    'alimentation',
    'Tension de sortie',
    'Output voltage',
  ),
  ALIMENTATION_SORTIE_COURANT: entry(
    'alimentation',
    'Courant de sortie et conditions',
    'Output current and conditions',
  ),
  ALIMENTATION_SORTIE_POLARITE: entry(
    'alimentation',
    'Polarité de sortie',
    'Output polarity',
  ),
  ALIMENTATION_SORTIE_CONNECTEUR: entry(
    'alimentation',
    'Connecteur de sortie',
    'Output connector',
  ),
  CONNECTEUR_ENTREE: entry(
    'cable',
    'Connecteur et genre d’entrée',
    'Input connector and gender',
  ),
  CONNECTEUR_SORTIE: entry(
    'cable',
    'Connecteur et genre de sortie',
    'Output connector and gender',
  ),
  LONGUEUR_CABLE: entry('cable', 'Longueur du câble', 'Cable length'),
  SENS_CONVERSION: entry('cable', 'Sens de conversion', 'Conversion direction'),
  NATURE_ADAPTATEUR: entry(
    'cable',
    'Adaptateur actif/passif et alimentation',
    'Active/passive adapter and power',
  ),
  MODES_VIDEO: entry(
    'cable',
    'Modes vidéo et conditions',
    'Video modes and conditions',
  ),
  RELAIS_BOBINE_NATURE: entry(
    'relais',
    'Nature de la bobine (AC/DC)',
    'Coil type (AC/DC)',
  ),
  RELAIS_BOBINE_TENSION: entry('relais', 'Tension de bobine', 'Coil voltage'),
  RELAIS_CONTACTS: entry(
    'relais',
    'Organisation des contacts',
    'Contact configuration',
  ),
  RELAIS_CHARGES: entry(
    'relais',
    'Charges commutées et conditions',
    'Switched loads and conditions',
  ),
  CONDENSATEUR_TECHNOLOGIE: entry(
    'condensateur',
    'Technologie du condensateur',
    'Capacitor technology',
  ),
  CONDENSATEUR_CAPACITE: entry('condensateur', 'Capacité', 'Capacitance'),
  CONDENSATEUR_TOLERANCE: entry(
    'condensateur',
    'Tolérance de capacité',
    'Capacitance tolerance',
  ),
  CONDENSATEUR_TENSION_NATURE: entry(
    'condensateur',
    'Nature de tension (AC/DC)',
    'Voltage type (AC/DC)',
  ),
  CONDENSATEUR_TENSION: entry(
    'condensateur',
    'Tension du condensateur et conditions',
    'Capacitor voltage and conditions',
  ),
  CONDENSATEUR_POLARITE: entry(
    'condensateur',
    'Polarité du condensateur',
    'Capacitor polarity',
  ),
  CONDENSATEUR_ENTRAXE: entry('condensateur', 'Entraxe', 'Lead spacing'),
  CONDENSATEUR_TEMPERATURE: entry(
    'condensateur',
    'Température et conditions',
    'Temperature and conditions',
  ),
  MESURE_GRANDEURS: entry(
    'mesure',
    'Grandeurs mesurées',
    'Measured quantities',
  ),
  MESURE_PLAGES: entry('mesure', 'Plages de mesure', 'Measurement ranges'),
  MESURE_PRECISION: entry(
    'mesure',
    'Précision et conditions',
    'Accuracy and conditions',
  ),
  MESURE_CATEGORIE: entry(
    'mesure',
    'Catégorie de mesure documentée',
    'Documented measurement category',
  ),
  MESURE_TENSION_CATEGORIE: entry(
    'mesure',
    'Tension associée à la catégorie',
    'Voltage associated with the category',
  ),
  SEMICONDUCTEUR_TYPE: entry(
    'semiconductor',
    'Type de semi-conducteur/module',
    'Semiconductor/module type',
  ),
  LIMITES_ABSOLUES: entry(
    'semiconductor',
    'Limites absolues et conditions',
    'Absolute limits and conditions',
  ),
  CONDITIONS_FONCTIONNEMENT: entry(
    'semiconductor',
    'Caractéristiques de fonctionnement et conditions',
    'Operating characteristics and conditions',
  ),
  INTERFACE_MODULE: entry(
    'semiconductor',
    'Alimentation et interface du module',
    'Module power and interface',
  ),
} satisfies Record<CleAttributTechnique, Entry>;

export function technicalDictionary() {
  return {
    version: 1,
    groups: Object.entries(groups).map(([key, [fr, en]]) => ({ key, fr, en })),
    entries: Object.entries(technicalDictionaryEntries).map(([key, data]) => ({
      key,
      ...data,
    })),
  };
}
