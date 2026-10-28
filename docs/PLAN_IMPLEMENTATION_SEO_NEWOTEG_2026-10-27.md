# Plan d’implémentation SEO — NEWOTEG / X-Electronic

Version 1 — 27 octobre 2026 — **Plan validé ; implémentation en cours.** État et preuves de livraison dans [le suivi d’implémentation](SUIVI_IMPLEMENTATION_SEO.md).

Document d’exécution issu de la [stratégie SEO Afrique](STRATEGIE_SEO_AFRIQUE_NEWOTEG_2026-10-27.md). L’objectif est de rendre le catalogue visible, développer les recherches commerciales au Cameroun et construire une expertise technique reconnue au-delà de ce marché.

## 1. Résultat attendu et périmètre de validation

La première livraison doit permettre aux moteurs et aux visiteurs d’accéder directement aux informations des produits, à cinq familles commerciales et aux liens qui les relient. Le pilote comprend **20 fiches enrichies et 5 pages de familles**, avec un état initial mesuré et une recette vérifiable.

La suite développe les contenus techniques, la présence locale, l’anglais et un marché extérieur pilote. Les objectifs à 90 jours sont : jusqu’à 100 fiches enrichies, 8 à 12 familles commerciales, 8 guides et 8 dossiers techniques. Ces quantités sont ajustables à la capacité de vérification et aux résultats.

Le périmètre proposé à validation comprend le développement, la préparation des contenus, les tests et la mise en ligne progressive des lots dont les critères de recette sont remplis. Avant chaque publication, je présenterai la version testée, ses preuves et le retour arrière prévu. La validation de ce périmètre complet permettra d’exécuter ces livraisons sans redemander les mêmes autorisations ; une validation limitée au développement sera également respectée.

Les messages aux partenaires, sollicitations d’avis et publications sur des comptes externes seront préparés dans le plan ; leur envoi demandera une instruction explicite. Les vérifications physiques de composants et les promesses de livraison devront s’appuyer sur les faits confirmés par l’entreprise.

## 2. Décisions techniques proposées

| Sujet | Décision proposée | Raison |
|---|---|---|
| Application | Faire évoluer React/Vite, Cloudflare et NestJS/Railway | Des briques de rendu et des tests existent déjà |
| Produits | Garder les URL `/product/:id` | Elles sont stables ; l’accessibilité et le contenu passent avant leur renommage |
| Familles commerciales | Introduire `/catalogue/:slug` pour les sélections retenues | Donner une destination durable aux recherches par famille |
| Filtres | Conserver la recherche et les combinaisons non retenues hors index | Maîtriser les doublons et le nombre d’URL |
| Français | Garder les URL françaises existantes | Limiter les changements et les redirections |
| Anglais | Ajouter `/en/` aux pages traduites lors du lot international | Permettre l’accès indépendant aux deux langues |
| Guides | `/guides/:slug` | Publier des réponses durables et reliées au catalogue |
| Dossiers techniques | `/remplacement/:slug` ; conserver `/equivalences` comme outil | Donner une URL propre aux cas vérifiés |
| Contenus éditoriaux du pilote | Fichiers structurés et versionnés, validés au build | Permettre la relecture et l’historique avec une charge de maintenance limitée |
| Prix et stock | Réutiliser les données commerciales publiques et les règles actuelles | Éviter des copies éditoriales qui deviennent obsolètes |
| Mesure | Examiner le collecteur de parcours existant avant de l’étendre | Réutiliser les événements disponibles et éviter les doubles comptages |

Les slugs devront être associés aux identifiants réels de catégories ou sous-catégories. Une modification du nom visible ne devra pas casser l’URL. Les cinq familles candidates sont : condensateurs, transistors, circuits intégrés audio, alimentations stabilisées et multimètres. Leur sélection finale interviendra au lot 0 selon le catalogue, la demande et la capacité à fournir les produits.

