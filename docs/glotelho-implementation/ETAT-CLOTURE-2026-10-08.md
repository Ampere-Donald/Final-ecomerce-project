# État de clôture du plan A–Z — 8 octobre 2026

**Actualisation du 23 octobre :** [audit courant et conditions ouvertes](AUDIT-COURANT-2026-10-23.md). Quinze contrôles HTTP anonymes de production réussissent ; emails/SMS et collecte toujours désactivés, zéro projet public. Les preuves datées ci-dessous sont conservées comme historique et ne constituent pas une clôture générale.

Ce point remplace les anciennes estimations générales d’avancement et les mentions « non publié » du bilan du 4 octobre. La publication a été explicitement autorisée ensuite et réalisée. Elle ne clôture pas les critères métier du plan.

## Preuves actuelles

Contrôle public en lecture seule du 8 octobre à 03:25 UTC : /api/health 200, API/base/stockage ok ; /api/commandes/guest/channels retourne email=false et sms=false ; /api/projets?page=1&limit=1 retourne total=0 ; /api/parcours/disponibilite retourne actif=false. Preuve locale : output/implementation-work/launch-gates-20261008.json. Aucun envoi, commande, paiement ni modification de données.

Les preuves commerciales locales sont datées dans RECETTE-TRANSVERSALE-L8.md ; elles ne prouvent pas une opération réelle par l’équipe sur Railway. Les mesures de production les plus récentes et leurs limites figurent dans PERFORMANCE-PRODUCTION-2026-10-08.md. Les commits de correction sont publiés sur main, dont f8ad0790 pour les photos responsives.

| Lot | État constaté | Condition encore nécessaire pour clôturer |
| --- | --- | --- |
| L0 Référence | Sources et historique enregistrés ; copie principale préservée | Conserver cette traçabilité à chaque livraison |
| L1 Données | Contrats en place ; audit catalogue livré | Valider prix/champs techniques et responsables ; les 761 prix manquants de l’audit ne sont pas inventés |
| L2 Réception | Parcours testé ; règle Akwa/livraison à confirmer approuvée | Recette équipe et validation des informations boutique/support |
| L3 Équivalences | Moteur raccordé, choix explicite, scénarios logiciels testés | Cas réels relus par un technicien ; une proposition logicielle n’est pas une validation de remplacement |
| L4 Projets | Gestion et parcours implémentés | Aucun projet public actuellement : fournir puis relire un projet pilote et sa nomenclature |
| L5 Professionnels | Devis et réachat exercés en base isolée | Un opérateur doit accepter le processus de traitement réel et ses responsabilités |
| L6 Invités | Accès privé/reprise testés | Email et SMS désactivés : délivrabilité, récupération et procédure de perte d’accès restent à valider |
| L7 Avis/mesure | Modération et compteurs testés localement | Collecteur public désactivé ; activation, journaux hébergeurs, durée des agrégats et responsable de lecture à traiter |
| L8 Recette | Nombreuses preuves locales et contrôles publics | Budget LCP non atteint, téléphone réel/équipe, préproduction isolée actuelle et exploitation humaine non prouvés |
| L9 Publication | Storefront/backend/admin publiés, contrôles publics réalisés | Bilan sur période réelle comparable et traitement des limites ; pas de taux de succès inventé |

## Ordre de fin, sans réduire le périmètre

1. Poursuivre le travail technique indépendant : rendu initial/chemin JavaScript, contrôles des erreurs et préproduction isolée. Ne pas transformer une optimisation d’image en certificat de performance.
2. Faire relire un petit catalogue pilote complet et un projet par la boutique ; publier seulement les données validées. La question sur le projet et le technicien reste en attente dans la conversation.
3. Choisir et configurer les transports email/SMS lorsqu’ils seront disponibles ; tester réception et récupération sur adresses/numéros autorisés en environnement isolé. Ne pas demander de secrets dans le chat.
4. Vérifier l’exploitation des observations anonymes avant activation, puis tracer la date d’activation. Collecteur arrêté ne veut pas dire absence de visiteurs.
5. Faire la recette sur téléphone réel avec un opérateur : demande, confirmation boutique, préparation/retrait, incident, avis, réachat. Ne pas créer de fausses commandes dans la base clients pour satisfaire ce critère.
6. Clôturer lot par lot sur preuves, puis seulement déclarer l’objectif complet.

## Guides disponibles pour l’équipe

