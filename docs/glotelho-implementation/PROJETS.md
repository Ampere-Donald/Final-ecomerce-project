# Projets — listes de matériel et publication vérifiée

État au 2 octobre 2026 : fondation serveur et éditeur administration intégrés dans le worktree `codex/newoteg-evolution`. L4 reste en cours : pages clients et ajout groupé au panier à réaliser. Aucun projet réel n’est validé par cette recette ; aucune migration Railway ni publication du site.

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
| GET `/projets/admin` | ADMIN/SUPER_ADMIN actifs ; liste bornée à 100, accès secondaire « Projets boutique » dans l’administration |
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

Les pages projet et l’ajout atomique au panier sont livrés dans la branche locale ; leur recette est décrite ci-dessous. NEWOTEG doit encore choisir et faire relire un projet pilote réel, ses accessoires, documentation et contraintes. Les arrivages et offres réelles restent également à intégrer.

## Éditeur administration — 2 octobre 2026

`/projets`, réservé aux administrateurs, se trouve dans le lien secondaire « Projets boutique ». Les cinq destinations principales sont conservées. La bibliothèque de brouillons/publications accompagne une feuille de préparation : contenu FR/EN, référence exacte, rôle, quantité, nécessaire/facultatif, ordre des pièces, documents, visuel marketing, calendrier et ordre d’affichage.

Une référence inconnue reste editable en brouillon. « Choisir une pièce pour la ligne » remplace explicitement sa référence, en conservant rôle, quantité et caractère facultatif. Aucun équivalent automatique. La recherche sert à identifier les pièces ; l’API de liste n’inclut pas les valeurs techniques complètes. Elles sont relues via le détail du projet pour la vérification avant publication, avec les empreintes serveur actuelles.

Le brouillon est conservé par compte. Chaque tentative est persistée avant envoi et verrouille l’édition jusqu’au résultat. Réponse perdue : rechargement puis reprise du même contenu et du même `requestId`. Stockage illisible/refusé ou autre tentative en attente : nouvel envoi bloqué. Un conflit de version conserve les modifications, annule la relecture technique et demande une relecture explicite de la version boutique. Changer de projet ou quitter avec des modifications nécessite une confirmation.

La publication exige la relecture de chaque pièce, du matériel et des documents, ainsi qu’une note privée. Le retrait demande un motif. Dates programmées et états sont affichés ; l’historique est consultable. Les notes, vérifications et l’historique restent dans l’administration. Les champs ont des labels associés et des aides distinctes pour les lecteurs d’écran.

Preuves de ce jalon :

- Typage administration et build Vite/PWA réussis. Treize tests UI ciblés : rôle, suffixe et coûts privés, remplacement, quantité/version, publication, pièce manquante, reprise après rechargement, conflit, stockage refusé/corrompu, autre onglet, retrait, dates effacées et réponse ancienne ignorée.
- `tests/verify-project-editor-local.cjs` : six contrôles avec Nest et PostgreSQL réels sur la base dédiée. Connexion d’un administrateur fictif, création avec réponse perdue après commit, reprise sans doublon ni deuxième reçu, publication après vérification, confidentialité de la réponse publique, retrait conservant trois événements, absence de commande/mouvement de stock et de trafic extérieur.
- Rendu à 360/390/768/1100/1240/1440 px sans débordement horizontal ; captures 390/1440 px et relecture desktop inspectées. Edge headless indépendant après échec de connexion du navigateur intégré, pas un téléphone physique.
- Les autres modules du shell admin sont simulés dans cette recette ; projets, recherche catalogue et identité admin utilisent l’API réelle. Le compte fictif est désactivé à la fin et le projet fictif reste en brouillon. Aucun secret de test n’est écrit dans les captures ou résultats.

Relancer depuis le dossier administration avec une variable explicite `NEWOTEG_PROJECT_TEST_DATABASE_URL=postgresql://quote_test@127.0.0.1:55439/newoteg_quote_acceptance_test`, puis `node tests/verify-project-editor-local.cjs`. Le script refuse toute autre base avant chargement de Prisma. Il attend le backend à `127.0.0.1:3000` et l’administration à `localhost:5174`.

## Pages clients et sélection — 2 octobre 2026

