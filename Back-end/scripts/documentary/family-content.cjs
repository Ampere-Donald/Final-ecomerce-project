'use strict';
// Editorial guidance only. Numeric specifications remain in existing product attributes.
const profiles = [
  [
    'condensateur',
    'passifs',
    /condens|capacitor|\bcondo\b/i,
    'Ce composant stocke une charge électrique. Selon sa technologie et le schéma, il intervient dans le filtrage, le découplage ou une fonction de temporisation.',
    'La capacité seule ne caractérise pas un condensateur : la tension nominale, la technologie, la polarité éventuelle, les dimensions et les conditions de fonctionnement participent au choix.',
    [
      'Comparer la capacité et la tension nominale dans les conditions du circuit.',
      'Vérifier la technologie et la polarité éventuelle.',
      'Contrôler diamètre, hauteur et entraxe.',
      'Consulter la série pour la température, l’ESR et le courant d’ondulation lorsqu’ils sont pertinents.',
    ],
    [
      'Filtrage ou découplage selon le schéma.',
      'Étude de charge et décharge dans un montage dimensionné.',
    ],
    'Dans un projet, identifier la fonction recherchée avant de dimensionner le composant. Relier les calculs aux tolérances et aux caractéristiques de la série choisie.',
    'Pourquoi la capacité ne suffit-elle pas pour choisir ?',
    'Deux condensateurs de même capacité peuvent avoir des technologies, dimensions et conditions de fonctionnement différentes. Le schéma et la documentation de série déterminent les autres critères.',
  ],
  [
    'resistance',
    'passifs',
    /résist|resist(?!ance de fer)/i,
    'Une résistance établit une relation entre courant et tension et dissipe de l’énergie sous forme de chaleur. Sa fonction dépend du montage : polarisation, limitation de courant, mesure ou charge.',
    'Comparer la valeur nominale, la tolérance, la puissance et la technologie. Une résistance de puissance ou chauffante répond à des contraintes de montage et de refroidissement particulières.',
    [
      'Comparer valeur et tolérance.',
      'Vérifier la dissipation dans les conditions réelles.',
      'Contrôler dimensions, fixation et raccordement.',
    ],
    [
      'Étude de réseaux résistifs.',
      'Polarisation et limitation de courant dans un circuit dimensionné.',
    ],
    'Calculer le courant et la dissipation dans chaque situation de fonctionnement. La valeur choisie doit ensuite être rapprochée de la documentation du composant et des conditions thermiques.',
    'Pourquoi vérifier la puissance en plus de la valeur ?',
    'La résistance doit supporter la dissipation du circuit dans ses conditions de montage. Une valeur identique ne garantit pas une tenue thermique identique.',
  ],
  [
    'transistor',
    'semiconducteurs',
    /transistor|mosfet|^(?:[ABCD]\s?\d{3,5}|B[CFD]\s?\d+)\b|\b(?:bc\s?\d|bd\s?\d|2n\d|irf\d|tip\d)/i,
    'Un transistor permet de commander un courant ou de traiter un signal. Identifier sa technologie et sa polarité avant de choisir son circuit de commande.',
    'Un transistor bipolaire et un transistor à effet de champ n’utilisent pas le même mode de commande. Le boîtier, le brochage, les conditions de commande et la dissipation doivent correspondre au montage.',
    [
      'Identifier technologie et polarité.',
      'Comparer le brochage dans la vue donnée par le fabricant.',
      'Vérifier les conditions de commande et de fonctionnement.',
      'Comparer les contraintes thermiques et le montage sur dissipateur.',
    ],
    [
      'Étude d’un étage de commutation.',
      'Traitement analogique selon la technologie du composant.',
    ],
    'Définir la charge, la commande et les conditions thermiques. Les limites maximales d’une fiche technique ne constituent pas un point de fonctionnement à appliquer directement.',
    'Un boîtier identique garantit-il un remplacement ?',
    'Le boîtier ne garantit ni la même technologie, ni le même brochage, ni les mêmes conditions de fonctionnement. Une comparaison de références est nécessaire.',
  ],
  [
    'diode',
    'semiconducteurs',
    /diode|redresse|rectifier|pont.*diode/i,
    'Une diode présente un comportement dépendant du sens de polarisation. Les diodes de redressement, de signal, Zener ou Schottky répondent à des fonctions différentes.',
    'La sélection repose sur la fonction, la polarité, les limites électriques et les conditions thermiques. Pour un pont, vérifier également le repérage des bornes et le montage.',
    [
      'Identifier la technologie et la fonction.',
      'Vérifier la polarité ou les bornes du pont.',
      'Comparer les contraintes électriques et thermiques documentées.',
    ],
    [
      'Étude de redressement selon le type.',
      'Protection ou traitement de signal selon la référence.',
    ],
    'Choisir la diode à partir du schéma, de la charge et du régime de fonctionnement. Documenter les conditions qui justifient ce choix.',
    'Toutes les diodes assurent-elles la même fonction ?',
    'La technologie détermine des comportements et limites différents. Le choix doit correspondre à la fonction recherchée et à la référence documentée.',
  ],
  [
    'relais',
    'modules',
    /relais|relay/i,
    'Un relais commande des contacts à partir d’une commande de bobine ou d’une interface intégrée au module. Identifier d’abord si l’article est un relais seul ou une carte de commande.',
    'Les caractéristiques de la bobine et celles des contacts décrivent des fonctions distinctes. La nature de la charge influence également les conditions de commutation.',
    [
      'Distinguer relais seul et module.',
      'Comparer alimentation et nature de la commande.',
      'Identifier la disposition des contacts et le brochage.',
      'Vérifier les conditions de la charge commutée.',
    ],
    [
      'Étude d’une commande de charge.',
      'Interface de commutation dans un montage documenté.',
    ],
    'Identifier l’étage de commande nécessaire et les protections prévues par le schéma. Un module et un relais seul ne se raccordent pas systématiquement de la même manière.',
    'La tension de bobine décrit-elle les contacts ?',
    'La bobine et les contacts possèdent des caractéristiques distinctes. Il faut consulter les deux ensembles de données pour vérifier l’utilisation.',
  ],
  [
    'connectique',
    'connectique',
    /câble|cable|cordon|adaptateur|connecteur|fiche|prise|hdmi|rca|jack|usb|socle.*(?:jk|alim)/i,
    'Cet article assure une liaison ou une adaptation entre équipements. Identifier les connecteurs, leur genre, le sens de liaison et la fonction du signal.',
    'La forme du connecteur ne suffit pas à établir les performances. Une adaptation mécanique, une conversion active et un simple cordon doivent être distingués.',
    [
      'Comparer connecteurs et genres des deux côtés.',
      'Vérifier sens de liaison et nature du signal.',
      'Contrôler longueur, alimentation éventuelle et caractéristiques documentées.',
    ],
    [
      'Raccordement d’équipements compatibles.',
      'Interconnexion d’un banc ou d’un projet.',
    ],
    'Établir la chaîne de liaison et les interfaces de chaque équipement. Vérifier les capacités du câble ou de l’adaptateur pour l’usage demandé.',
    'Le connecteur suffit-il à garantir la compatibilité ?',
    'Le signal, le sens de liaison, les fonctions et les performances doivent également correspondre. Les équipements et l’accessoire doivent être documentés ensemble.',
  ],
  [
    'alimentation',
    'alimentations',
    /alimentation|\balimt\b|charg(?:eur|er)|convertisseur|transformateur|régulateur|regulateur|\breg\s*\d|\blm317\b/i,
    'Cet article intervient dans l’alimentation ou la conversion d’énergie d’un montage. Identifier sa fonction et distinguer une alimentation complète d’un composant à intégrer.',
    'Les caractéristiques d’entrée et de sortie, la nature du courant, les connexions et les conditions de charge doivent être rapprochées des besoins du montage.',
    [
      'Identifier la fonction exacte et le type d’article.',
      'Comparer entrée, sortie et polarité.',
      'Vérifier raccordement, charge et conditions thermiques.',
    ],
    [
      'Alimentation d’un montage compatible.',
      'Étude de conversion ou de régulation selon la référence.',
    ],
    'Établir les besoins de chaque sous-ensemble et vérifier les conditions de fonctionnement dans la documentation. Prévoir les éléments externes requis lorsque l’article est un composant.',
    'Une référence de régulateur constitue-t-elle une alimentation complète ?',
    'Un composant de régulation nécessite un circuit et des éléments externes conformes à sa documentation. Le contenu réellement vendu doit être identifié.',
  ],
  [
    'mesure',
    'mesure-outillage',
    /multim|mesure|oscillo|testeur|sonde/i,
    'Un instrument de mesure se choisit à partir de la grandeur étudiée, du domaine de fonctionnement et des fonctions disponibles sur le modèle.',
    'La documentation du modèle précise les modes de mesure, les accessoires et les limites d’utilisation. Les marquages et conditions de mesure doivent être pris en compte.',
    [
      'Identifier le modèle et ses fonctions.',
      'Vérifier plages, limites et accessoires nécessaires.',
      'Consulter les conditions d’utilisation du fabricant.',
    ],
    [
      'Mesures sur un montage adapté à l’instrument.',
      'Préparation de travaux pratiques documentés.',
    ],
    'Définir le protocole de mesure, les connexions et les résultats attendus. Consigner le mode et les conditions utilisés pour interpréter les résultats.',
    'Pourquoi identifier les accessoires avant un TP ?',
    'Le mode de mesure et les connexions peuvent nécessiter des accessoires précis. Leur présence doit être distinguée des fonctions annoncées pour l’instrument.',
  ],
  [
    'outillage',
    'mesure-outillage',
    /souder|soudure|tournevis|pince|outil|pompe.*dessoud|fer.*soud|pane.*fer/i,
    'Cet outil accompagne les opérations de montage ou de maintenance. Choisir son format, ses fonctions et ses consommables selon le travail prévu.',
    'La compatibilité des accessoires, les conditions d’utilisation et le contenu fourni doivent être vérifiés pour le modèle concerné.',
    [
      'Identifier le modèle et l’opération prévue.',
      'Vérifier accessoires et consommables compatibles.',
      'Contrôler alimentation éventuelle et conditions d’utilisation.',
    ],
    [
      'Préparation d’un poste de montage.',
      'Maintenance selon les capacités de l’outil.',
    ],
    'Lister les opérations à réaliser et les accessoires associés. Distinguer les éléments fournis de ceux à prévoir séparément pour préparer le poste de travail.',
    'Comment préparer le matériel nécessaire ?',
    'Lister les opérations, l’outil, ses accessoires et les consommables. Vérifier ensuite ce qui est effectivement fourni avec l’article.',
  ],
  [
    'module',
    'modules',
    /module|carte|capteur|arduino|esp32|afficheur|écran|ecran|microcontrôleur|microcontroleur/i,
    'Une carte ou un module regroupe des fonctions à intégrer dans un équipement ou un projet. Identifier la référence et la révision avant de préparer le raccordement.',
    'L’alimentation, les interfaces, les connexions et les éléments externes nécessaires dépendent du modèle. Une carte de remplacement et un module pédagogique ne répondent pas au même usage.',
    [
      'Identifier référence et révision.',
      'Comparer alimentation, interfaces et connexions.',
      'Vérifier dimensions, fixations et éléments associés.',
    ],
    [
      'Intégration selon la fonction documentée.',
      'Remplacement lorsqu’une correspondance de référence est établie.',
    ],
    'Décomposer le projet en sous-ensembles et vérifier les interfaces entre chacun. La présence d’un connecteur commun ne garantit pas une interface électrique ou logicielle identique.',
    'Que faut-il vérifier avant de raccorder un module ?',
    'Identifier son alimentation, les fonctions de ses connexions et les conditions des interfaces. Consulter la documentation correspondant au modèle et à sa révision.',
  ],
  [
    'circuit',
    'semiconducteurs',
    /circuit|\b(?:viper|tda|tea|uc\d|tl\d|ne\d|lm\d|la\d|str\b|stk)/i,
    'Un circuit intégré réalise une ou plusieurs fonctions définies par sa référence. La référence complète, son suffixe et le boîtier permettent de sélectionner la documentation pertinente.',
    'Le brochage, les conditions d’alimentation, les signaux et les composants externes requis dépendent de la variante. Les informations de famille doivent être rapprochées de la référence concernée.',
    [
      'Comparer référence complète et suffixe.',
      'Vérifier boîtier et orientation du brochage.',
      'Consulter alimentation et composants externes du schéma.',
    ],
    [
      'Étude d’un circuit d’application documenté.',
      'Maintenance d’un équipement identifié.',
    ],
    'Partir du circuit d’application du fabricant et relever les conditions de chaque interface. Les exemples de documentation nécessitent une adaptation justifiée au projet.',
    'Pourquoi le suffixe et le boîtier comptent-ils ?',
    'Ils peuvent identifier des variantes de présentation ou de fonctionnement. Le brochage et les conditions doivent être pris dans la documentation correspondante.',
  ],
  [
    'equipement',
    'equipement',
    /.*/,
    'Cet article s’intègre à un équipement ou à une opération de maintenance. Son rôle doit être rapproché de l’équipement concerné et de ses contraintes de montage.',
    'Préparer le choix à partir de la référence, de la fonction recherchée et des raccordements. Les dimensions, fixations et éléments associés permettent de compléter la comparaison.',
    [
      'Comparer la référence et la fonction.',
      'Vérifier dimensions et fixation.',
      'Contrôler raccordements et éléments associés.',
    ],
    ['Montage ou maintenance de l’équipement correspondant.'],
    'Identifier le sous-ensemble concerné et ses interfaces. Une comparaison de photos aide à préparer la recherche, mais ne remplace pas les caractéristiques nécessaires au choix.',
    'Comment préparer une demande de conseil ?',
    'Indiquer la référence de l’article, celle de l’équipement et la fonction recherchée. Les photos existantes peuvent compléter ces informations.',
  ],
];

