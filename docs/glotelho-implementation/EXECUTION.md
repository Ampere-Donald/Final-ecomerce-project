# Suivi d’exécution — NEWOTEG / X-Electronic

Dernière mise à jour : 29 septembre 2026. Exécution des lots L0–L8 autorisée par l’utilisateur; L9 reste soumis à une autorisation distincte.

## Référence et décisions

- Base active : branche locale `main`, commit `cf834346f64921c297822f438635e1244de39671`, dans le worktree isolé `codex/newoteg-evolution`.
- Le worktree principal et l’ancien worktree `codex/refonte-e` sont préservés. Le travail E est réintégré sur la base actuelle; les protections catalogue plus récentes restent prioritaires.
- Aucun accès Railway, secret, service de paiement, notification réelle, appel d’IA distant ou déploiement de production n’est utilisé par cette phase.
- Réception validée pour le pilote : retrait à Akwa possible après confirmation de disponibilité; livraison possible avec adresse saisie, mais frais et délai restent explicitement à confirmer par la boutique.
- Les règles qui exigent une validation NEWOTEG restent dépendantes : tarifs/zones de livraison, seuils professionnels, politique de compte invité et de suivi, produits et cas techniques étalons.

## Lots

| Lot | État | Preuve ou dépendance restante |
|---|---|---|
| L0 — État de référence | Validé | Base identifiée; quatre conflits résolus; build backend, cinq suites backend ciblées (26 tests), build storefront, typage admin et 26 suites UI admin (65 tests) passent. Régression storefront simulée : 24 contrôles, dont achat invité, deux modes de réception et cinq largeurs. |
| L1 — Données et règles | En cours | Schéma et parcours audités sans lire Railway; retrait Akwa + livraison à confirmer validés par l’utilisateur. Seuils pro et cas/validateur équivalences en attente. |
| L2 — Fiche et réception | En cours | Checkout E permet retrait Akwa ou demande de livraison; frais et délai annoncés à confirmer, sans frais nuls inventés. Les textes opérationnels des pages héritées, zones et tarifs restent à valider. |
| L3 — Recherche et équivalences | En cours | Site et outil de vente marquent les pistes IA comme non validées techniquement; aucun ajout automatique. Références étalons, technicien NEWOTEG et budget d’essai distant restent attendus. |
| L4 — Projets et sélections | À faire | Sélections existantes à auditer; projet pilote et images marketing à faire valider. |
| L5 — Devis et achats récurrents | À faire | Demande client dédiée à construire sans exposer les routes administratives. |
| L6 — Commande invitée | En cours | Achat invité et demande de livraison testés de bout en bout sur API simulée; création de compte facultative. La confirmation n’envoie plus un invité vers le suivi privé d’un compte. Reprise sûre après réponse perdue, suivi privé et rattachement restent à spécifier et vérifier. |
| L7 — Avis et mesure | À faire | Preuve de réception, modération et instrumentation à concevoir sans PII. |
| L8 — Recette et préproduction | À faire | Dépend des lots précédents, de l’environnement isolé et de la procédure de restauration. |
| L9 — Publication publique | Non autorisé | N’entre pas dans l’autorisation actuelle. |

## Contrôles de départ

- Les changements récupérés viennent de la refonte E antérieure et ont été appliqués par rapport à l’ancêtre commun, puis revus sur les conflits du panier, des favoris, de la commande et des équivalences.
- Le devis serveur réutilise les produits actifs, le stock courant et le prix courant; un prix absent ou modifié bloque la confirmation et renvoie un devis à accepter.
- L’hydratation panier/favoris revalide maintenant les références contre le catalogue, ce qui évite d’afficher comme achetables les prix, stocks ou visuels périmés du stockage local.
- Installations npm locales terminées depuis les fichiers de verrouillage. Le build backend et storefront, le typage admin, 5 suites backend (26 tests), 13 tests Node du storefront, 6 tests de démarrage préproduction et 26 suites UI admin (65 tests) réussissent. `npm ci` n’a pas changé les fichiers verrouillés. Après la dernière modification UI, les builds/contrôles sont relancés.
- Vérification navigateur locale `Font-end/tests/verify-storefront.cjs` : 24 contrôles réussis, avec interception de toutes les requêtes `/api/**`; retrait et livraison testés, frais de livraison inconnus absents du payload, achat invité sans e-mail ni mot de passe, devis et confirmations simulés, erreurs/réessai, stock, persistance et mises en page à 360/390/768/1000/1440 px. Le mock de catalogue fournit explicitement `estActif` afin de tester la revalidation des favoris/panier. Aucun serveur API ni Railway utilisé.
- Après le checkout invité : build Vite storefront et lint ESLint des quatre fichiers modifiés réussis, tests Node storefront 13/13, test backend commande-checkout 6/6. Le build signale des données Browserslist anciennes, sans échec.
- La confirmation est maintenant conditionnelle à l’accès réel : un compte authentifié a le lien de suivi; l’invité conserve son numéro et voit le contact boutique, sans fuite via la route privée. Le scénario invité vérifie cette différence.
