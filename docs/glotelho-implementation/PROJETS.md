# Projets — listes de matériel et publication vérifiée

État au 1er octobre 2026 : fondation serveur intégrée dans le worktree `codex/newoteg-evolution`. L4 reste en cours. L’éditeur administration, les pages clients et l’ajout groupé au panier restent à réaliser. Aucun projet réel n’est validé par cette recette ; aucune migration Railway ni publication du site.

## Comportement livré

Un administrateur actif crée un brouillon avec objectif, niveau, résumé, prérequis, contraintes, documents et jusqu’à 30 lignes. Chaque ligne décrit le rôle de la pièce, sa quantité entière et son caractère nécessaire ou facultatif. Une référence encore inconnue peut être conservée en brouillon. Une pièce choisie est relue dans le catalogue ; nom et référence viennent du serveur. Deux lignes d’un même produit sont refusées, afin d’éviter un total de quantité trompeur.

La publication exige un contenu complet, au moins une ligne nécessaire, une référence catalogue active pour chaque ligne, trois confirmations explicites de relecture et une note privée de validation. Chaque réponse administration fournit `lignes[].empreinteActuelle`. La demande de publication doit transmettre, pour chaque ligne, cette empreinte telle qu’elle a été relue. Si une référence ou ses caractéristiques changent entre relecture et publication, le serveur refuse avec 409. Il ne suffit pas de cocher les cases sur une version technique périmée. Cette confirmation humaine ne constitue pas une certification automatique de compatibilité.

La publication peut être programmée et possède une date de fin facultative. Le public ne voit que les versions publiées et validées dans leur période de visibilité. Modifier un projet le remet en brouillon et annule sa validation. Retirer un projet exige un motif et préserve l’historique. Les projets ayant un historique ne sont pas supprimables en cascade : les reçus de reprise ne doivent pas disparaître avec une suppression accidentelle.

Prix et disponibilité sont relus lors de chaque lecture publique. Le stock affiché est la quantité vendable après déduction des tickets caisse en attente non expirés, sans exposer les quantités réservées ni les coûts internes. Les montants absents, non positifs ou dépassant la précision sûre ne sont pas inventés. Cette lecture ne réserve aucune pièce ; elle ne remplace pas la revalidation au panier et au devis de commande, à intégrer dans le parcours client.

Si une pièce est supprimée ou inactive, la ligne et sa référence attendue restent présentes mais le produit est indisponible. Une modification de description, référence, marque, famille, documentation ou attribut technique rend la validation de la ligne non actuelle. Un changement de prix ou de stock ne rend pas la vérification technique caduque. `materielRequisDisponible` exige toutes les lignes nécessaires validées, disponibles à la quantité prévue et avec un prix connu. Une rupture d’accessoire facultatif ne transforme pas une rupture du matériel nécessaire en liste complète ; le client devra voir les états de chaque ligne.

## API

Préfixe `/api` de l’application.

| Route | Accès et résultat |
| --- | --- |
| GET `/projets?page=1&limit=12` | Public ; liste `data` et pagination `meta`, maximum 24 projets par page |
| GET `/projets/public/:slug` | Public ; projet visible, sinon 404 |
| GET `/projets/admin` | ADMIN/SUPER_ADMIN actifs ; liste bornée à 100, accès secondaire administration à réaliser |
| GET `/projets/admin/:id` | Même accès ; contenu, empreintes actuelles et 50 événements récents |
| POST `/projets/admin` | Créer un brouillon ; `CreateProjetDto` et `requestId` UUID |
| PATCH `/projets/admin/:id` | Remplacer le contenu complet ; même slug, version courante et nouvel identifiant de tentative |
| POST `/projets/admin/:id/publication` | Version, trois confirmations `true`, note et `verifications: [{ ligneId, empreinteTechnique }]` |
| POST `/projets/admin/:id/retrait` | Version, motif et identité de tentative |

Chaque mutation est transactionnelle, versionnée et auditée. Une réponse perdue se reprend avec le même `requestId` et le même contenu. L’ordre des clés JSON n’affecte pas la reprise ; l’ordre des lignes reste significatif. Réutiliser une identité pour un autre contenu, acteur ou projet donne 409. La reprise retourne l’état courant et la version appliquée par l’opération d’origine. L’interface doit donc relire cet état avant une autre action. Une modification simultanée donne 409 ; le client ne doit pas écraser le travail d’un autre opérateur.

Le public reçoit uniquement le contenu éditorial, les lignes et les données publiques des produits. Notes de validation, acteurs, événements, empreintes et coûts d’achat ne sont pas transmis. Les lectures publiques utilisent un instantané PostgreSQL cohérent, pour éviter un mélange de contenu publié et de lignes modifiées.

## Schéma et vérification

Migration additive `20261001220000_projects` : trois tables (`projet`, `projet_ligne`, `projet_event`), trois enums et relations. Générée par comparaison hors ligne des schémas ; aucun changement de colonne existante. SQL appliqué uniquement sur `127.0.0.1:55439/newoteg_quote_acceptance_test`, sans exécuter une migration distante ni réconcilier l’historique Railway.

Vérifications réalisées :

- Build backend, ESLint des nouveaux fichiers et 7 suites ciblées : 129 tests réussis, couvrant projets, devis, acceptation, devis de commande, checkout et stock caisse. Les deux suites projets (63 tests) ont également été relancées après les corrections de lint.
- `scripts/verify-projects-local.cjs` : 15 scénarios sur PostgreSQL réel local. Brouillon/publication/retrait, reprise durable, confidentialité, rôle actif, signature périmée, stock réservé/expiré, prix et caractéristiques modifiés, produit supprimé, calendrier, rollback sur échec de l’audit et courses de création/publication. Une seule version et un seul événement de publication sont conservés lors de deux validations simultanées.
- Le script refuse une base hors de l’URL dédiée avant chargement du client de données. Ce refus a été vérifié avec un nom de base différent.
- HTTP local : liste et détail publics 200, liste administration et création non authentifiées 401, storefront 200. Aucune mutation authentifiée déclenchée par ce contrôle HTTP.
- Préparation et publication de projets : aucun ordre de commande, mouvement de stock, encaissement, envoi externe ou appel IA créé par le service.

La recette utilise des données fictives et ne télécharge pas la documentation de démonstration. Elle n’établit ni la qualité électronique d’un montage, ni la préparation de production.

## Suite de L4

Construire l’éditeur avec sélection des produits, ordre, dates, validation technique et reprise après erreur, puis les pages projet accessibles depuis l’accueil. Le client choisira ses lignes et quantités ; prix, stock et approbation seront revérifiés avant un ajout atomique au panier. Préserver la direction E et utiliser les visuels NEWOTEG validés. NEWOTEG doit encore choisir et faire relire un projet pilote réel, ses accessoires, documentation et contraintes. Les arrivages et offres réelles restent également à intégrer.