GUIDE-TRAITER-DEVIS.md, GUIDE-SUIVI-INVITE.md, GUIDE-INCOMPATIBILITES.md, AVIS.md et LECTURE-INDICATEURS.md décrivent les gestes et limites. Les phrases historiques « local uniquement » ou « publication non autorisée » y décrivent leur date de rédaction ; l’activation d’un fournisseur ou d’une collecte reste distincte du déploiement du code.

Aucun pourcentage global renouvelé : un chiffre unique masquerait les validations manquantes. Le présent audit ne refait pas tous les tests ni ne prouve la clôture de chaque exigence ; il identifie les preuves actuelles et les gates encore ouverts.

## Actualisation du 10 octobre

Les quatre gates publics ci-dessus ont été relus : état inchangé, API/base/stockage OK, transports invités et collecteur désactivés, aucun projet publié. Le travail L8 a comparé un préchargement conditionnel de routes au build V3 actuel : gain catalogue faible, accueil légèrement plus lent, budget LCP toujours non atteint. Le candidat a été retiré et n'est pas déployé. [Mesures, limites et décision](performance-20261010/README.md). Le rendu public initial et le temps d'exécution restent la prochaine cible technique ; aucun lot n'est clôturé par cette expérience.

Le rendu public initial de l'accueil a ensuite été implémenté et exercé : composants existants générés au build puis hydratés, sans donnée client ou prix figé. Médiane locale de l'accueil 4520 → 2376 ms ; un passage encore au-dessus de 2500 ms, catalogue toujours insuffisant et séries dispersées. Recettes de reprise, stockage bloqué, session, panier, langue, navigation et legacy réussies. [Preuves et limites](initial-home-20261010/README.md). Cette avancée ne clôt pas L8 ou les autres conditions du plan ; le statut de publication doit être vérifié séparément.

Publication effective de ce rendu vérifiée ensuite sur le domaine : version Cloudflare `5a5d0a92-b50f-49ef-8bc6-42543f6a3c43`, commit `96c94c03`. HTML initial et protections privées constatés, sept contrats de reprise et dix-neuf contrôles commerciaux publics réussis. Médianes synthétiques publiques : accueil 2960 ms / catalogue 5152 ms ; budget LCP encore manqué. API/base/stockage OK, transports et collecteur toujours arrêtés, zéro projet public à 09:48 UTC. Le catalogue et les autres conditions restent à traiter ; la CI GitHub distante n'a pas été vérifiée.

Le catalogue a ensuite reçu un prototype de rendu initial des vrais produits. Médiane LCP locale 4320 → 2356 ms, contrats locaux/distants réussis ; offre Workers Free confirmée et CPU réel médian 22 ms pour un plafond gratuit de 10 ms. Ce renderer reste expérimental et n'est pas activé en production. Le Worker temporaire de mesure a été supprimé. [Décision et preuves](catalogue-html-20261010/README.md). L8 reste ouvert : le coût serveur doit être réduit ou déplacé avant activation.

Cette exécution React a ensuite été déplacée dans un paquet backend optionnel, avec endpoint public, version concordante et repli client. Adaptation native testée : builds/lint, 102 tests frontend, 419 tests backend, contrats de paquet/HTTP/navigateur réussis, médiane locale comparable 4416 → 2048 ms. [Preuves et limites](catalogue-backend-20261010/README.md). L'image isolée Railway et la nouvelle mesure CPU Free ne sont pas encore réalisées ; candidat non publié, L8 et objectif A–Z toujours ouverts.

La vraie image Docker a depuis été construite et vérifiée en CI ; la CI complète (y compris Android et Windows) passe au commit d2c2d27e. Cinq routes du renderer compilé passent contre la base réelle en lecture seule et conservent exactement les données publiques. Dépendances de niveau haut/critique corrigées, sans suppression de gates. L'hébergement de cette image sur Railway et le CPU réel du nouveau transport restent non prouvés ; session de gestion Railway absente et association expirée. Sources prêtes à livrer, rendu catalogue non activé. Ces progrès ne clôturent pas L8 ou les validations métier du plan.

Sources publiées ensuite ; parité Docker/frontend réglable et vérifiée en CI dans deux configurations, main `6bbd1ae1`. Mesure réelle du traitement du transport Cloudflare avec fragments fixes : 2–5 ms pour le catalogue représentatif, 5–8 ms à la limite simulée, cinq passages chacun ; Worker temporaire supprimé et absence vérifiée. [Preuves et portée](catalogue-transport-20261010/README.md). Le traitement du transport est mesuré, la latence Railway et l'intégration hébergée complète ne le sont pas. Renderer toujours désactivé, accès de gestion attendu, L8 et toutes les validations métier restantes toujours ouverts.