L’accueil et le footer ouvrent `/projets`. Une liste publiée donne accès à son objectif, niveau, prérequis, contraintes, documents et matériel. Les libellés sont FR/EN ; les titres/résumés anglais apparaissent lorsqu’ils ont été renseignés dans l’administration. Les autres contenus techniques restent ceux validés par la boutique. Un lien documentaire n’est ouvert qu’à l’initiative du client ; les URL à protocole dangereux ou contenant des identifiants ne sont pas rendues comme liens.

Les pièces nécessaires sont présélectionnées à la quantité conseillée ; les accessoires facultatifs ne le sont pas. Le client peut changer la quantité ou décocher une ligne. Une sélection qui ne couvre pas les besoins conseillés porte l’avertissement « ne constitue pas un kit complet » et exige une acceptation explicite. Une pièce facultative en rupture n’empêche pas l’achat des autres pièces tant qu’elle reste décochée. Les références exactes et suffixes sont préservés, y compris dans le panier relu après rechargement.

« Vérifier et ajouter au panier » relit le détail public courant. Une référence manquante, un prix/stock inconnu, une approbation technique périmée, un changement de prix/stock/version ou une quantité dépassant le stock disponible après prise en compte du panier bloque l’ajout. Les quantités choisies ne sont pas réduites silencieusement. Après changement, le client doit relire puis confirmer à nouveau. Une ligne sélectionnée retirée reste affichée jusqu’à ce qu’il la décoche ; une nouvelle ligne n’est jamais sélectionnée automatiquement. Le panier doit avoir fini sa propre relecture avant ajout. Le groupe est accepté en une seule action atomique du panier local, sans réservation serveur. Le serveur calcule de nouveau le devis au checkout.

Pendant vérification, les contrôles de sélection sont verrouillés. Le double clic ne produit qu’une requête ; quitter la page annule la requête et interdit toute modification tardive du panier, même entre le changement d’adresse et la fermeture du composant. Un projet retiré et une panne restent distincts, avec actualisation/réessai possible. Une réponse publique malformée affiche une erreur sans ajouter de produit.

Preuves :

- `tests/projects.test.mjs` : neuf tests des contrats, prix/stock inconnus, quantités, panier existant, sélection partielle, changement, disparition de ligne, références, URL et ajout atomique. Suite Node storefront totale : 44 tests. Lint et build Vite réussis.
- `tests/verify-projects.cjs` : 16 contrôles sur APIs entièrement simulées : accueil/bibliothèque/détail, ajout groupé, sélection partielle, prix/stock modifiés, panier préexistant et relecture retardée, disparition et apparition de lignes, rupture facultative, réponse malformée, retrait/panne/réessai, état vide, anglais et livraison prudente, double clic et départ avant réponse. Six largeurs sans débordement ; captures 390/1440 px inspectées ; aucune mutation API et tout trafic extérieur bloqué.
- `tests/verify-projects-live.cjs` : quatre contrôles avec les véritables APIs locales, choix recommandés et références, rendu mobile/desktop, relecture avant ajout puis rechargement catalogue avec conservation des références. Aucune mutation API, commande ou paiement. Captures et résultats dans `output/implementation-work/captures/projects` du workspace principal.
- Régression storefront générale : 24 contrôles. Le script peut utiliser `NEWOTEG_STOREFRONT_TEST_URL=http://127.0.0.1:5187` et un dossier de captures distinct via `NEWOTEG_STOREFRONT_TEST_OUTPUT`, sans écraser les preuves antérieures. Ces vérifications utilisent Edge headless indépendant, pas le navigateur intégré ni un téléphone physique.

Prévisualisation fictive : depuis `Back-end`, fournir la variable explicite de base de recette ci-dessus puis lancer `node scripts/seed-project-preview.cjs` après avoir initialisé les produits fictifs du comparateur. Le script refuse une autre base, n’utilise pas `.env`, n’altère pas le stock/prix des produits existants et désactive son administrateur fictif. La liste de démonstration reste publiée uniquement dans la base de test, pour permettre une inspection à `http://127.0.0.1:5187/projets/demonstration-liste-materiel`. Son texte dit explicitement qu’aucun montage réel ni compatibilité électronique n’est validé. Les deux recettes clientes se lancent depuis `Font-end` avec `node tests/verify-projects.cjs` et `node tests/verify-projects-live.cjs`.

Ce jalon ne ferme pas L4 : pilote réel, documentation technique relue et animation commerciale réelle restent ouverts. Aucun accès Railway ou déploiement.