Une ancienne URL filtrée ne sera redirigée vers une famille que si elle représente exactement la même sélection. Les autres filtres conservent leur fonctionnement. La pagination indexable aura son URL propre et une canonical cohérente ; elle ne sera pas ramenée systématiquement à la première page.

## 3. Organisation et dépendances

| Lot | Résultat | Dépendances | Point de validation |
|---|---|---|---|
| **0 — État initial et sélection** | Base de travail, 20 produits, 5 familles, mesures de départ | Accès au dépôt ; données Google si disponibles | Liste du pilote et architecture confirmées |
| **1 — Accessibilité et indexation** | Contenu principal en HTML, routes, règles d’indexation, sitemap, données structurées | Lot 0 | Recette technique réussie |
| **2 — Pilote commercial et mesure** | 20 fiches enrichies, 5 familles, liens, suivi des demandes | Lots 0 et 1 | Parcours complet vérifié et contenu exact |
| **3 — Guides et remplacement** | Bibliothèque éditoriale, premiers guides et dossiers | Modèle de contenu ; lot 1 pour publication | Sources et conclusions vérifiées |
| **4 — Présence locale et réputation** | Informations locales cohérentes, médias et dossiers partenaires | Faits commerciaux et comptes accessibles | Profil et documents prêts à publier |
| **5 — Anglais et pays pilote** | Traductions accessibles, annotations linguistiques, étude commerciale d’un pays | Pilote fonctionnel ; capacité commerciale confirmée | Recette bilingue et décision pays |
| **6 — Extension et amélioration** | Jusqu’à 100 fiches, contenus supplémentaires, suivi des résultats | Premières livraisons et données observées | Bilan à 30, 60 et 90 jours |

Les recherches de sujets, la préparation des textes et la collecte de faits commerciaux peuvent avancer pendant le développement. Ce plan n’exige pas de délégation à d’autres agents.

## 4. Lot 0 — Établir une base fiable

**Objectif :** travailler à partir de la bonne version du site et choisir un pilote utile.

- **SEO-01 — Vérifier la version de départ.** Identifier le commit réellement déployé, les branches actives et les changements locaux ; réutiliser un checkout adapté ou créer une branche isolée `codex/seo-foundations`. Le checkout principal consulté est plus ancien que plusieurs éléments publiés : il ne doit pas servir automatiquement de référence de livraison.
- **SEO-02 — Refaire un état public ciblé.** Contrôler accueil, catalogue, catégories, pagination, 20 fiches, guides, pages de service et routes privées. Relever statut HTTP, contenu initial et rendu, robots, canonical, liens, sitemap et données structurées.
- **SEO-03 — Établir la mesure initiale.** Utiliser Search Console si l’accès existe : performances par page, requête, pays et appareil, rapports d’indexation, inspection d’un échantillon. Documenter toute absence d’accès ; les travaux techniques peuvent continuer.
- **SEO-04 — Sélectionner le pilote.** Partir du stock et des données commerciales autorisées : demandes clients, ventes, marge, qualité des sources et possibilités de réapprovisionnement. À défaut, utiliser une sélection provisoire selon disponibilité et complétude, avec une confiance explicitement limitée.
- **SEO-05 — Préparer le panier de recherches.** Constituer 100 requêtes candidates : 50 références/marquages, 20 catégories, 15 questions de choix, 10 besoins de remplacement et 5 demandes professionnelles. Dédupliquer et relier chaque intention à une page cible.

**Livrables :** état initial daté, liste des 20 produits et 5 familles, matrice requête/page, registre des accès manquants et décisions d’architecture.

**Terminé lorsque :** la version de départ est identifiée ; les 25 destinations pilotes sont connues ; les faits observés et les hypothèses sont distingués ; aucun volume ou classement n’est inventé pour combler une absence de données.

## 5. Lot 1 — Accessibilité technique et indexation

### Rendu HTML et données publiques