profiles.unshift(
  [
    'potentiometre',
    'passifs',
    /potentiom|\bpot\s|resist\s+var/i,
    'Un potentiomètre est un composant résistif réglable. Il peut servir au réglage ou à la définition d’un point de fonctionnement selon son raccordement.',
    'La valeur totale, la loi de variation, le nombre de voies, la disposition des connexions et le format mécanique participent au choix. Distinguer le composant de son bouton de commande.',
    [
      'Comparer valeur et loi de variation.',
      'Identifier les connexions et le nombre de voies.',
      'Contrôler axe, fixation et encombrement.',
    ],
    [
      'Réglage dans un circuit documenté.',
      'Étude d’un réseau résistif variable.',
    ],
    'Définir la fonction du réglage et les conditions du circuit. Identifier les bornes et documenter la plage de réglage réellement recherchée.',
    'Pourquoi comparer le format mécanique ?',
    'L’axe, la fixation et la disposition des connexions déterminent l’intégration. Une valeur résistive identique ne garantit pas un montage mécanique identique.',
  ],
  [
    'interrupteur',
    'equipement',
    /interrupteur|bouton.poussoir|\bint\s+(?:on|off|lum|a\s)/i,
    'Cet article permet une commande ou une commutation suivant sa configuration. Identifier le fonctionnement momentané ou maintenu et la disposition des contacts.',
    'Le nombre de bornes, les positions mécaniques et les conditions de la charge doivent être rapprochés du schéma. Un éclairage intégré peut posséder un raccordement distinct.',
    [
      'Comparer fonctionnement et positions.',
      'Identifier l’organisation des contacts.',
      'Vérifier fixation, raccordement et conditions de charge.',
    ],
    [
      'Commande d’un équipement compatible.',
      'Interface de commande dans un montage documenté.',
    ],
    'Préparer le schéma de raccordement à partir de la configuration des contacts. Distinguer la commande utilisateur de l’étage qui alimente la charge.',
    'Le nombre de pattes suffit-il pour choisir ?',
    'Il faut aussi établir la fonction des contacts, le mode de commande et les conditions électriques. Le seul nombre de pattes ne donne pas cette correspondance.',
  ],
  [
    'protection',
    'equipement',
    /fusible|disjoncteur|thermostat|klixon|protection thermique/i,
    'Une protection est choisie pour une fonction et des conditions de déclenchement définies. Un fusible, un disjoncteur et un thermostat ne sont pas interchangeables sur la seule base de leur format.',
    'La référence, le mode de fonctionnement et les caractéristiques nominales doivent correspondre à l’équipement et à sa documentation. Conserver la fonction de protection prévue dans le montage.',
    [
      'Identifier le type et la référence.',
      'Comparer les caractéristiques et conditions documentées.',
      'Vérifier format, montage et raccordement.',
    ],
    ['Maintenance d’une fonction de protection identifiée.'],
    'Définir la fonction de protection à partir des besoins du montage. Justifier sa sélection dans le dossier de conception et la confronter à la documentation du composant.',
    'Une protection se choisit-elle seulement par son format ?',
    'Le format est un critère de montage. La fonction et les caractéristiques documentées doivent aussi correspondre à l’équipement.',
  ],
  [
    'energie-stockee',
    'alimentations',
    /^(?:pile|batterie|accu)\b|lot de \d+ piles/i,
    'Une pile ou une batterie fournit une énergie électrique selon sa technologie et son format. Identifier le caractère rechargeable ou non rechargeable avant toute utilisation.',
    'La tension, les dimensions, la polarité et le raccordement doivent correspondre à l’équipement. Pour une batterie rechargeable, le chargeur doit être adapté à la technologie et aux conditions spécifiées.',
    [
      'Comparer technologie et caractère rechargeable.',
      'Vérifier tension, format, polarité et connexions.',
      'Consulter les conditions du dispositif et du chargeur éventuel.',
    ],
    ['Alimentation autonome d’un équipement compatible.'],
    'Établir les besoins énergétiques du projet et les contraintes de raccordement. Distinguer le stockage, la charge et l’alimentation des autres sous-ensembles.',
    'Toutes les piles et batteries se rechargent-elles ?',
    'Le caractère rechargeable dépend de la technologie et de la référence. Utiliser uniquement les conditions et dispositifs de charge explicitement prévus pour l’article.',
  ],
);

function profileFor(product) {
  const title = product.original.title;
  const sub = product.original.subcategory?.name || '';
  // Match descriptive titles before broad subcategories; never infer numeric specifications.
  return (
    profiles.slice(0, -1).find((p) => p[2].test(title)) ||
    profiles.slice(0, -1).find((p) => p[2].test(sub)) ||
    profiles.at(-1)
  );
}
function familyContent(product, documents = []) {
  const [
    key,
    family,
    ,
    intro,
    detail,
    replacement,
    applications,
    integration,
    question,
    answer,
  ] = profileFor(product);
  return {
    key,
    content: {
      schemaVersion: 1,
      family,
      locales: {
        fr: {
          summary: intro.slice(0, 700),
          paragraphs: [intro, detail],
          applications,
          integration: [
            integration,
            'Pour un travail universitaire, présenter le schéma, les hypothèses et les critères de choix, puis relier les résultats aux documents utilisés.',
          ],
          replacement,
          missing: [],
          faq: [{ question, answer }],
          documents,
        },
      },
    },
  };
}
module.exports = { profiles, profileFor, familyContent };
