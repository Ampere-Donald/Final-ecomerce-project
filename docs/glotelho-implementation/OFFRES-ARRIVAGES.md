# Offres et arrivages — contrat et recette locale

État du 3 octobre 2026. Lot L4, branche `codex/newoteg-evolution`. Direction E conservée. Ces preuves concernent des données fictives dans PostgreSQL local, pas des offres publiées ni Railway.

## Comportement livré

- `/offres` présente les promotions actives, datées et disponibles ; `/arrivages` les produits reçus lors d'un achat validé dans les 30 derniers jours, encore disponibles à la vente. Les sections d'accueil sont absentes lorsqu'aucune sélection valable n'est disponible.
- Le serveur calcule `prixPublic` et `offre`. Une promotion exige un prix positif inférieur au prix détail, une fin valide encore future et un produit actif. Une offre expirée revient au prix détail ; un prix absent ne devient pas zéro. Le prix catalogue courant n'est pas présenté comme un ancien prix de vente vérifié, et aucun pourcentage ou prix barré historique n'est inventé.
- Fiche, panier, projets et devis de commande utilisent le prix public. La création relit ce prix ; un changement ou une expiration exige une nouvelle acceptation. Les conditions précisent le prix unitaire et l'absence de cumul automatique avec un devis ou un tarif de quantité. Livraison : frais et délai à confirmer.
- Les arrivages s'appuient sur la date de validation de l'achat. Création de fiche, import seul, achat en brouillon et ancienne réception ne suffisent pas. Sélection bornée : 100 candidats, au maximum 20 produits ; l'interface annonce une sélection, pas un inventaire exhaustif.
- Les réservations caisse actives sont déduites de la disponibilité publique. Les coûts d'achat, fournisseurs et informations de gestion des réservations ne sont pas publiés.
- L'administration conserve exactement la fin existante si le champ n'est pas modifié ; une nouvelle date locale est convertie en instant ISO. La suppression est explicite. Les droits de prix existants restent réservés au SUPER_ADMIN pour les acteurs humains.

## Corrections révélées par la recette réelle

La concurrence entre réservation caisse et commande web pouvait consommer les mêmes unités : une transaction caisse sérialisable pouvait conserver un instantané pris avant son attente de verrou. Les commandes utilisent désormais les verrous de stock partagés et verrouillent les lignes produit ; la réservation caisse revendique leur version sans décrémenter le stock. Un conflit impose une nouvelle vérification, sans ticket ni commande partiels. Une édition simultanée du prix attend la fin de la commande.

Les réponses de commande contenaient aussi les produits Prisma complets. Une projection explicite des routes client conserve les prix historiques, références et images, et supprime les coûts, fournisseurs, stock courant et relations internes. Les routes administratives conservent leur contrat.

La recette visuelle a corrigé l'état vide, la hauteur de carte avec date et la largeur d'une carte unique : quatre colonnes sur ordinateur, trois aux largeurs intermédiaires, deux sur mobile.

## Preuves

- Backend : build réussi ; 11 suites ciblées, 145 tests. Après correction de style des deux nouveaux fichiers de tests, leurs quatre tests et le lint ciblé passent à nouveau. Cela ne constitue pas un lint de tout le backend.
- `Back-end/scripts/verify-commercial-local.cjs` : dix scénarios sur les vrais services et PostgreSQL dédié. Réception d'achat, prix promotionnel, expiration et rollback, rejeu et concurrence de commande, réservation caisse et disponibilité, édition concurrente de prix et confidentialité. Le script refuse toute autre base avant de charger Prisma et n'utilise aucun `.env` ni service extérieur. Un avertissement du pilote PostgreSQL sur les requêtes concurrentes reste présent, sans échec de recette.
- Storefront : build et lint réussis, 47 tests Node, huit contrôles navigateur avec API simulée, puis cinq avec API locale réelle, et 24 contrôles de régression générale. Six largeurs vérifiées dans la recette simulée ; 390 et 1440 px sur API réelle. Captures mobile/desktop inspectées. L'appel POST au devis lit le récapitulatif ; le navigateur ne soumet aucune commande.
- Administration : typage, build et deux tests du champ de fin de promotion sous `TZ=Africa/Douala` réussis. Le build conserve ses avertissements existants de taille de bundle.
- Résultats et captures : `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/commercial/`, notamment `backend-result.json`, `live-result.json` et `live-offers-390.png`. Régression générale dans `captures/commercial-regression/`.

Le script peut garder une seule offre fictive pour la prévisualisation après succès. Les autres produits et le compte de recette sont désactivés ; les tickets sont annulés. Cette démonstration est limitée à `127.0.0.1:55439/newoteg_quote_acceptance_test` et porte un nom/code de démonstration. Les prix et stocks ne représentent pas des décisions commerciales NEWOTEG.

## Points ouverts

Le défaut de tri, filtres et bornes du catalogue fondés sur le prix détail a été corrigé et vérifié le 3 octobre : prix public, disponibilité vendable, comptage et pagination cohérents. Contrat et preuves : `CATALOGUE-PRIX.md`.

Le projet pilote réel, la qualité des fiches, les offres commerciales relues par NEWOTEG et la recette transversale restent ouverts. Aucun accès Railway, migration distante, paiement, message ou déploiement n'a été réalisé. L4 et l'objectif A–Z restent actifs ; L9 exige une autorisation distincte.