L'allègement du hero est publié sur main `8228f7b9` et vérifié publiquement : 34 478 octets économisés sur les deux images en mobile de densité 1, design et résolution haute densité conservés, pas de double requête du hero. CI complète et catalogue Docker à deux configurations réussis, ressources publiques identiques au build vérifié, sept cas d'images réussis. LCP public 2796 / 2540 / 2336 ms, CLS 0 ; deux passages dépassent encore 2500 ms. [Preuves et limites](home-image-transfer-20261010/README.md). API/base/stockage OK, SSR catalogue, transports et collecteur toujours désactivés, aucun projet publié à 18:00 UTC. L8 et les gates métier restent ouverts, objectif actif.


## Comparaison des unités explicites — 10 octobre 2026

Le comparateur conserve les valeurs sources mais ne signale plus 1 A / 1000 mA comme une différence. Calcul décimal exact, casse des préfixes respectée ; valeurs ambiguës, plages et conditions laissées littérales, données manquantes toujours explicites. Aucun score de compatibilité. 106 tests Node, lint/build et quatorze groupes navigateur dans chaque bundle moderne/legacy réussis ; FR/EN, cinq largeurs et captures inspectées. Logique chargée seulement avec la route de comparaison. [Preuves et portée](comparison-units-20261010/README.md). Cette étape fait avancer L1/L3 ; sources prêtes, publication encore à vérifier, validation des caractéristiques et des remplacements par la boutique toujours requise.


Publication de la correction vérifiée à 18:58 UTC : PR #8 fusionnée, main `168f961e`, version client Cloudflare `b1d28454-b4bd-4fcd-a7c4-44526624462a` à 100 %. Sept ressources publiques (dont les deux chunks de comparaison) identiques au build local par SHA-256. Deux contrôles publics de l’interface 390/1440 réussis avec API de recette simulée : données sources, conversion, filtre, absence de débordement/erreurs/écritures. CI complète et les deux images catalogue passent sur main ; déploiement Railway existant réussi, santé API/base/stockage OK. Les données réelles n’ont pas été modifiées et ces tests ne prouvent aucune compatibilité physique. Renderer catalogue, email/SMS et collecteur toujours désactivés, zéro projet public. L1/L3/L8 et les autres validations métier restent ouverts. [Dossier de preuve](comparison-units-20261010/README.md).


## Recherche du catalogue avec accents — 10 octobre 2026

Défaut réel corrigé : « câble HDMI » ne retrouvait aucun article dans les suggestions alors que « HDMI » en trouvait. Clé JS/SQL commune, noms et données sources conservés, suffixes significatifs, filtres inchangés et ponctuation seule sans résultat. 420 tests backend/build réussis, véritable SQL et six lectures catalogue en session strictement en lecture seule passent, parcours navigateur clavier/catalogue à 390/1440 passent avec service isolé. Publication à vérifier ; pas de migration ni de données fictives en production. [Preuves et limites](catalogue-search-20261010/README.md). Avancée L3 ; validation technique L1/L3, accès Railway, L8 et l'objectif A–Z restent ouverts.


Publication de la recherche accentuée vérifiée sur main 7e5ec507, PR #9 : CI complète/images et déploiements Workers/Railway réussis, six GET réels et parcours public 390/1440 passent sans écriture ; santé API/base/stockage OK. [Preuves](catalogue-search-20261010/README.md). Le dictionnaire technique et un échantillon proposé de huit fiches réelles sont préparés dans [le dossier pilote](catalogue-pilot-20261010/DICTIONNAIRE.md) : pas d'attribut dans ces réponses détaillées, aucune valeur technique inventée ou publiée, relecture toujours attendue. L1/L3 et l'objectif A–Z restent ouverts.


## Sources et relecture technique — contrat serveur du 10 octobre 2026

