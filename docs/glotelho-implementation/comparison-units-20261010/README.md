# Comparaison des unités explicites — 10 octobre 2026

Cette avancée répond au point L1 « normaliser les unités sans effacer la valeur source » du plan A–Z et facilite la lecture des caractéristiques dans L3. Elle ne clôture ni l'enrichissement du catalogue ni la validation technique des équivalences.

## Comportement

Auparavant, le comparateur signalait `1 A` et `1000 mA` comme une différence. Il conserve désormais ces deux textes dans leurs cellules, reconnaît leur même valeur et affiche « Même valeur après conversion ». Le filtre des différences exclut ce champ. Les différences réelles, les informations incomplètes, les références, les prix et le stock gardent leur traitement existant.

La conversion est limitée aux nombres décimaux explicites (point décimal), unités simples V/A/Ω/W/F/H/Hz/m/s et préfixes autorisés. Les facteurs sont ceux des [préfixes SI du BIPM](https://www.bipm.org/en/measurement-units/si-prefixes). La casse reste significative : mA ≠ MA. Les chaînes décimales sont comparées exactement, sans arrondi en nombres flottants et sans BigInt, pour préserver la compatibilité des anciens navigateurs. Les deux symboles micro µ/μ et la notation ASCII u sont acceptés.

Les virgules sont laissées littérales, car le catalogue ne précise pas leur convention d'origine. Plages, tolérances, maximums, conditions DC, unités composées, valeurs multiples et unités non reconnues ne sont pas convertis. Les libellés ne sont pas fusionnés et une valeur absente ne devient pas égale à une valeur renseignée. Aucune donnée métier, API, migration, backend ou interface administrateur n'est modifiée. La comparaison de valeurs n'établit jamais une compatibilité de remplacement.

## Vérification locale

- 106 tests Node réussis, dont quatre nouveaux groupes sur les conversions, la précision, les dimensions et les valeurs ambiguës/incomplètes.
- Lint des quatre modules concernés et build Vite de production réussis (`VITE_API_URL=https://api.newoteg.com`).
- Recette navigateur existante étendue : quatorze groupes réussis en mode moderne puis quatorze avec le bundle legacy réellement chargé. Stockage refusé/corrompu, synchronisation, réponses retardées, erreurs réseau, références retirées et filtre conservés.
- Nouvelles valeurs fictives exercées en FR/EN, cinq largeurs 360/390/768/1024/1440, aucun débordement de page. Tableau défilable sur mobile. Captures 390/1440 inspectées.
- Toutes les API de cette recette sont simulées, les requêtes externes bloquées et aucune écriture métier effectuée. Les essais dans Edge avec le JavaScript legacy ne prouvent pas le fonctionnement sur un téléphone Android physique.
- La logique de conversion se trouve dans les seuls chunks `Comparison-Cxect-tV.js` et `Comparison-legacy-BTf16n0Y.js`, pas dans les bundles initiaux. Cela ne constitue pas une nouvelle mesure LCP.

Preuves locales : `C:/Users/pc/Documents/Newoteg/output/implementation-work/comparison-units-20261010/modern/` et `legacy/` (résultats et captures). La recette pleine page ne dépend plus d'une position verticale exactement nulle après un focus clavier : l'ancrage du navigateur peut déplacer la vue de quelques pixels, sans changer le tableau ni la capture complète. Les assertions de défilement et de débordement restent actives.

## Livraison

Sources prêtes après les vérifications locales. La CI distante, la fusion et les ressources réellement servies doivent être vérifiées séparément avant de déclarer cette correction publiée. Aucun changement d'abonnement Cloudflare ni activation du renderer catalogue Railway n'est inclus.
