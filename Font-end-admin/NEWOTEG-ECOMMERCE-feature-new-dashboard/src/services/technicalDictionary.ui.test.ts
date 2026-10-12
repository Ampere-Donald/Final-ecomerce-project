import { expect, it } from 'vitest';
import { readTechnicalDictionary } from './technicalDictionary';
const dictionary = { version: 1, groups: [{ key: 'commun', fr: 'Commun', en: 'Common' }], entries: ['REFERENCE_FABRICANT', 'ALIAS_RECHERCHE', 'BOITIER'].map(key => ({ key, group: 'commun', fr: key, en: key })) };
it('Reads the server dictionary and refuses duplicate semantic keys or undefined groups', () => {
  expect(readTechnicalDictionary(dictionary)).toEqual(dictionary);
  expect(() => readTechnicalDictionary({ ...dictionary, entries: [...dictionary.entries, dictionary.entries[2]] })).toThrow();
  expect(() => readTechnicalDictionary({ ...dictionary, groups: [] })).toThrow();
  expect(() => readTechnicalDictionary({ ...dictionary, entries: dictionary.entries.slice(1) })).toThrow();
  expect(() => readTechnicalDictionary({ ...dictionary, version: 999 })).toThrow();
  expect(() => readTechnicalDictionary(null)).toThrow();
});
