# Maillage du pilote SEO — version préparée

État au 31 octobre 2026 : complément intégré sur `codex/seo-languages`, **non publié**. Le schéma couvre les vingt références pilotes, cinq familles et quatre guides dans les deux langues. La recette visuelle finale reste à terminer.

## Liens disponibles dans le HTML

| Départ | Destination | Règle |
|---|---|---|
| Accueil | Cinq familles dédiées | Liens explicites vers condensateurs, transistors, circuits audio/TV, alimentations stabilisées et multimètres ; les sélections générales de l’accueil conservent leur périmètre |
| Accueil | Quatre guides et index des guides | Titres et résumés issus de l’index public sélectionné, dans la langue de la page |
| Pied de page | Index des guides | Point d’entrée stable depuis les pages publiques et les parcours existants |
| Famille | Fiches et pagination | Cartes et liens précédent/suivant rendus en HTML ; la page 2 conserve sa canonical propre |
| Famille | Guides pertinents | Associations éditoriales déclarées ; pas de lien ajouté à un guide sans rapport avec la famille |
| Fiche revue | Guides associés | Même famille réelle (identifiants catégorie et sous-catégorie) ou référence explicitement sélectionnée par le guide |
| Guide | Familles, exemples produit et conseil | Liens définis par le contenu relu ; les documents sources restent accessibles séparément |
| Version française | Version anglaise disponible | Lien de langue et annotations réciproques ; les destinations non traduites gardent leur URL française |

Les quatre fiches d’alimentations n’obtiennent pas de guide associé supplémentaire : aucun guide adapté n’est sélectionné à ce stade. Les seize autres fiches pilotes ont un guide de critères de choix pertinent. Ce lien aide à préparer le choix ; il ne constitue pas une validation de remplacement.

La note produit et ses liens associés sont retirés lorsque l’identité revue devient obsolète, selon le garde existant. L’index des guides reste accessible dans le pied de page ; les brouillons ne sont pas des destinations de navigation.

## Implémentation

`editorialLinks.js` lit seulement les index générés FR/EN. Ces index héritent des identifiants de produits explicitement liés par les guides, sans importer leurs corps. Les textes complets restent dans le module éditorial chargé à la demande. Le build vérifie les projections ; aucune sélection parallèle manuelle n’est maintenue dans l’accueil ou les fiches.

Le nouveau bloc d’accueil utilise les couleurs, bordures et tailles du storefront existant, une grille de deux colonnes puis une colonne sous 810 px et des liens de familles qui passent à la ligne. Aucun média supplémentaire, carrousel ou requête API n’est nécessaire à ce bloc. La présence des liens dans le HTML ne dépend ni d’un défilement ni de JavaScript.

## Vérifications et limites

- 186 tests frontend réussis ; lint, build et contrat CJS indépendant réussis.
- Le Worker et le moteur compilé ont produit les HTML vérifiés. Un parcours du graphe depuis l’accueil atteint les **31 destinations prévues en français et 31 en anglais** : accueil, index des guides, quatre guides, cinq familles et vingt fiches. Le graphe et ses arcs sont enregistrés dans `linking-render/link-graph.json`.
- Un scénario local place volontairement une référence revue en deuxième page : le lien de pagination est présent dans le HTML de la page 1, la fiche est liée depuis la page 2 et la canonical de cette page est correcte dans les deux langues.
- Les contrôles d’artefacts confirment l’absence des quatre brouillons et des corps des guides dans le graphe JavaScript initial. Les index contiennent seulement les données nécessaires à la navigation.

Ces vérifications emploient des fixtures déclarées et le vrai code compilé ; elles ne prouvent pas que l’ensemble du catalogue de production est accessible sans anomalie. Le graphe représente le périmètre du pilote, pas un crawl exhaustif du site. Aucune requête de commande ou d’événement de production n’est écrite.

Preuves : `C:/Users/pc/Documents/Newoteg/output/seo-implementation/linking-*`. Le dernier renderer préparé est `4074a51a91537a23a44776f3f2ed382cce7346e6e98748bc1c451bf323874b17`.

La recette visuelle à 390/1440 px, les interactions et l’hydratation finales restent à effectuer : le navigateur est désactivé dans Work au dernier contrôle. La CI distante sera relevée sur le commit proposé. Publication coordonnée backend/Worker puis contrôle public du maillage nécessaires avant de déclarer SEO-16 livré.
