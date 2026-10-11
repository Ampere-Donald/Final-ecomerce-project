# Sources et relecture des caractéristiques — contrat serveur L1/L3

10 octobre 2026. Contrat serveur, formulaire d'administration et affichage fiche/comparateur raccordés et vérifiés localement. Version candidate non publiée, PR #10 en brouillon. La validation des données réelles et les conditions de livraison restent ouvertes.

## Comportement livré dans les sources

Une table facultative `documentation_valeur` accompagne les valeurs d'attribut existantes. Elle conserve texte et unité source, normalisation facultative, conditions, document/URL HTTPS/page ou section/révision, motif, état et relecture. Aucun texte, prix ou stock historique n'est réécrit ; la migration ne crée aucune annotation ni validation.

Les états sont inconnu, à vérifier, documenté, contradictoire et non applicable. Une absence d'annotation reste à vérifier ; elle n'est ni zéro ni documentée. Valeur normalisée et unité sont renseignées ensemble, sans conversion automatique. Une inconnue, contradiction ou non-application n'obtient pas de valeur normalisée. Contradiction et non-application demandent un motif.

L'état documenté demande une action administrative séparée, une confirmation explicite, un document identifiable, une URL, un repère précis et une note de décision. La saisie de brouillon ne peut pas définir cet état. Le serveur attribue l'identité et l'heure de relecture ; les champs forgés ne sont pas utilisés. Cela trace la déclaration d'un opérateur, sans prouver physiquement un remplacement ni vérifier automatiquement le document externe.

La documentation est liée aux versions de la valeur, de l'attribut et du produit. Modifier la valeur, son libellé ou l'identité/version du produit rend l'annotation obsolète : état public à vérifier, ancienne normalisation/source non affichée comme actuelle. La preuve antérieure reste disponible dans la lecture administrative jusqu'à remplacement de l'annotation. Ce modèle conserve la dernière annotation, pas un historique immuable de toutes les relectures. Un changement commercial incrémentant la version produit peut également demander une nouvelle relecture : choix conservateur signalé dans le formulaire.

Les modifications de documentation verrouillent valeur, attribut et produit dans une transaction PostgreSQL et vérifient les quatre versions. Deux écritures depuis la même version ont un seul gagnant ; l'autre reçoit 409 et doit recharger. Supprimer une valeur supprime sa documentation facultative.

Les fiches JSON chargent la documentation et la projettent explicitement, sans identité du relecteur. Fiche et comparateur utilisent ces métadonnées. Les lectures publiques d'attributs ne renvoient plus le produit complet : uniquement identité, nom et références internes, pour exclure les coûts et informations fournisseur. Les écritures existantes restent réservées aux administrateurs.

## Contrat HTTP

Préfixe `/api/valeurs-attribut/:id` ; UUID requis.

| Route | Accès | Comportement |
| --- | --- | --- |
| GET `/documentation` | Public | État effectif et sources publiques actuelles, sans identité du relecteur |
| GET `/documentation-admin` | ADMIN / SUPER_ADMIN | Contexte de valeur et annotation sauvegardée ; versions à reprendre dans le formulaire |
| PATCH `/documentation` | ADMIN / SUPER_ADMIN | Brouillon remplaçant les champs de documentation ; relecture précédente retirée |
| POST `/documentation/relire` | ADMIN / SUPER_ADMIN | Relecture explicite du contexte actuel ; état documenté attribué par le serveur |

Le body contient `version` (0 si annotation absente), `valeurVersion`, `attributVersion`, `produitVersion`, `etat` (hors DOCUMENTE), les champs facultatifs `uniteSource`, `valeurNormalisee`, `uniteNormalisee`, `conditions`, `sourceUrl`, `sourceDocument`, `sourceRepere`, `sourceRevision`, `motif`. La relecture part de A_VERIFIER et ajoute `confirmerRelecture: true`. Les champs omis sont effacés dans le remplacement ; charger l'annotation entière avant édition. L'interface doit présenter le motif comme un texte public. Aucun téléchargement, fournisseur IA ou envoi de message n'est déclenché.

## Preuves actuelles

