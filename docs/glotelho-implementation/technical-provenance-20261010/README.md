# Sources et relecture des caractéristiques — contrat serveur L1/L3

10 octobre 2026. Implémentation serveur en cours, non publiée. Le formulaire d'administration et l'affichage fiche/comparateur restent à raccorder avant livraison complète.

## Comportement livré dans les sources

Une table facultative `documentation_valeur` accompagne les valeurs d'attribut existantes. Elle conserve texte et unité source, normalisation facultative, conditions, document/URL HTTPS/page ou section/révision, motif, état et relecture. Aucun texte, prix ou stock historique n'est réécrit ; la migration ne crée aucune annotation ni validation.

Les états sont inconnu, à vérifier, documenté, contradictoire et non applicable. Une absence d'annotation reste à vérifier ; elle n'est ni zéro ni documentée. Valeur normalisée et unité sont renseignées ensemble, sans conversion automatique. Une inconnue, contradiction ou non-application n'obtient pas de valeur normalisée. Contradiction et non-application demandent un motif.

L'état documenté demande une action administrative séparée, une confirmation explicite, un document identifiable, une URL, un repère précis et une note de décision. La saisie de brouillon ne peut pas définir cet état. Le serveur attribue l'identité et l'heure de relecture ; les champs forgés ne sont pas utilisés. Cela trace la déclaration d'un opérateur, sans prouver physiquement un remplacement ni vérifier automatiquement le document externe.

La documentation est liée aux versions de la valeur, de l'attribut et du produit. Modifier la valeur, son libellé ou l'identité/version du produit rend l'annotation obsolète : état public à vérifier, ancienne normalisation/source non affichée comme actuelle. La preuve antérieure reste disponible dans la lecture administrative. Un changement commercial incrémentant la version produit peut également demander une nouvelle relecture : choix conservateur à expliquer dans l'éditeur.

Les modifications de documentation verrouillent valeur, attribut et produit dans une transaction PostgreSQL et vérifient les quatre versions. Deux écritures depuis la même version ont un seul gagnant ; l'autre reçoit 409 et doit recharger. Supprimer une valeur supprime sa documentation facultative.

Les fiches JSON chargent la documentation et la projettent explicitement, sans identité du relecteur. Le frontend actuel ignore encore ces métadonnées. Les lectures publiques d'attributs ne renvoient plus le produit complet : uniquement identité, nom et références internes, pour exclure les coûts et informations fournisseur. Les écritures existantes restent réservées aux administrateurs.

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
- Script `Back-end/scripts/verify-technical-provenance-local.cjs` : onze groupes réels réussis. Trois bases dédiées sur le cluster local quote_test, données fictives uniquement ; création à partir du schéma Git baseline 7e5ec507, sauvegarde pg_dump, restauration psql puis application du fichier exact de migration sur les deux copies. Valeurs source identiques, zéro annotation créée par migration, structures concordantes avec le schéma Prisma candidat.
- Application Nest limitée aux contrôleurs concernés, vrais services, véritable PostgreSQL, stratégie JWT admin et RolesGuard réels. Accès anonyme 401, vendeur 403, body interdit/refus de relecture 400, écritures concurrentes avec un succès et un 409, projection publique sans identité/coûts, invalidation après changements de valeur/libellé/produit et cascade exercés.
- Connexion de chaque service à la base exactement créée vérifiée. Bases supprimées, contrôle indépendant à zéro base technique restante ; serveur PostgreSQL de test arrêté après essais. Aucun trafic ou écriture Railway, client réel, commande, encaissement, fournisseur ou notification.
- Contrat de livraison régénéré pour les seules nouvelles définitions testées et l'identité des sources ; définitions historiques conservées. Ce n'est pas une répétition de l'historique Railway ni une sauvegarde de production.

Voir `result.json`. Les confirmations de relecture des fixtures sont des actions de recette fictives, pas des validations métier NEWOTEG.

## Suite obligatoire avant publication et clôture

1. Réparer l'éditeur existant : route `/valeurs-attribut`, attribut rattaché à un produit, champs `nomAttribut`/`typeAttribut` réels ; intégrer le formulaire de sources, les versions, le refus 409 et la relecture explicite.
2. Afficher l'état, la source précise et les conditions sur fiche/comparateur en FR/EN, sans assimiler normalisation et compatibilité. Vérifier le clavier, les petites largeurs et les sources obsolètes.
3. Rejouer la chaîne UI/API en base isolée puis les builds frontend/admin et la CI. Préparer la livraison additive backend avant UI, le relevé de sauvegarde cible et le retour au code précédent en conservant la nouvelle table ; ne pas supprimer les sources pour revenir en arrière.
4. Faire accepter le dictionnaire/échantillon et relire les valeurs par la boutique avant toute annotation réelle ou conclusion d'équivalence. Fabricant, alias documentés et grille définitive par famille restent à finaliser.

L1/L3, la recette métier, la préproduction Railway et l'objectif A–Z restent ouverts. Ce contrat serveur ne remplace aucune exigence du plan complet.