Table facultative additive, états explicites, source précise, normalisation sans effacement du texte, action de relecture distincte et identité/heure serveur. Versions valeur/attribut/produit liées à la preuve ; modification ou contexte périmé invalide l'état documenté. Projection publique sans identité du relecteur et lectures d'attributs limitées aux champs produit nécessaires. Build/lint ciblé, 456 tests backend et onze groupes PostgreSQL/HTTP réels passent : sauvegarde/restauration du schéma baseline et migration répétée sur fixtures locales, droits, concurrence et invalidations. Trois bases retirées, aucun écrit Railway ni validation réelle. [Contrats, preuves et étapes restantes](technical-provenance-20261010/README.md). Formulaire admin et affichage fiche/comparateur pas encore raccordés ; sources non publiées, validation métier L1/L3 toujours requise, objectif A–Z actif.


## Sources techniques — interfaces et chaîne complète du 10 octobre 2026

Formulaire admin raccordé aux routes et champs réels, recherche de produit associée, saisie conservée au refus 409, relecture distincte et explicite. Fiche/comparateur FR/EN affichent les sources actuelles par valeur, conditions, statut et obsolescence sans certifier une compatibilité. Builds storefront/admin/backend réussis, 456 tests backend, 112 storefront, 121 UI admin puis 11 ciblés et 23 services passent. Douze groupes PostgreSQL/HTTP avec navigateur réel, restauration locale et migration exacte réussis ; contrôles moderne/legacy 390/768/1440, quatorze groupes de régression comparateur réussis. Aucun article réel annoté, aucune écriture Railway. [Preuves](technical-provenance-20261010/README.md). PR #10 mise à jour en brouillon ; sauvegarde cible, préproduction distante et validation métier restent nécessaires. L1/L3 et l'objectif A–Z restent ouverts.

## Sauvegarde cible et répétition de la migration — 11 octobre 2026

Sauvegarde cohérente réelle de PostgreSQL Railway 18.6 effectuée en lecture seule, puis restaurée sur un cluster local isolé de même version. Empreintes de toutes les lignes restaurées identiques au snapshot distant ; migration candidate appliquée localement par Prisma, 68 tables métier et 61 migrations historiques préservées, une seule migration ajoutée et zéro relecture automatique. Contrat de livraison complet réussi ; base temporaire supprimée et serveur arrêté. Archive privée hors Git, fichiers du cluster conservés dans le dossier protégé après refus de leur suppression récursive. [Preuve et portée](technical-provenance-20261010/README.md). PR #10 non publiée ; préproduction distante et validations métier toujours ouvertes. L'offre Cloudflare reste inconnue, sans changement de facturation. Cette étape avance L8 sans clôturer l'objectif A–Z.

## Images de livraison — défaut de dépendance corrigé le 11 octobre

Le garde de migrations importait un fichier absent des deux images optionnelles catalogue/préproduction. Deux tests de chargement reproduisent MODULE_NOT_FOUND avant correction ; inclusion et allowlists corrigées, treize tests locaux passent. La CI construit désormais la préproduction et charge les gardes des trois images candidates sans base/réseau. CI exacte 79fe5b6f verte : trois images réelles et leurs gardes passent, ainsi que les cinq jobs de la CI complète. Preuve image-startup.json ; aucun déploiement ni nouvelle exception à l'historique. [Portée](technical-provenance-20261010/README.md). Accès de gestion Railway, préproduction réelle et critères métier toujours ouverts.

## Poursuite sans préproduction Railway — 11 octobre

L’utilisateur demande de continuer sans cette étape : connexion et préproduction Railway sont différées. Administration des références fabricant/alias documentés et raccordement aux deux recherches catalogue réalisés, sans données inventées ni publication. Migration supplémentaire nullable et sans reprise automatique, répétée avec la précédente sur schéma historique/restauration synthétique. [Preuves et limites](documented-search-20261011/README.md). La répétition réelle précédente concernait une seule migration ; ne pas l’appliquer comme preuve à la nouvelle version. Objectif A–Z, validation des données et autres critères métier restent ouverts.

## Sources dans les équivalences — 12 octobre

Le moteur et les résultats consultent désormais les sources relues actuelles du catalogue et le client peut préciser les contraintes de son montage. Sous-ensemble borné, prix/disponibilité serveur, exclusion des coûts/relecteurs/sources du fournisseur, invalidation du cache et absence du montage dans le journal persistant contrôlés. Builds/lint, 465 tests backend complets puis 10 ciblés, 113 tests storefront, 18 groupes SQL/HTTP et 12 parcours du build FR/EN/mobile/tablette/desktop passent ; captures inspectées et bases temporaires supprimées. [Preuves et portée](equivalence-sources-20261012/README.md). Sources synthétiques uniquement, pas de fournisseur réel, annotation ou publication. PR #10 demeure en brouillon. Validation des caractéristiques et remplacements par les techniciens, autres critères métier et préproduction différée restent ouverts ; objectif A–Z actif.