- **SEO-06 — Raccorder le rendu catalogue existant.** Examiner les briques Cloudflare et le paquet de rendu NestJS pour comprendre pourquoi les réponses publiques examinées contiennent encore une racine vide. Réutiliser le rendu partagé et son contrat de version, puis vérifier son activation effective en préproduction.
- **SEO-07 — Étendre le rendu aux fiches produit.** Livrer titre visible, description, caractéristiques publiques, prix/disponibilité et liens utiles dans la réponse initiale. Utiliser le même modèle de données que le navigateur pour éviter les divergences à l’hydratation.
- **SEO-08 — Gérer les états réels.** Préserver une page utile lors d’une rupture temporaire ; traiter une référence supprimée avec le statut approprié ; distinguer panne d’API et absence de produit. Une panne temporaire ne doit pas faire passer définitivement un produit valide pour supprimé.
- **SEO-09 — Définir le cache.** Séparer ressources stables, contenu éditorial et données commerciales. Le pilote utilisera une stratégie de fraîcheur explicite ; aucun prix ou stock ne sera figé dans un build éditorial. Tester la cohérence entre HTML, JSON-LD et données affichées, ainsi que les limites de temps des appels.

### Routes et directives

- **SEO-10 — Créer les cinq routes de familles.** Mapper les slugs aux catégories existantes ; réutiliser le catalogue et ses filtres ; mettre à jour routeur, reconnaissance des documents, métadonnées et liens.
- **SEO-11 — Centraliser la politique d’indexation.** Autoriser les pages commerciales choisies, les produits publics admissibles et les contenus publiés. Maintenir les recherches internes, comparaisons temporaires, brouillons et combinaisons inutiles hors index. Traiter les paramètres de suivi sans générer de nouvelles pages canoniques.
- **SEO-12 — Générer le sitemap.** Lire la source publique autorisée, sélectionner les URL canoniques admissibles et utiliser de vraies dates de modification. Vérifier les doublons, liens supprimés et incohérences. Une erreur de source ne doit pas remplacer silencieusement un sitemap complet par un fichier vide.
- **SEO-13 — Ajouter les données structurées.** Construire `Product`, `Offer` lorsque l’offre existe, `BreadcrumbList` et les informations d’entreprise/boutique vérifiées. Échapper les données correctement et tester l’identité de prix et disponibilité avec la page. Inclure uniquement les avis authentiques et publics lorsqu’ils sont admissibles.

**Zones de code pressenties :** `Font-end/worker.js`, `src/storefront/routeMetadata.js`, `documentRoutes.js`, `serverMetadata.js`, `recordMetadata.js`, `initialCatalogue.js`, `backendCatalogue.js`, `serverCataloguePackage.jsx`, les composants catalogue/produit, le module backend `storefront-rendering` et les scripts de packaging. Les chemins seront revérifiés dans la version de travail retenue.

**Terminé lorsque :** un crawl sans JavaScript trouve le contenu principal et les liens du pilote ; le navigateur affiche les mêmes données ; les pages autorisées sont indexables ; les pages privées restent protégées ; les erreurs HTTP sont correctes ; le sitemap ne contient que des URL admissibles ; le balisage est validé.

La recette technique certifie l’admissibilité à l’indexation. L’indexation effective et le classement seront observés ensuite dans Search Console.

## 6. Lot 2 — Enrichir le pilote et mesurer sa valeur

