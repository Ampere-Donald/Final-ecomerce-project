# Suivi d’exécution — NEWOTEG / X-Electronic

Dernière mise à jour : 29 septembre 2026. Exécution des lots L0–L8 autorisée par l’utilisateur; L9 reste soumis à une autorisation distincte.

## Référence et décisions

- Base active : branche locale `main`, commit `cf834346f64921c297822f438635e1244de39671`, dans le worktree isolé `codex/newoteg-evolution`.
- Premier jalon enregistré localement : commit `79f606ec` (`Integrate E storefront with guarded guest checkout`). Il reste sur la branche isolée et n’a pas été poussé.
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
| L5 — Devis et achats récurrents | En cours | Réachat intégré et vérifié. Formulaire de liste, suivi privé, précisions et file boutique raccordés; association du compte client dans les proformas. API de demandes et réponses : 19 tests dédiés; 9 contrôles navigateur simulés pour les demandes. Acceptation en commande, document client et préparation guidée/affectation explicite restent ouverts; migration additive non appliquée. |
| L6 — Commande invitée | En cours | Achat invité et demande de livraison testés sur API simulée; compte facultatif. Reprise après réponse perdue/rechargement corrigée pour l’invité sans mot de passe, même requestId et payload. La confirmation affiche le contact boutique pour l’invité. Suivi privé et rattachement restent ouverts. |
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

## Jalon suivant — réachat et base des demandes de devis

- `Reorder.jsx` prépare les références depuis l’historique sans créer de commande. Les prix proviennent des réponses catalogue; une référence supprimée, un stock nul, un prix absent et une panne réseau restent des états distincts. Les quantités proposées déduisent celles déjà dans le panier. Les doublons historiques sont regroupés par identifiant.
- Avant ajout, une seconde lecture du catalogue vérifie les prix et les quantités choisies. Un changement impose une nouvelle validation. L’ajout groupé au panier est atomique : une ligne invalide ou une quantité dépassée bloque tout le groupe; aucune réduction silencieuse de la sélection acceptée. Le devis de commande reste l’autorité finale du prix et du stock.
- `verify-reorder.cjs` : cinq contrôles navigateur simulés réussis, y compris prix modifié après ouverture, stock concurrent, absence de mutation API et fermeture Échap avec retour du focus. Captures 390/1440 px inspectées. Tests Node storefront : 17/17.
- `verify-guest-recovery.cjs` : réponse perdue puis rechargement; reprise du même payload/requestId sans e-mail ni mot de passe. La condition de mot de passe de reprise dépend maintenant de la présence d’un compte dans la tentative.
- `verify-orders.cjs` : 15 contrôles simulés réussis pour le compte, les conflits de prix, les erreurs, le suivi, l’annulation et la réception. La fixture catalogue fournit désormais le détail actif requis par la revalidation du panier. `verify-storefront.cjs` reste à 24/24; build storefront et lint des fichiers modifiés passent.
- Demandes de devis : nouveau modèle séparé de la proforma interne, propriétaire authentifié, liste bornée, reprise idempotente, file des vendeurs limitée aux demandes affectées ou libres, version optimiste et historique des réponses. Une réponse commerciale est copiée depuis une proforma accessible au vendeur et appartenant au même client. Elle n’inclut ni notes internes ni coûts et ne réserve pas de stock.
- Migration `20260929113000_quote_requests` générée par comparaison hors ligne de deux schémas Prisma; elle crée les nouvelles tables et relations sans modifier les données existantes. Aucune application de migration ni connexion à une base réelle dans ce jalon.
- Backend : build réussi; trois suites ciblées (`devis.service`, `commande-checkout`, `catalogue-quote`), 22/22 tests. La nouvelle API a 13 tests couvrant bornes, confidentialité, idempotence, affectation, version et proforma invalide. La persistance réelle et les courses de transactions seront vérifiées sur une base isolée au lot L8.

## Suite du jalon — parcours des demandes de devis

- Le client importe sa liste sans perdre les suffixes; un candidat exact reste à choisir explicitement. Les références inconnues ne sont pas transformées en équivalents présumés. La réception suit la règle pilote validée : retrait à Akwa; livraison avec destination, frais et délai à confirmer.
- Brouillon conservé pendant la connexion, tentative persistée avant l’envoi et reprise identique après réponse perdue. Une tentative illisible bloque une nouvelle création. Les données associées à un compte ne s’affichent pas dans un autre compte.
- Suivi privé des demandes, réponse de la boutique et formulaire de précision. La précision utilise version et requestId, archive les anciennes/nouvelles lignes, relit les produits actifs et ne réserve pas le stock.
- La file admin/vendeur propose les proformas du même compte, en cours et non expirées. L’envoi est verrouillé pendant la requête et le statut est relu après succès ou erreur. Le choix du compte est désormais possible lors de la création d’une proforma; le nom seul n’établit pas le lien.
- Navigation principale de l’administration conservée à cinq destinations; les devis sont accessibles dans un lien secondaire. La recette a détecté l’ajout initial d’une sixième destination et cette modification a été corrigée.
- Contrôles finaux : build backend, builds storefront/admin, lint storefront et typage admin réussis; 28 tests backend ciblés, 21 tests Node storefront, 28 suites UI admin (69 tests). Le navigateur des demandes passe 9 contrôles sur API simulée; la recette générale reste à 24 contrôles. Les tests du réachat, des commandes et de la reprise invitée passent également.
- Le test de tri attend désormais la réponse API correspondant au tri choisi avant de vérifier sa requête; il n’utilise plus la disparition prématurée d’un squelette comme preuve.
- L5 reste en cours. Aucun endpoint d’acceptation n’existe encore, aucune migration n’a été appliquée et aucun paiement, notification, appel d’IA distant ou déploiement n’a été déclenché. Voir `DEMANDES-DEVIS.md` pour le contrat et le travail restant.