- Build Nest/Prisma réussi, 60 suites / 456 tests backend passent.
- Lint ciblé des modules/projections modifiés réussi ; dette historique du gros ProduitService non reformatée. Contrôle de syntaxe et diff sans erreur d'espace.
- Script `Back-end/scripts/verify-technical-provenance-local.cjs --browser --update-contract` : douze groupes réels réussis. Trois bases dédiées sur le cluster local quote_test, données fictives uniquement ; création à partir du schéma Git baseline 7e5ec507, sauvegarde pg_dump, restauration psql puis application du fichier exact de migration sur les deux copies. Valeurs source identiques, zéro annotation créée par migration, structures concordantes avec le schéma Prisma candidat.
- Application Nest limitée aux contrôleurs concernés, vrais services, véritable PostgreSQL, stratégie JWT admin et RolesGuard réels. Accès anonyme 401, vendeur 403, body interdit/refus de relecture 400, écritures concurrentes avec un succès et un 409, projection publique sans identité/coûts, invalidation après changements de valeur/libellé/produit et cascade exercés.
- Connexion de chaque service à la base exactement créée vérifiée. Bases supprimées, contrôle indépendant à zéro base technique restante ; serveur PostgreSQL de test arrêté après essais. Aucun trafic ou écriture Railway, client réel, commande, encaissement, fournisseur ou notification.
- Contrat de livraison régénéré pour les seules nouvelles définitions testées et l'identité des sources ; définitions historiques conservées. Ce n'est pas une répétition de l'historique Railway ni une sauvegarde de production.

Voir `result.json`. Les confirmations de relecture des fixtures sont des actions de recette fictives, pas des validations métier NEWOTEG.

## Interfaces et vérifications ajoutées

- L'éditeur utilise `/valeurs-attribut` et les champs backend réels. Chaque attribut appartient à un produit choisi dans une recherche limitée à huit résultats, différée de 300 ms et annulable. Les vendeurs consultent les valeurs sans accès au formulaire privé ni aux écritures.
- Le formulaire distingue état actuel et brouillon ; charge tous les champs et versions ; présente la note comme publique. Une case non cochée initialement et une action séparée sont nécessaires pour relire. Toute modification de champ retire cette confirmation. Un 409 conserve la saisie et bloque une nouvelle écriture jusqu'au rechargement volontaire. Une actualisation échouée après enregistrement bloque aussi l'édition du contexte périmé.
- Les lectures/écritures privées de sources portent `Cache-Control: private, no-store`. Les champs d'identité administrative ne sont jamais projetés sur le storefront.
- Fiche et comparateur affichent états et sources précises en FR/EN au niveau de chaque valeur : document, repère, révision, conditions, note, date, lien HTTPS et normalisation éventuelle. Aucune source périmée n'est présentée comme actuelle ; les valeurs anciennes restent visibles avec « À vérifier ». Zéro demeure une valeur. Une égalité après conversion ne certifie pas une équivalence.
- 112 tests storefront réussis ; lint des sources (export local excluant seulement les anciens bundles générés et `.wrangler`) et build réussis. TypeScript admin, 23 tests de services, 121 tests d'interface puis 11 tests ciblés (dont trois nouveaux contrats de service) passent ; build moderne/legacy/PWA réussi. L'avertissement de taille des gros bundles admin préexistants demeure.
- Recette sources moderne et bundle legacy forcé : 390/768/1440 px, document et conditions, zéro, obsolescence, confidentialité, aucun débordement de page, aucune erreur JS ni appel externe/écriture. Recette du comparateur existante : quatorze groupes, six largeurs, stockage, changements de sélection, réponses tardives, erreurs, unités et FR/EN réussis.
- Chaîne navigateur/PostgreSQL réelle : brouillon PATCH, édition concurrente produisant un 409, saisie conservée, rechargement, confirmation explicite et POST 201, projection publique actuelle affichée dans le build produit. Le serveur Nest, JWT, gardes, DTO, transactions et base sont réels ; la session de consultation admin et le contenant produit sont des adaptateurs de fixture. Les captures et validations concernent uniquement les articles fictifs. Les contrôles mobiles vérifient que les actions restent atteignables et non couvertes par la navigation fixe.

Résultats : `result.json`, `browser-modern.json`, `browser-legacy.json`, `real-browser.json`, `comparison-regression.json`. Captures : [source admin desktop](captures/admin-1440.png), [actions admin mobile](captures/admin-actions-390.png), [fiche mobile](captures/product-390.png), [comparateur desktop](captures/comparison-1440.png).

## Suite obligatoire avant publication et clôture