- **SEO-14 — Améliorer les 20 fiches.** Vérifier référence exacte, alias validés, fonction, caractéristiques, source fabricant, photographie, conditionnement et prochaine action. Rédiger des titres et descriptions utiles à partir des faits disponibles. Garder les affirmations non documentées en attente.
- **SEO-15 — Rédiger les cinq familles.** Présenter les produits dès le début, ajouter une aide concise au choix, les attributs importants, les sous-familles et les guides pertinents. Éviter une liste de produits sans contexte ou un texte qui masque l’achat.
- **SEO-16 — Organiser le maillage.** Relier accueil, familles, sous-familles, fiches et guides avec des liens HTML descriptifs. Vérifier la découverte des références au-delà de la première page et supprimer les destinations orphelines du pilote.
- **SEO-17 — Instrumenter les demandes.** Examiner les événements existants de `journey.js` et du module `/parcours`. Définir une carte des événements : consultation, clic de conseil, début de devis, devis transmis, commande confirmée. Dédupliquer les événements et ne jamais considérer un clic WhatsApp comme une vente.
- **SEO-18 — Préparer l’attribution et le tableau de suivi.** Réutiliser les outils analytiques disponibles. Si une liaison source/demande/vente exige un champ persistant nouveau, proposer une migration additive et un contrat de données minimal. Les identifiants privés, contenus de conversation et informations de compte ne seront pas inclus dans les événements publics.
- **SEO-19 — Vérifier les performances mobiles.** Mesurer les pages pilotes avant/après, optimiser les images et les ressources nécessaires, vérifier chargement et interaction sur mobile. Séparer les mesures de laboratoire des données réelles lorsqu’elles deviennent disponibles.

**Livrables :** fiches avant/après, cinq familles, carte de liens, contrat d’événements, tableau de suivi initial et rapport de performance.

**Terminé lorsque :** un client peut arriver sur chaque destination pilote, comprendre l’offre, rejoindre le bon produit et effectuer une demande ; les événements du parcours se distinguent et les informations commerciales restent cohérentes.

Le suivi de marge sera réalisé dans un espace interne autorisé. Les coûts d’achat et les informations de marge ne seront jamais exposés par le rendu SEO ou le sitemap.

## 7. Lot 3 — Construire la bibliothèque technique

- **SEO-20 — Créer le modèle éditorial.** Chaque contenu aura un identifiant, un slug, une langue, un type, un titre, un résumé, son corps, des sources, ses produits liés, des dates et un statut `brouillon`, `à relire` ou `publié`. Les dossiers de remplacement incluront contexte, limites et validation technique. Le build refusera les contenus publiés incomplets selon leur type.
- **SEO-21 — Créer les pages et leur rendu.** Développer les listes de guides et dossiers, leurs pages de détail, les liens vers familles/produits et leur inclusion dans le sitemap après publication. Prévoir une lecture mobile confortable et des tableaux techniques accessibles.
- **SEO-22 — Préparer quatre guides pilotes.** Sujets proposés : lecture des marquages, choix d’un condensateur, sélection d’un multimètre et identification d’un connecteur. Affiner les sujets à partir des demandes observées ; l’exactitude technique sera vérifiée avec des sources appropriées.
- **SEO-23 — Préparer quatre dossiers de remplacement.** Sélectionner des cas documentés du projet ou fournis par la boutique. Expliquer référence d’origine, contexte, sources, différences, conditions et conclusion. Un dossier sans preuves suffisantes restera en brouillon.
- **SEO-24 — Organiser la maintenance.** Définir les raisons de révision : source contradictoire, modification de produit, erreur signalée, changement d’offre ou nouvelle preuve. Séparer mise à jour éditoriale et disponibilité commerciale dynamique.

**Livrables :** modèle de contenu versionné, pages éditoriales, quatre guides et quatre dossiers prêts à publier lorsqu’ils sont vérifiés, registre des sources et procédure de révision.

**Terminé lorsque :** les contenus publiés sont accessibles sans interaction préalable, sourcés, reliés à des produits utiles et porteurs d’une conclusion proportionnée aux preuves. Une observation physique ou un test de montage ne sera déclaré réalisé que s’il existe réellement.

Le moteur d’équivalences continuera à servir les recherches interactives. Les dossiers publics seront des publications sélectionnées, avec une validation éditoriale et technique propre.

## 8. Lot 4 — Renforcer la présence locale et la réputation

