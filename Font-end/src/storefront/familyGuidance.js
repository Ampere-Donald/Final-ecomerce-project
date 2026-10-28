// General selection guidance, not specifications or certification of our stock.
// Sources read on 2026-10-28; do not infer an exact part from a similar number.
export const familyGuidance = {
  condensateurs: {
    fr: ['Relevez la capacité, la tension et la polarité de la pièce à remplacer.',
      'Comparez aussi le diamètre, la hauteur et l’écartement des connexions. Deux condensateurs de même valeur peuvent avoir des formats différents.',
      'Pour valider un remplacement, faites vérifier la série, la température et le courant d’ondulation dans la documentation de la référence exacte.'],
    en: ['Record the capacitance, voltage and polarity of the part being replaced.',
      'Also compare diameter, height and connection spacing. Capacitors with the same value can have different dimensions.',
      'To validate a replacement, check the series, temperature rating and ripple current in the exact part’s documentation.'],
    source: ['Nichicon — Application Guidelines', 'https://www.nichicon.co.jp/english/products/pdf/aluminum-e.pdf'],
  },
  transistors: {
    fr: ['Recopiez toute la référence, y compris ses lettres et suffixes, puis comparez le boîtier et le brochage.',
      'Une valeur maximale de tension, de courant ou de puissance ne suffit pas à valider un remplacement. Les conditions de fonctionnement et la dissipation doivent aussi convenir.',
      'Envoyez la référence de l’appareil et une photo lisible de la pièce pour préparer une demande de conseil.'],
    en: ['Copy the complete reference, including letters and suffixes, then compare the package and pinout.',
      'A maximum voltage, current or power rating alone does not establish a replacement. Operating conditions and heat dissipation also need to match.',
      'Provide the equipment reference and a readable photo of the part when asking for advice.'],
    source: ['onsemi — 2N3773, limites et conditions', 'https://www.onsemi.com/pdf/datasheet/2n3773-d.pdf'],
  },
  'circuits-integres-audio': {
    fr: ['Cette sélection réunit des fonctions audio et télévision. Identifiez le rôle du circuit dans l’appareil : amplification, commande ou traitement de signal.',
      'La série AN ne désigne pas une fonction unique : le document Panasonic de l’AN5071 décrit un circuit de tuner TV.',
      'Comparez la référence complète, le nombre de broches, leur disposition et la documentation du montage avant de retenir une alternative.'],
    en: ['This selection includes audio and television functions. Identify the circuit’s role in the equipment: amplification, control or signal processing.',
      'The AN prefix does not identify a single function: Panasonic’s AN5071 document describes a TV tuner circuit.',
      'Compare the complete reference, pin count, pin arrangement and equipment documentation before choosing an alternative.'],
    source: ['Panasonic — AN5071, document archivé', 'https://www.pilianidis.gr/images/sync_products/03-AN5071/03-an5071.pdf'],
  },
  'alimentations-stabilisees': {
    fr: ['Relevez la tension de sortie, le courant nécessaire et le type de charge à alimenter.',
      'Un moteur ou une charge capacitive peut demander un courant de démarrage qui déclenche une protection. Faites vérifier ce besoin avec le modèle exact.',
      'Confirmez l’entrée secteur, les connexions, la ventilation et les conditions d’installation. Le mot « étanche » dans un nom ne précise pas à lui seul un indice IP.'],
    en: ['Record the required output voltage, current and type of load.',
      'A motor or capacitive load may require startup current that triggers protection. Check that requirement against the exact model.',
      'Confirm the mains input, connections, ventilation and installation conditions. The word “waterproof” in a name alone does not establish an IP rating.'],
    source: ['MEAN WELL — FAQ, charge et démarrage', 'https://www.meanwell.com/qa.aspx'],
  },
  multimetres: {
    fr: ['Listez les mesures nécessaires : tension continue ou alternative, résistance, continuité et autres fonctions réellement utiles.',
      'Pour une mesure électrique, vérifiez la catégorie de mesure et la tension admissible dans la notice du modèle, ainsi que les cordons et les protections.',
      'Les appellations de série ne garantissent pas des fonctions identiques : faites confirmer la version, les accessoires inclus et la notice disponible.'],
    en: ['List the measurements you need: DC or AC voltage, resistance, continuity and any other required functions.',
      'For electrical measurements, check the measurement category and voltage rating in the model’s manual, together with test leads and protection.',
      'Series names do not guarantee identical functions: confirm the version, included accessories and available manual.'],
    source: ['Fluke — ABCs of multimeter safety', 'https://content.fluke.com/promotions/promo-dmm/0518-DMM-campaign/DMM/fluke_DMM-fr/files/safetyguidelines.pdf'],
  },
};
