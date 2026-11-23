'use strict';
// University project dossiers; documentary preparation, not tested hardware kits.
const fs = require('node:fs'),
  path = require('node:path'),
  { randomUUID } = require('node:crypto');
const definitions = [
  {
    slug: 'tp-reseaux-resistifs',
    titre: 'Mesurer et modéliser un réseau de résistances',
    titreEn: 'Measure and model a resistor network',
    theme: 'mesure-signal',
    objectif:
      'Comparer les associations série et parallèle, calculer les valeurs attendues puis analyser les résultats de mesure. Le compte rendu distingue les valeurs nominales, la tolérance et les conditions de mesure.',
    principle:
      'Les lois des circuits et les relations série/parallèle permettent de prédire le comportement du réseau. Le protocole doit tenir compte de l’instrument et du mode de mesure.',
    refs: [
      ['106284', 2, 'Résistances pour les associations à étudier', true],
      ['0000161', 1, 'Multimètre pour la caractérisation', false],
    ],
    documents: [
      [
        'OpenStax — résistances en série et parallèle',
        'https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel',
      ],
      [
        'Vishay — principes des résistances fixes',
        'https://www.vishay.com/docs/28771/basics.pdf',
      ],
    ],
  },
  {
    slug: 'tp-reponse-temporelle-rc',
    titre: 'Étudier la réponse temporelle d’un circuit RC',
    titreEn: 'Study the time response of an RC circuit',
    theme: 'mesure-signal',
    objectif:
      'Préparer un modèle de charge et décharge, déterminer les grandeurs observables puis comparer modèle et mesures. Définir un protocole compatible avec les constantes de temps et l’instrumentation disponible.',
    principle:
      'La résistance et la capacité déterminent une constante de temps. Le choix d’une méthode de mesure dépend aussi des tolérances, des courants de fuite et de l’instrument utilisé.',
    refs: [
      ['106284', 1, 'Résistance du réseau RC à dimensionner', true],
      ['123396', 1, 'Condensateur du réseau RC à dimensionner', true],
      [
        '0000161',
        1,
        'Instrument de mesure à sélectionner selon le protocole',
        false,
      ],
    ],
    documents: [
      [
        'OpenStax — circuits RC',
        'https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits',
      ],
      [
        'Nichicon — conditions d’utilisation des électrolytiques',
        'https://www.nichicon.co.jp/english/series_items/catalog_pdf/e-al_guide.pdf',
      ],
    ],
  },
  {
    slug: 'projet-commutation-transistor',
    titre: 'Concevoir un étage de commutation à transistor',
    titreEn: 'Design a transistor switching stage',
    theme: 'commande',
    objectif:
      'Identifier les conditions de commande d’un transistor, dimensionner son étage d’entrée et caractériser sa réponse avec une charge définie. Justifier le choix de chaque composant avant le montage.',
    principle:
      'Le transistor constitue l’interface entre une commande et une charge. Le dimensionnement doit prendre en compte la technologie, les conditions de commande, la dissipation et les protections du montage.',
    refs: [
      [
        '103001',
        1,
        'Transistor 2N2222 pour l’étude, variante à rapprocher de sa documentation',
        true,
      ],
      [
        '0000161',
        1,
        'Instrument pour les mesures définies par le protocole',
        false,
      ],
    ],
    documents: [
      [
        'onsemi — référence de famille P2N2222A',
        'https://www.onsemi.com/pdf/datasheet/p2n2222a-d.pdf',
      ],
    ],
  },
  {
    slug: 'projet-interface-relais',
    titre: 'Préparer une interface de commande à relais',
    titreEn: 'Prepare a relay control interface',
    theme: 'commande',
    objectif:
      'Distinguer la commande du module et les contacts de sortie, identifier les états et préparer un protocole de vérification avec une charge adaptée. Documenter le raccordement du module effectivement utilisé.',
    principle:
      'L’interface de commande et la partie commutée possèdent des caractéristiques distinctes. Le sens des connexions, le comportement de l’entrée et les conditions de la charge doivent être établis pour le module.',
    refs: [
      ['304003', 1, 'Carte à un relais pour l’étude de l’interface', true],
      ['0000161', 1, 'Instrument de contrôle selon le protocole', false],
    ],
    documents: [
      [
        'Omron — principes des relais, document général',
        'https://www.ia.omron.com/support/guide/36/further_information.html',
      ],
    ],
  },
  {
    slug: 'tp-redressement-filtrage',
    titre: 'Analyser un étage de redressement et de filtrage',
    titreEn: 'Analyse a rectification and filtering stage',
    theme: 'alimentation-energie',
    objectif:
      'Expliquer le rôle du pont et du condensateur, définir une charge et étudier l’influence du filtrage sur les grandeurs observables. Le montage et les valeurs de fonctionnement doivent être dimensionnés dans le cadre du TP.',
    principle:
      'Le pont redresse la source alternative adaptée au montage. Le condensateur intervient dans le lissage en fonction de la charge et des conditions du circuit.',
    refs: [
      ['114026', 1, 'Pont KBL406 pour l’étude de redressement', true],
      ['123396', 1, 'Condensateur pour l’étude du filtrage', true],
      ['0000161', 1, 'Instrument selon les grandeurs mesurées', false],
    ],
    documents: [
      [
        'Nichicon — application des condensateurs électrolytiques',
        'https://www.nichicon.co.jp/english/series_items/catalog_pdf/e-al_guide.pdf',
      ],
    ],
  },
  {
    slug: 'projet-regulation-lineaire',
    titre: 'Étudier un étage de régulation linéaire',
    titreEn: 'Study a linear voltage regulation stage',
    theme: 'alimentation-energie',
    objectif:
      'Identifier le régulateur, préparer le circuit d’application et analyser le comportement sous différentes charges. Déterminer les conditions d’entrée, la dissipation et les composants externes à partir de la documentation de la variante.',
    principle:
      'Une régulation linéaire maintient une sortie dans les conditions prévues par le composant. Le bilan thermique et la marge de fonctionnement dépendent du circuit et de sa charge.',
    refs: [
      [
        '125010',
        1,
        'Régulateur annoncé 7812, fabricant et variante à rapprocher du document',
        true,
      ],
      ['0000161', 1, 'Instrument pour le protocole de caractérisation', false],
    ],
    documents: [
      [
        'ST — famille L78, circuit d’application et conditions',
        'https://www.st.com/resource/en/datasheet/l78.pdf',
      ],
    ],
  },
];
function dossiers(snapshot) {
  const rows = fs
      .readFileSync(snapshot, 'utf8')
      .trim()
      .split('\n')
      .map(JSON.parse),
    byCode = new Map();
  for (const p of rows) {
    const code = String(p.internal_reference);
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(p);
  }
  return definitions.map((d, i) => {
    const missing = [];
    const lignes = d.refs.map(([code, quantite, role, necessaire]) => {
      const matches = byCode.get(code) || [];
      const p = matches.length === 1 ? matches[0] : null;
      if (!p) missing.push(matches.length ? 'AMBIGUOUS:' + code : code);
      return {
        produitId: p?.id,
        referenceSouhaitee: code,
        quantite,
        role,
        necessaire,
      };
    });
    return {
      theme: d.theme,
      review: {
        status: 'draft_requires_project_review',
        hardwareTested: false,
        kitComplete: false,
        missingReferences: missing,
      },
      dto: {
        requestId: randomUUID(),
        slug: d.slug,
        titre: d.titre,
        titreEn: d.titreEn,
        resume:
          'Dossier universitaire de conception et de caractérisation. ' +
          d.principle,
        resumeEn:
          'University design and characterisation dossier. The circuit must be dimensioned and reviewed before assembly; this material list is not a complete tested kit.',
        objectif: d.objectif + '\n\nPrincipe : ' + d.principle,
        prerequis:
          'Lois des circuits, lecture de schéma et utilisation des instruments. Le protocole et le dimensionnement sont à préparer avec l’encadrant.',
        contraintes:
          'Dossier documentaire non testé en boutique. Liste de pièces d’étude, sans garantie de kit complet. Prévoir séparément le montage, les connexions, les éléments de commande ou de charge et une source adaptée au protocole. ' +
          (d.slug === 'tp-redressement-filtrage'
            ? 'Utiliser une source basse tension isolée adaptée, jamais un raccordement direct au secteur. '
            : '') +
          'Consulter les limites du modèle et de sa variante avant montage.',
        niveau: 'INTERMEDIAIRE',
        ordre: i + 1,
        documents: d.documents.map(([titre, url]) => ({ titre, url })),
        lignes,
      },
    };
  });
}
if (require.main === module) {
  const [snapshot, out] = process.argv.slice(2);
  if (!snapshot || !out) throw Error('INPUT_PATHS_REQUIRED');
  fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  const rows = dossiers(snapshot);
  fs.writeFileSync(
    path.join(out, 'projets-universitaires.json'),
    JSON.stringify(rows, null, 2) + '\n',
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      dossiers: rows.length,
      missingReferences: rows.flatMap((p) => p.review.missingReferences),
      productionWritten: false,
    }),
  );
}
module.exports = { dossiers };
