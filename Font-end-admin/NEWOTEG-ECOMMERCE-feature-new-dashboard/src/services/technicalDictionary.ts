export type TechnicalDictionary = {
  version: number;
  groups: { key: string; fr: string; en: string }[];
  entries: { key: string; group: string; fr: string; en: string }[];
};
export function readTechnicalDictionary(data: unknown): TechnicalDictionary {
  const dictionary = data as TechnicalDictionary;
  if (dictionary?.version !== 1 || !Array.isArray(dictionary.groups) || !Array.isArray(dictionary.entries) || dictionary.entries.length > 100)
    throw new Error('Dictionnaire technique invalide');
  const groups = new Set<string>(), keys = new Set<string>();
  for (const group of dictionary.groups) {
    if (!group || typeof group.key !== 'string' || !group.key || groups.has(group.key) || typeof group.fr !== 'string' || !group.fr || typeof group.en !== 'string' || !group.en)
      throw new Error('Groupe technique invalide');
    groups.add(group.key);
  }
  for (const entry of dictionary.entries) {
    if (!entry || !/^[A-Z][A-Z_]{1,79}$/.test(entry.key) || keys.has(entry.key) || !groups.has(entry.group) || typeof entry.fr !== 'string' || !entry.fr || typeof entry.en !== 'string' || !entry.en)
      throw new Error('Clé technique invalide');
    keys.add(entry.key);
  }
  if (!keys.has('REFERENCE_FABRICANT') || !keys.has('ALIAS_RECHERCHE')) throw new Error('Identités techniques manquantes');
  return dictionary;
}
