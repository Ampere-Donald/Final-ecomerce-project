const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
// Rules use explicit product types or well-established reference families.
// A generic photograph, a numeric value, or an unknown reference never suffices.
const taxonomy = {
  'Composants Électroniques': [
    'Transistors',
    'Diodes et ponts redresseurs',
    'Condensateurs',
    'Résistances',
    'Potentiomètres',
    'Circuits intégrés',
    'Relais',
    'Fusibles et protections',
    'Bobines et transformateurs',
    'Quartz et oscillateurs',
  ],
  'Audio & Son': [
    'Circuits intégrés audio',
    'Haut-parleurs et tweeters',
    'Microphones',
    'Amplificateurs et modules audio',
    'Accessoires audio',
  ],
  'Câbles & Connectique': [
    'Câbles audio et vidéo',
    'Câbles USB et informatiques',
    'Connecteurs et prises',
    'Adaptateurs',
    'Fils et cordons',
  ],
  'Satellite & TV': [
    'Antennes et accessoires satellite',
    'Décodeurs et récepteurs',
    'Cartes et modules TV',
    'Rétroéclairage LED',
  ],
  'Alimentation & Energie': [
    'Alimentations stabilisées',
    'Modules de conversion',
    'Onduleurs et accessoires',
  ],
  'Chargeurs & Power Banks': [
    'Chargeurs pour ordinateur',
    'Chargeurs et adaptateurs secteur',
    'Power banks',
  ],
  Divers: [],
  Outillage: [
    'Fers et stations à souder',
    'Pannes et pièces de soudure',
    'Consommables de soudure',
    'Tournevis et pinces',
    'Accessoires d’atelier',
  ],
  'Piles & Batteries': [
    'Piles',
    'Batteries rechargeables',
    'Chargeurs de piles et batteries',
    'Supports et accessoires',
  ],
  'Accessoires électriques': [
    'Ampoules et éclairage',
    'Interrupteurs et commutateurs',
    'Prises et rallonges',
  ],
  Ventilateurs: ['Ventilateurs de refroidissement', 'Pièces de ventilateurs'],
  'Informatique & Réseaux': [
    'Réseaux et communication',
    'Stockage et accessoires',
    'Vidéosurveillance',
  ],
  'Mesure & Test': [
    'Multimètres',
    'Cordons et sondes',
    'Indicateurs et appareils de mesure',
  ],
  Télécommandes: [
    'Télécommandes TV',
    'Télécommandes satellite',
    'Télécommandes audio',
    'Télécommandes universelles',
  ],
  'Loupe & Optique': ['Loupes éclairantes'],
};
const rules = [
  [
    /^ATMEGA\s*\d|^ATTINY\s*\d|^PIC\s*\d/,
    'Composants Électroniques',
    'Circuits intégrés',
    'Référence explicite de microcontrôleur',
  ],
  [
    /CONDENSATEUR|^\d+(?:[.,]\d+)?\s*(?:UF|µF|NF|PF)\b/,
    'Composants Électroniques',
    'Condensateurs',
    'Type condensateur ou capacité explicitement indiquée',
  ],
  [
    /POTENTIOMETRE|^POT(?:\s|\.)/,
    'Composants Électroniques',
    'Potentiomètres',
    'Potentiomètre explicitement nommé',
  ],
  [
    /^RESISTANCE\b/,
    'Composants Électroniques',
    'Résistances',
    'Résistance explicitement nommée',
  ],
  [
    /\bDIODE\b|^1N\s*\d{3,5}\b|^PONT\s+(?:DE\s+)?(?:DIODE|REDRESSE)/,
    'Composants Électroniques',
    'Diodes et ponts redresseurs',
    'Diode ou référence de diode explicite',
  ],
  [
    /^TRANSISTOR\b|^(?:2N|2SC|2SA|2SD|2SB|BC|BD|TIP|IRF|IRFP)\s*\d{2,5}[A-Z]*(?:\b|$)/,
    'Composants Électroniques',
    'Transistors',
    'Famille de référence transistor explicite',
  ],
  [
    /^RELAIS\b/,
    'Composants Électroniques',
    'Relais',
    'Relais explicitement nommé',
  ],
  [
    /^FUSIBLE\b|^ASSORTIMENT DE FUSIBLES\b/,
    'Composants Électroniques',
    'Fusibles et protections',
    'Fusible explicitement nommé',
  ],
  [
    /^TRANSFO(?:RMATEUR)?\b|^BOBINE\b/,
    'Composants Électroniques',
    'Bobines et transformateurs',
    'Type bobine ou transformateur explicite',
  ],
  [
    /^QUARTZ\b|^OSCILLATEUR\b/,
    'Composants Électroniques',
    'Quartz et oscillateurs',
    'Type quartz ou oscillateur explicite',
  ],
  [
    /^ALIMENTATI?ON?\s+STABILISE|^ALIMENTATIN\s+STABILISE/,
    'Alimentation & Energie',
    'Alimentations stabilisées',
    'Alimentation stabilisée explicitement nommée',
  ],
  [
    /^POWER\s*BANK\b/,
    'Chargeurs & Power Banks',
    'Power banks',
    'Power bank explicitement nommé',
  ],
  [
    /^BATTERIE\s+RECHARGEABLE\b/,
    'Piles & Batteries',
    'Batteries rechargeables',
    'Batterie rechargeable explicitement nommée',
  ],
  [
    /^CHARGEUR DE PILE|^CHARGEUR DE BATTERIE/,
    'Piles & Batteries',
    'Chargeurs de piles et batteries',
    'Chargeur de piles ou de batterie explicite',
  ],
  [/^PILE\b/, 'Piles & Batteries', 'Piles', 'Pile explicitement nommée'],
  [
    /^(?:ADAPTATEUR|ADAPT |ADATATEU)\b/,
    'Câbles & Connectique',
    'Adaptateurs',
    'Adaptateur explicitement nommé',
  ],
  [
    /^CABLE.*(?:RCA|HDMI|PERITEL|AUDIO|VIDEO|COAXIAL|VGA)/,
    'Câbles & Connectique',
    'Câbles audio et vidéo',
    'Câble audio/vidéo explicitement nommé',
  ],
  [
    /^CABLE.*(?:USB|IMPRIMANTE)/,
    'Câbles & Connectique',
    'Câbles USB et informatiques',
    'Câble informatique explicitement nommé',
  ],
  [
    /^CABLE.*(?:RESEAU|RJ45)|^ROUTEUR\b|^SWITCH\s+(?:RESEAU|ETHERNET)/,
    'Informatique & Réseaux',
    'Réseaux et communication',
    'Équipement réseau explicitement nommé',
  ],
  [
    /^CAMERA.*SURVEILLANCE/,
    'Informatique & Réseaux',
    'Vidéosurveillance',
    'Caméra de surveillance explicitement nommée',
  ],
  [
    /^BOITIER DISQUE DUR|^DISQUE DUR\b/,
    'Informatique & Réseaux',
    'Stockage et accessoires',
    'Accessoire de stockage explicite',
  ],
  [
    /^BARRETTE.*(?:LED|RETROECLAIRAGE)/,
    'Satellite & TV',
    'Rétroéclairage LED',
    'Barrette LED explicitement nommée',
  ],
  [
    /^CARTE.*(?:TELEVISEUR|\bTV\b)|^KIT.*(?:TELEVISEUR|\bTV\b)/,
    'Satellite & TV',
    'Cartes et modules TV',
    'Module TV explicitement nommé',
  ],
  [
    /^ANTENNE\b|^LNB\b/,
    'Satellite & TV',
    'Antennes et accessoires satellite',
    'Antenne ou LNB explicite',
  ],
  [
    /^DECODEUR\b|^RECEPTEUR SATELLITE\b/,
    'Satellite & TV',
    'Décodeurs et récepteurs',
    'Décodeur explicitement nommé',
  ],
  [
    /^MULTIMETRE\b|^MULTI\s+ANALOG/,
    'Mesure & Test',
    'Multimètres',
    'Multimètre explicitement nommé',
  ],
  [
    /CORDONS? DE MULTIMETRE|^SONDE\b/,
    'Mesure & Test',
    'Cordons et sondes',
    'Accessoire de mesure explicite',
  ],
  [
    /^INDICATEUR\s+(?:NUMERIQUE|DC)|^VOLTMETRE\b|^AMPEREMETRE\b/,
    'Mesure & Test',
    'Indicateurs et appareils de mesure',
    'Appareil de mesure explicite',
  ],
  [
    /^(?:\d+\s+DE\s+)?FER A SOUDER|^STATION.*SOUD/,
    'Outillage',
    'Fers et stations à souder',
    'Fer ou station à souder explicite',
  ],
  [
    /^PANNE.*(?:SOUD|FER)|POUR FER A SOUDER/,
    'Outillage',
    'Pannes et pièces de soudure',
    'Pièce de fer à souder explicitement nommée',
  ],
  [
    /^ETAIN\b|^FLUX\b|^TRESSE.*DESSOUD|^PATE.*SOUD/,
    'Outillage',
    'Consommables de soudure',
    'Consommable de soudure explicite',
  ],
  [
    /TOURNEVIS|^PINCE\b/,
    'Outillage',
    'Tournevis et pinces',
    'Outil explicitement nommé',
  ],
  [
    /^AMPOULE\b/,
    'Accessoires électriques',
    'Ampoules et éclairage',
    'Ampoule explicitement nommée',
  ],
  [
    /^INTERRUPTEUR\b/,
    'Accessoires électriques',
    'Interrupteurs et commutateurs',
    'Interrupteur explicitement nommé',
  ],
  [
    /^VENTILATEUR\s+\d+V/,
    'Ventilateurs',
    'Ventilateurs de refroidissement',
    'Ventilateur avec tension explicite',
  ],
  [
    /VENTILATEUR/,
    'Ventilateurs',
    'Pièces de ventilateurs',
    'Pièce pour ventilateur explicitement nommée',
  ],
  [
    /^LOUPE\b/,
    'Loupe & Optique',
    'Loupes éclairantes',
    'Loupe explicitement nommée',
  ],
];
function classify(product) {
  const name = normalize(product.nom_produit ?? product.nomProduit);
  const parent = product.categorie_nom ?? product.categorie?.nom;
  for (const [pattern, categorie, sousCategorie, justification] of rules) {
    if (pattern.test(name)) return { categorie, sousCategorie, justification };
  }
  if (
    /^(?:TDA|STK|AN|LA|LM|TEA|TBA|TA)\s*\d{3,5}/.test(name) &&
    ['Audio & Son', 'Composants Électroniques'].includes(parent)
  ) {
    return {
      categorie: parent,
      sousCategorie:
        parent === 'Audio & Son'
          ? 'Circuits intégrés audio'
          : 'Circuits intégrés',
      justification:
        'Famille de circuit intégré, catégorie existante conservée',
    };
  }
  return null;
}
module.exports = { taxonomy, classify };