1. Vérifier la CI sur la nouvelle tête de PR, préparer la livraison additive backend avant UI et réaliser la répétition en préproduction distante. La sauvegarde réelle et sa restauration locale sont maintenant prouvées ci-dessous ; elles doivent être actualisées si l'état de la cible change avant livraison. Le retour au code précédent conserve la table ; ne pas supprimer les sources pour revenir en arrière.
2. Faire accepter le dictionnaire/échantillon et relire les valeurs par la boutique avant toute annotation réelle ou conclusion d'équivalence. Fabricant, alias documentés et grille définitive par famille restent à finaliser.

L1/L3, la recette métier, la préproduction Railway et l'objectif A–Z restent ouverts. Ce contrat serveur ne remplace aucune exigence du plan complet.

## Sauvegarde réelle et répétition sur copie — 11 octobre, heure de Douala

À 22:54 UTC le 10 octobre, accès direct à PostgreSQL Railway 18.6 confirmé. Transaction répétable en lecture seule, export d'un snapshot partagé avec `pg_dump` 18.6 : sauvegarde réelle cohérente de 69 tables, dont l'historique Prisma. Une seule migration candidate est en attente ; aucune migration historique divergente ou échouée n'a été réparée.

Archive restaurée transactionnellement dans une nouvelle base locale PostgreSQL 18.6 ; comparaison des empreintes de toutes les lignes avec le même snapshot distant réussie. La session de comparaison utilise UTC pour éviter de confondre formatage du fuseau et modification de données. Le premier contrôle local avait échoué sur cette différence de formatage ; il a été corrigé sans modifier les données ni assouplir la comparaison.

Application locale de la migration avec `prisma migrate deploy`, puis vérification complète du contrat de livraison : 68 tables métier et 61 enregistrements historiques conservés exactement, un nouvel enregistrement de migration, aucune annotation/relecture créée automatiquement. Base temporaire supprimée ; zéro base de répétition restante et cluster dédié arrêté. La suppression récursive des fichiers du cluster a été refusée par le contrôle automatique ; ces fichiers restent dans le dossier privé protégé, sans serveur actif.

Voir `target-rehearsal.json`. Sauvegarde et preuves privées conservées hors Git dans un dossier dont les droits NTFS sont limités à l'utilisateur local et SYSTEM. Aucun dump, ligne métier, secret ou identifiant client dans les fichiers du dépôt. L'archive couvre la base PostgreSQL ; elle n'est pas une sauvegarde des objets/images ou de la configuration de l'hébergement.

Cette répétition ne lance pas l'application contre les données clients, n'envoie aucune notification et n'écrit pas sur Railway. Elle ne prouve pas le démarrage dans une préproduction distante. L'accès de gestion Railway reste à rétablir pour cette étape. PR #10 encore en brouillon ; lot non publié, validation métier toujours attendue. L'offre Cloudflare est inconnue : aucune offre payante ni modification de facturation présumée.

## Correction du contenu des images — 11 octobre

Actualisation du 11 octobre : [références fabricant et alias documentés](../documented-search-20261011/README.md) ajoutent une seconde migration et des recherches raccordées. Les preuves ci-dessus restent datées et concernent la version à une migration. La préproduction Railway est maintenant différée à la demande de l’utilisateur ; les autres travaux se poursuivent.

Les images `Dockerfile.catalogue` et `Back-end/Dockerfile.preproduction` omettaient `accepted-migration-history.cjs`, importé par le garde de schéma. Deux tests reproduisent `MODULE_NOT_FOUND` avec les scripts réellement sélectionnés par leurs instructions COPY avant correction. Le fichier est désormais inclus dans les deux images, l'allowlist Docker et le préparateur du contexte privé. L'image backend historique copie déjà le dossier scripts entier et ne présente pas cette omission. Aucune exception supplémentaire aux migrations historiques n'est ajoutée.

Treize tests locaux de chargement, ordre du démarrage, refus des dérives et arrêt sur signal passent. La CI construit maintenant aussi l'image de préproduction ; les trois images candidates (catalogue avec deux origines API et préproduction) chargent leurs gardes réels en conteneur non privilégié, sans réseau, base ou application démarrée. Le vérificateur contrôle aussi l'identité du contrat empaqueté et la présence du binaire compilé et de Prisma. CI exacte du code 79fe5b6f réussie : les trois constructions et contrôles des images passent dans le workflow 38095107018 ; backend, storefront, admin, Android et outils Windows passent dans le workflow 38095106990. Voir `image-startup.json`. Ce contrôle de chargement ne remplace pas un démarrage avec la base isolée distante.