- **SEO-25 — Harmoniser les informations publiques.** Vérifier relation NEWOTEG/X-Electronic, adresse, téléphone, horaires, contact, conditions de retrait et livraison. Préparer une fiche de référence des informations confirmées.
- **SEO-26 — Préparer la mise à jour Business Profile.** Auditer la fiche existante si accessible ; préparer corrections, description et sélection de photos. Les informations devront correspondre à la boutique réelle.
- **SEO-27 — Préparer le dispositif d’avis et de médias.** Fournir un message de demande d’avis honnête, une sélection de moments adaptés et des modèles de réponse. Préparer les scripts de quatre vidéos courtes ; la boutique fournira ou réalisera les prises de vue nécessaires.
- **SEO-28 — Préparer les relations éditoriales.** Construire une liste initiale de dix partenaires pertinents et, pour chacun, associer une ressource utile et un brouillon de message personnalisé. L’envoi sera effectué seulement sur instruction explicite.
- **SEO-29 — Vérifier Merchant Center.** Examiner l’éligibilité effective du pays et des surfaces disponibles dans le compte. Préparer un flux pilote seulement si le canal est pertinent et accessible.

**Livrables :** fiche d’identité commerciale, corrections proposées pour les comptes, médias sélectionnés, scripts vidéo, liste partenaires et messages prêts à relire.

**Terminé lorsque :** les éléments publiables sont cohérents et confirmés ; les actions réellement effectuées sur les comptes sont distinguées des propositions préparées.

## 9. Lot 5 — Anglais et premier marché extérieur

- **SEO-30 — Rendre la langue déterminée par l’URL.** Développer `/en/` pour les pages retenues. L’URL doit déterminer le contenu initial et celui après chargement, indépendamment du stockage local. Mettre à jour les liens, métadonnées, données structurées et sélecteur de langue.
- **SEO-31 — Publier le lot anglais pilote.** Traduire les cinq familles, les 20 fiches enrichies et les premières pages éditoriales admissibles, ainsi que les informations de service nécessaires à leur parcours. Afficher les alternatives linguistiques uniquement lorsqu’elles existent ; ne pas publier de faux équivalents anglais incomplets.
- **SEO-32 — Vérifier les annotations internationales.** Canonical propre à chaque version, `hreflang` réciproques, URL valides et sitemap cohérent. Aucun visiteur ne sera forcé vers une autre langue sur la seule base de son IP.
- **SEO-33 — Choisir un pays pilote.** Comparer demandes, stock, coût rendu, paiement, délais, retours et capacité de support. Préparer une seule offre pays lorsque les modalités sont confirmées. L’étude commerciale peut conclure qu’il est préférable de développer d’abord l’audience technique.

**Livrables :** parcours anglais testé, matrice des traductions, recette internationale et dossier de décision pour un marché extérieur.

**Terminé lorsque :** les deux langues sont accessibles de façon stable ; chaque annotation renvoie vers une traduction réelle ; toute promesse de livraison sur une page pays correspond à une capacité confirmée.

## 10. Lot 6 — Étendre ce qui fonctionne

- **SEO-34 — Étendre les fiches par vagues.** Passer de 20 à 50, puis jusqu’à 100 fiches enrichies selon les preuves disponibles, les demandes et les résultats. La qualité éditoriale et la maintenance conditionnent chaque vague.
- **SEO-35 — Étendre les familles et contenus.** Atteindre 8 à 12 familles et, si les cas le permettent, 8 guides et 8 dossiers au total. Une quantité ne doit pas obliger à publier un dossier non vérifié.
- **SEO-36 — Examiner les résultats à 30, 60 et 90 jours.** Comparer couverture technique, exploration, indexation, impressions hors marque, positions du panier de recherches, demandes qualifiées et commandes. Décider quelles pages améliorer, regrouper ou développer.

