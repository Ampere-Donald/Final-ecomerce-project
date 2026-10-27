const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classify, taxonomy } = require('./catalogue-taxonomy.cjs');
test('classifies only explicit types and preserves ambiguity', () => {
  const classifyName = (name, parent = 'Divers') =>
    classify({ nom_produit: name, categorie_nom: parent });
  assert.equal(
    classifyName('ATMEGA328P — boîtier DIP').categorie,
    'Composants Électroniques',
  );
  assert.equal(classifyName('1000uf 25V').sousCategorie, 'Condensateurs');
  assert.equal(
    classifyName('TDA 7294', 'Audio & Son').sousCategorie,
    'Circuits intégrés audio',
  );
  assert.equal(classifyName('2N2222').sousCategorie, 'Transistors');
  assert.equal(
    classifyName('POTENTIOMETRE B50K').sousCategorie,
    'Potentiomètres',
  );
  assert.equal(classifyName('C5387'), null);
  assert.equal(classifyName('Article à identifier'), null);
  assert.equal(
    classifyName('Ampoule témoin pour fer à souder').sousCategorie,
    'Pannes et pièces de soudure',
  );
  for (const sample of ['2N2222', '1000uf 25V', 'ATMEGA328P', 'AMPOULE 12V']) {
    const value = classifyName(sample);
    assert.ok(taxonomy[value.categorie].includes(value.sousCategorie));
  }
});
