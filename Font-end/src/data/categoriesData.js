// Catégories dynamiques basées sur les vraies catégories de la BDD NEWOTEG
// Utilisé pour le filtrage/sidebar du catalogue

export const categories = [
  {
    name: 'Semi-conducteurs',
    slug: 'semi-conducteurs',
    count: 0,
    image: 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'MOSFET', slug: 'mosfet', count: 0 },
      { name: 'Transistors Bipolaires', slug: 'transistors-bipolaires', count: 0 },
      { name: 'IGBT & Thyristors', slug: 'igbt-&-thyristors', count: 0 },
    ],
  },
  {
    name: 'Circuits Intégrés',
    slug: 'circuits-integres',
    count: 0,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Mémoires & EEPROM', slug: 'mémoires-&-eeprom', count: 0 },
      { name: 'Amplificateurs & Audio', slug: 'amplificateurs-&-audio', count: 0 },
      { name: 'Régulateurs de Tension', slug: 'régulateurs-de-tension', count: 0 },
      { name: 'Microcontrôleurs & Logic', slug: 'microcontrôleurs-&-logic', count: 0 },
    ],
  },
  {
    name: 'Diodes',
    slug: 'diodes',
    count: 0,
    image: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Diodes Redresseuses', slug: 'diodes-redresseuses', count: 0 },
      { name: 'Diodes Zener', slug: 'diodes-zener', count: 0 },
      { name: 'Diodes Schottky', slug: 'diodes-schottky', count: 0 },
      { name: 'LED & Optronique', slug: 'led-&-optronique', count: 0 },
    ],
  },
  {
    name: 'Condensateurs',
    slug: 'condensateurs',
    count: 0,
    image: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Condensateurs Électrolytiques', slug: 'condensateurs-électrolytiques', count: 0 },
      { name: 'Condensateurs Céramiques', slug: 'condensateurs-céramiques', count: 0 },
      { name: 'Condensateurs Tantale & Autres', slug: 'condensateurs-tantale-&-autres', count: 0 },
    ],
  },
  {
    name: 'Résistances & Passifs',
    slug: 'resistances-passifs',
    count: 0,
    image: 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Résistances', slug: 'résistances', count: 0 },
      { name: 'Inductances & Bobines', slug: 'inductances-&-bobines', count: 0 },
      { name: 'Thermistances & Varistors', slug: 'thermistances-&-varistors', count: 0 },
    ],
  },
  {
    name: 'Modules & Développement',
    slug: 'modules-developpement',
    count: 0,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Modules Arduino & ESP', slug: 'modules-arduino-&-esp', count: 0 },
      { name: 'Afficheurs LCD & LED', slug: 'afficheurs-lcd-&-led', count: 0 },
      { name: 'Modules de Puissance', slug: 'modules-de-puissance', count: 0 },
      { name: 'Capteurs & Détecteurs', slug: 'capteurs-&-détecteurs', count: 0 },
    ],
  },
  {
    name: 'Connecteurs & Câblage',
    slug: 'connecteurs-cablage',
    count: 0,
    image: 'https://images.unsplash.com/photo-1541484042-49da4504192d?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Connecteurs & Bornes', slug: 'connecteurs-&-bornes', count: 0 },
      { name: 'Câbles & Fils', slug: 'câbles-&-fils', count: 0 },
    ],
  },
  {
    name: 'Outils & Consommables',
    slug: 'outils-consommables',
    count: 0,
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Outils & Soudure', slug: 'outils-&-soudure', count: 0 },
      { name: 'Consommables Soudure', slug: 'consommables-soudure', count: 0 },
      { name: 'Protections & Boîtiers', slug: 'protections-&-boîtiers', count: 0 },
    ],
  },
  {
    name: 'Alimentation & Énergie',
    slug: 'alimentation-energie',
    count: 0,
    image: 'https://images.unsplash.com/photo-1609692814858-f7cd2f0afa4f?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Alimentations & Batteries', slug: 'alimentations-&-batteries', count: 0 },
    ],
  },
  {
    name: 'Divers',
    slug: 'divers',
    count: 0,
    image: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?q=80&w=400&auto=format&fit=crop',
    subcategories: [
      { name: 'Divers & Consommables', slug: 'divers-&-consommables', count: 0 },
    ],
  },
];
