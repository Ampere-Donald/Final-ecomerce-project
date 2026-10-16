# Dossiers de remplacement dans le parcours client — 13–14 octobre 2026

Le parcours public consulte désormais le registre humain, indépendamment de la présélection lexicale et du fournisseur. Une pièce relue qui ne figure pas dans les résultats textuels peut ainsi apparaître avec son dossier. Aucun score fournisseur ne devient une décision humaine. Direction E, header, hero et confirmation conservés.

## Contrat et expérience

`POST /equivalence/cas/rechercher` est public, sans cache. Référence complète NFC/espaces uniquement, sans changer casse, unité, ponctuation ou suffixe ; ou cible catalogue exacte par UUID. Lecture bornée à cinq dossiers par page, tri avec usage exact prioritaire, pages 0–1000 ; continuation explicite même si des sources périmées rendent une page vide. Une page ne contient pas nécessairement cinq pièces distinctes : un produit peut avoir plusieurs usages documentés.

Chaque lecture vérifie état/empreinte des preuves, retrait, famille autorisée, prix public et stock disponible après réservations. La réponse emploie la projection publique et une liste de champs explicite : aucun coût d’achat, relecteur, empreinte privée, brouillon ou historique. La lecture des disponibilités et celle des preuves sont séparées ; ce n’est ni une réservation ni une garantie de disponibilité au moment d’un achat. Pas de nouvelle famille d’équivalences ouverte sans données relues.

Les dossiers relus entrent en priorité dans les résultats (cinq pièces au maximum), avec usage, motif, limites, document/date et adaptations lorsque nécessaires. Plusieurs usages d’une pièce restent consultables. Un dossier relu pour un autre usage reste décrit avec son propre périmètre ; aucun rapprochement libre des montages n’est tenté. « Rechercher pour cet usage » change explicitement le montage saisi et lance une nouvelle lecture. Les quatre verdicts restent distincts, y compris refus et décision à confirmer. Le CTA est une consultation de fiche, sans remplacement ou achat automatique.

Changement de référence/montage : arrêt de la demande et retrait immédiat des anciens résultats. Changement de source/cas : nouvelle lecture retire la décision périmée. Indisponibilité du registre : aucune décision antérieure conservée, pistes du moteur seulement et message de reprise. Indisponibilité des autres pistes : dossiers relus encore consultables. Échec des deux lectures : référence/montage conservés et nouvelle tentative possible. Les caractéristiques de la pièce proposées restent un sous-ensemble des sources publiques ; elles ne prouvent pas à elles seules le remplacement ni l’exhaustivité des critères choisis par le technicien.

## Vérifications

Builds backend/storefront, lint ciblé backend et lint storefront passent. Dans l’export de travail, seuls les anciens artefacts `.wrangler` et `dist-*-candidate` ont été exclus de la vérification ESLint, sans exclusion des sources ni modification de configuration du dépôt. 123 tests storefront passent, dont six nouveaux contrats du registre : décision fournisseur ignorée, candidat omis retrouvé, périmètre exact, quatre verdicts, preuves malformées refusées et regroupement/prix sans doublon.

La recette SQL/HTTP utilise la base PostgreSQL locale possédée et les contrôleurs/services/JWT/DTO réels. Elle répète les quatre migrations sur schéma/restauration synthétiques et vérifie découverte, pagination des sept usages, absence réelle du candidat dans la présélection lexicale, sources modifiées, retrait, stock/archive/cible, accès et champs publics. Aucun nouveau schéma ni migration ajouté dans cet incrément.

Le build client est testé dans Edge aux largeurs 390, 768 et 1440, en FR/EN et avec bundles moderne/legacy : 12 variantes. Découverte sans montage, recherche volontaire sur l’usage relu, quatre verdicts, source seule modifiée, erreurs partielles/globales, saisie/reprise et faux verdict dans une réponse de suggestion sont contrôlés. Les lectures des dossiers/suggestions et les modifications de sources/cas sont de vrais appels HTTP/SQL locaux ; appels GET de coque et pannes/faux payload sont des adaptateurs de test explicites. Pas de fournisseur distant, pièce réelle approuvée, commande ou message. Les captures sont dans `output/implementation-work/replacement-client-20261013/client-browser`. `result.json` et `browser-result.json` conservent la portée de la recette ; consulter la CI de la tête exacte pour les suites complètes.

Le défilement vers les résultats mesure la hauteur réelle du header fixé. Le contrôle clavier vérifie que le titre focalisé reste visible, y compris sur tablette où le header peut être plus haut que le décalage historique. Aucun style global du header modifié.

## Critères encore ouverts

Mr Jude Fogueng demeure le référent technique désigné. Accepter les références pilotes, renseigner leurs vrais paramètres et sources, puis confirmer les remplacements pour les usages réels et leurs contre-exemples. La recette synthétique ne remplace pas cette validation ni une recette sur téléphone physique. Autres critères A–Z (pilotes exploitation/projets/devis, fournisseurs de messages, observations, préproduction distante) toujours ouverts. Accès de gestion et préproduction Railway différés sur instruction humaine. PR #10 conservée en brouillon, cet incrément non déployé.