## Dictionnaire technique et relecteur désigné — 12 octobre

45 clés serveur explicites en sept groupes, sélection admin avec reprise après indisponibilité, libellés publics FR/EN et regroupement du comparateur par rôle. Les noms/valeurs sources restent conservés ; entrée et sortie ne sont pas confondues, les données absentes restent incomplètes et une modification retire la relecture courante. Références fabricant/alias restent les seules identités de recherche. Builds réussis, 471 tests backend, 117 storefront, 13 ciblés admin et 13 gardes ; 21 groupes PostgreSQL/Nest/HTTP et 12 cas navigateur moderne/legacy FR/EN à 390/768/1440 réussissent. Trois migrations additives répétées sur restauration synthétique, aucun écrit Railway ou article réel annoté. [Preuves, limites et ordre de livraison](technical-dictionary-20261012/README.md).

Mr Jude Fogueng, CEO et propriétaire de NEWOTEG, est désigné par l’utilisateur pour la validation technique. Le dossier pilote consigne son rôle sans créer de compte, annotation ou verdict en son nom. Acceptation des références, preuves réelles et cas de remplacement restent ouverts. PR #10 en brouillon, incrément non publié, préproduction Railway différée et objectif A–Z actif.

## Registre serveur des décisions de remplacement — 12 octobre

Contrat distinct des scores du moteur : référence/candidat/usage exacts, quatre verdicts, justification/limites, source de l’original et sélection de valeurs relues. Sauvegarde et relecture séparées, contrôle de version/empreinte, historique conservé et évaluation publique sans cache ni identité privée. Les changements de source, cible, valeurs ou retrait retirent la décision courante ; rupture/archive relues. Suppression d’un produit lié refusée avec explication pour désactivation, sans médias ou événement supprimés. Build/lint et tests ciblés passent ; 26 groupes PostgreSQL/Nest/HTTP et 13 gardes passent après répétition des quatre migrations sur restauration synthétique. [Preuves et portée](replacement-cases-20261012/README.md).

Ce registre est le contrat serveur : formulaires admin, intégration des pièces relues à la sélection et présentation des décisions dans les résultats restent à réaliser et à vérifier sur navigateur/mobile. Pas d’article réel annoté, dossier ou compte créé pour Mr Jude Fogueng, ni publication. Préproduction Railway différée, PR #10 toujours en brouillon. L1/L3 et les autres critères A–Z restent ouverts ; objectif actif.

## Administration des cas de remplacement — 12 octobre

Formulaire ADMIN/SUPER_ADMIN relié au registre : choix des pièces et preuves, référence/usage précis, décisions et adaptations, sauvegarde distincte de la relecture, retrait et historique consultable. Lecture privée paginée par pièce sans coûts internes ; recherche, sources ou écritures indisponibles n’effacent pas les champs. Modification locale révoque la confirmation ; vrai conflit de dossier/source conserve la saisie jusqu’au rechargement volontaire. Dates de la liste ne certifient pas l’état courant. Builds backend/admin, lint/TypeScript et dix tests UI ciblés passent ; 28 groupes PostgreSQL/Nest/HTTP avec parcours du build admin et captures mobile/tablette/desktop réussissent. [Preuves et limites](replacement-admin-20261012/README.md).

Sources et verdicts synthétiques uniquement ; aucune décision réelle ni compte créé pour Mr Jude Fogueng. Le candidat relu doit encore entrer dans la sélection publique et son verdict/périmètre être présenté aux clients en FR/EN. Validation des références/données par le référent technique, autres critères A–Z et préproduction différée restent ouverts. PR #10 en brouillon, incrément non déployé ; objectif actif.

## Dossiers de remplacement dans le parcours client — 13–14 octobre

Lecture publique distincte du moteur : dossiers relus actuels retrouvés même lorsque la présélection lexicale omet la pièce, prix/stock et champs publics autoritaires, pagination bornée et continuation sur page invalidée. Référence complète conservée ; un autre montage ne reçoit pas automatiquement la décision. Quatre verdicts, usage/motif/limites, adaptations et document/date sont consultables en FR/EN. Recherche volontaire sur l’usage relu, annulation/retrait des résultats à la saisie et reprise après indisponibilité sans ancienne validation conservée. Défilement clavier adapté à la hauteur réelle du header. Builds/lint, 123 tests storefront et gardes passent ; SQL/HTTP et parcours du build moderne/legacy aux trois largeurs sont consignés dans [la recette et ses limites](replacement-client-20261013/README.md).