Les fonctionnalités techniques seront conçues pour le catalogue admissible, même si le travail éditorial commence sur 20 produits. L’extension du rendu et du sitemap à davantage de références se fera après contrôle de charge et de qualité des données ; les autres produits ne seront pas retirés de l’index au seul motif qu’ils ne font pas partie du pilote éditorial.

Les revues différées supposent des données accumulées et une nouvelle séance de travail ou une automatisation explicitement demandée. Ce document ne crée pas de surveillance automatique en arrière-plan.

## 11. Recette commune avant mise en ligne

| Domaine | Vérifications requises | Preuve attendue |
|---|---|---|
| Contenu initial | Titre visible, contenu principal, liens et données publiques présents | Réponses HTTP et crawl sans JavaScript |
| Navigateur | Hydratation correcte, contenu cohérent, navigation directe et interne | Parcours navigateur, console et captures |
| Indexation | Robots, canonical, pagination, filtres, brouillons, statuts HTTP | Matrice d’URL avec résultat attendu et observé |
| Sitemap | URL canoniques admissibles, absence de doublons, dates réelles | Validation XML et vérification des destinations |
| Données structurées | Propriétés correctes et informations identiques à la page | Tests de contrat et validation adaptée |
| Commerce | Prix, disponibilité, offre, panier et devis cohérents | Tests ciblés et parcours de préproduction |
| Confidentialité | Aucune donnée interne dans HTML, JSON-LD, caches ou endpoints SEO | Assertions sur réponses publiques et revue du contrat |
| Robustesse | API lente/indisponible, produit supprimé, rupture et déploiements de versions différentes | Scénarios de panne contrôlés |
| Mobile | Lecture, filtres et actions fonctionnent aux tailles usuelles | Vérification à 360/390 px et écran large |
| Langues | Langue stable après chargement, liens et annotations réciproques | Parcours FR/EN et validation des URL |

Réutiliser et étendre les tests existants de métadonnées, routes, rendu, catalogue, produits publics et parcours. Les tests ajoutés couvriront les contrats et risques réels. Exécuter lint, build, tests pertinents et CI ; élargir la recette lorsque des modifications transversales le justifient.

Les contrôles de production seront principalement en lecture seule. Les commandes ou demandes de test devront utiliser un environnement prévu à cet effet pour ne pas polluer les stocks et les ventes.

## 12. Livraisons et retour arrière

| Livraison | Contenu | Condition de publication |
|---|---|---|
| **A — Fondations et pilote** | Lots 0, 1 et 2 | Recette technique et commerciale réussie ; version présentée et publication comprise dans le périmètre validé |
| **B — Expertise et présence locale** | Lot 3 et éléments prêts du lot 4 | Contenus sourcés ; faits métier confirmés ; autorisations externes applicables |
| **C — Anglais** | Partie linguistique du lot 5 | Recette bilingue réussie et traductions complètes du périmètre |
| **D — Extension** | Vagues du lot 6 et éventuelle offre pays | Résultats analysés, qualité maintenue et logistique confirmée |

Pour chaque livraison : conserver le commit et la version de déploiement précédents ; construire un paquet reproductible ; déployer dans l’ordre compatible entre backend et frontend ; contrôler les réponses publiques après publication ; enregistrer la preuve et les anomalies.

Privilégier les migrations additives lorsqu’une évolution de données est nécessaire. Les changements de contenu seront versionnés ou accompagnés d’un relevé avant/après. Un retour arrière applicatif ne devra pas annuler les commandes et mouvements de stock intervenus entre-temps.

Le retour arrière sera déclenché en cas de défaut commercial critique, exposition de données privées, erreur de prix généralisée ou régression technique majeure. Une absence de hausse immédiate des positions ne constitue pas un motif de retour arrière technique.

## 13. Répartition du travail

| Je peux exécuter | Contribution de Newoteg |
|---|---|
| Diagnostic technique, architecture, code, tests, préproduction et préparation du déploiement | Fournir les accès nécessaires lorsqu’ils ne sont pas déjà disponibles |
| Analyse du catalogue et proposition de sélection | Confirmer priorités commerciales et capacité de réapprovisionnement |
| Recherche documentaire, rédaction et préparation des dossiers | Confirmer les faits de terrain et faire relire les cas de compatibilité par une personne compétente |
| Préparation du suivi et analyse des exports autorisés | Donner accès aux données Google et commerciales utiles |
| Scripts vidéo, sélection des médias existants et préparation des publications | Réaliser les photos ou démonstrations manquantes |
| Étude des marchés et rédaction des pages de service | Confirmer frais, délais, paiement, retours et support |
| Messages partenaires et demandes d’avis prêts à relire | Autoriser explicitement les envois souhaités |

Les accès et confirmations seront demandés au moment où ils deviennent nécessaires. Un accès manquant à Search Console ne doit pas bloquer une correction de rendu déjà justifiée par les réponses publiques.

## 14. Calendrier indicatif à partir du démarrage

| Période cible | Travail | Résultat vérifiable |
|---|---|---|
| Semaine 1 | Lot 0 et préparation du contenu pilote | État initial, sélection, architecture et backlog finalisés |
| Semaines 2–3 | Lot 1 et mesure du lot 2 | Rendu, routes, indexation, sitemap et instrumentation en préproduction |
| Semaine 4 | Finalisation du lot 2 et recette de la livraison A | Pilote commercial prêt à publier |
| Semaines 5–8 | Lots 3 et 4 ; extension vers 50 fiches | Premiers dossiers et guides, présence locale préparée, premiers résultats examinés |
| Semaines 9–12 | Lot 5, extension conditionnelle du lot 6 | Anglais pilote, jusqu’à 100 fiches, décision pays et bilan à 90 jours |

Ce calendrier est une cible d’organisation, pas une estimation ferme de jours de développement ni une promesse de classement. Il sera réestimé après le lot 0 selon l’état du déploiement, la disponibilité des accès et le travail de vérification des contenus. Les corrections techniques peuvent être prêtes avant que les moteurs aient accumulé assez de données pour juger leur impact.

## 15. Suivi d’exécution et définition de la réussite

Chaque tâche SEO-01 à SEO-36 prendra un état : à faire, en cours, à vérifier, terminée ou en attente d’un élément nommé. Le suivi indiquera la preuve, la prochaine action et le lot concerné. Une tâche technique terminée signifie que le changement et sa recette sont disponibles ; une publication terminée signifie aussi que son contrôle public a réussi.

Les fichiers de travail seront conservés dans un dossier dédié `output/seo-implementation/` : état initial, sélection du pilote, matrice d’URL, liste de requêtes, registre de sources, preuves de recette, relevés avant/après et rapports de livraison. Les données confidentielles resteront dans des emplacements internes exclus des artefacts publics.

La réussite du pilote se mesure d’abord par des pages correctes et accessibles et un parcours commercial observable. La progression SEO se mesure ensuite par les recherches hors marque, les positions sur une cohorte stable, les demandes qualifiées et les ventes. Les seuils commerciaux seront fixés après mesure de l’état initial.

**Première action après validation : exécuter le lot 0, arrêter la sélection des 20 produits et 5 familles, puis engager les fondations techniques de la livraison A.**

## Références de préparation

- [Stratégie et sources SEO étudiées](STRATEGIE_SEO_AFRIQUE_NEWOTEG_2026-10-27.md).
- [Contrôle public du 27 octobre](../output/seo-research-2026-10-27/public-audit.json).
- [Rapport de livraison récente du catalogue](REVISION_CATALOGUE_DEPLOIEMENT_2026-10-27.md).
- Code récent consulté en lecture seule : `C:/Users/pc/.codex/worktrees/catalogue-revision-release/Newoteg`, notamment rendu catalogue, métadonnées, reconnaissance des routes, suivi de parcours et suites de tests associées.