Pas de migration supplémentaire, fournisseur distant, article réel annoté ou décision physique acceptée. L’administration et le parcours public sont préparés pour les données pilotes à relire par Mr Jude Fogueng ; critères métier des lots L1/L3 et autres critères A–Z toujours ouverts. Préproduction Railway différée, PR #10 en brouillon, incrément non déployé ; objectif actif.


## Publication demandée — 16 octobre 2026

L’utilisateur demande une publication immédiate avec report des étapes métier 1 à 4. PR #10 fusionnée sur main def60d76 ; storefront/admin et backend Railway publiés et vérifiés. Quatre migrations appliquées, zéro en attente, contrat historique/structurel complet réussi ; sauvegarde réelle restaurée localement et données préservées. CI complète/trois images, seize ressources publiques identiques au build et huit groupes navigateur publics réussissent. [Version, preuves et limites](release-20261016/README.md).

Les mentions précédentes « brouillon/non déployé » sont historiques. Validation des données et remplacements par Mr Jude Fogueng, projet pilote, fournisseurs email/SMS et recette opérateur restent reportés, pas acquis. Renderer catalogue, transports et collecteur restent désactivés ; aucun projet public. Préproduction différée et performance restent ouvertes. Incrément livré ; objectif A–Z actif.


## Chargement initial catalogue — 19 octobre 2026

Deux lectures publiques démarrent avant les scripts ; React réutilise les données et la photo responsive initiale. Pas de cookies/stockage persistant, pas de doublon à l’arrivée, retour à la lecture normale en cas d’erreur et reprise explicite fraîche. 131 tests, lint/builds, huit groupes navigateur moderne/legacy 390/768/1440, hydratation accueil et syntaxe ES2017 passent. Trois paires locales avec vrais produits : médiane LCP 5016 → 4148 ms, CLS maximal 0,00471 ; seuil 2500 ms toujours manqué, gain public non confirmé. [Preuves et limites](catalogue-prefetch-20261019/README.md). Candidat à livrer ; renderer Railway, étapes métier reportées et autres critères A–Z restent ouverts.


## Catalogue anticipé publié — 19 octobre 2026

PR #11 fusionnée, main 0492cc4b ; les deux Workers et Railway sont publiés et vérifiés. Bootstrap/sept ressources exacts, API/base/stockage OK ; deux contrôles publics 390/1440 confirment données et photo avant les scripts, sans doublon ou écriture. Médiane LCP publique sous profil ralenti 5604 → 4704 ms, CLS maximal 0,00471 ; seuil 2500 ms encore manqué, pas de conclusion terrain. [Preuves et limites](catalogue-prefetch-20261019/README.md). Renderer catalogue, messages et collecteur désactivés, aucun projet public. Étapes métier reportées et objectif A–Z toujours ouverts.


## Recherche pertinente — 21 octobre 2026

Le serveur savait prioriser les identités exactes mais la page imposait A–Z. Le contrat partagé choisit maintenant Pertinence pour une recherche, conserve les tris explicites et rétablit A–Z hors recherche. 133 tests, lint/build et douze parcours moderne/legacy FR/EN 390/768/1440 passent avec vrai contrôleur/service/SQL sur fixtures isolées ; trente groupes réels réussis, bases retirées, aucun produit réel modifié. [Preuves et limites](catalogue-relevance-20261021/README.md). Publication à vérifier ; étapes métier reportées et objectif A–Z ouverts.


## Recherche pertinente publiée — 21 octobre

PR #12 fusionnée sur main b623518c, huit jobs CI et deux builds Cloudflare réussis. Bootstrap/sept ressources identiques au build propre ; trois contrôles publics FR/EN passent (code exact, choix de tri, catalogue A–Z, aucun doublon), accès privé admin conservé, API/base/stockage OK. Correctifs follow-redirects 1.16.1 et Vite admin 6.4.5 après refus des audits initiaux ; aucun contrôle supprimé. [Preuves et limites](catalogue-relevance-20261021/README.md). Aucun schéma ou article réel modifié ; étapes métier reportées, performance et objectif A–Z restent ouverts.
