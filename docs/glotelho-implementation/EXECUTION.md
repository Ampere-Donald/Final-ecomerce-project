# Suivi d’exécution — NEWOTEG / X-Electronic

Dernière mise à jour : 1er octobre 2026. Exécution des lots L0–L8 autorisée par l’utilisateur; L9 reste soumis à une autorisation distincte.

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
| L2 — Fiche et réception | En cours | Choix facultatif de réception dans le header, fiche et panier, conservé vers le checkout ; conseil WhatsApp contextualisé et éditable sur fiche. Frais et délai à confirmer. Grille réelle, coordonnées publiques et enrichissement technique restent à valider. |
| L3 — Recherche et équivalences | En cours | Comparateur de 2–3 références d’une même famille intégré et vérifié sur API simulée et backend local réel. Pistes IA toujours non validées techniquement, aucun ajout automatique. Références étalons, technicien NEWOTEG et budget d’essai distant restent attendus. |
| L4 — Projets et sélections | À faire | Sélections existantes à auditer; projet pilote et images marketing à faire valider. |
| L5 — Devis et achats récurrents | En cours | Réachat, demande, réponse, acceptation en commande, proposition client imprimable et affectation explicite intégrés. Concurrence et rollback de l’acceptation vérifiés sur PostgreSQL local isolé. Préparation depuis les références choisies et reprise durable intégrées ; migrations non appliquées à Railway. |
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
- L5 reste en cours. L’endpoint d’acceptation existe dans la branche isolée ; la migration a été appliquée uniquement à la base de recette locale. Une notification interne est inscrite avec la commande ; aucun paiement, notification externe, appel d’IA distant ni déploiement n’a été déclenché. Voir `DEMANDES-DEVIS.md` pour le contrat et le travail restant.

## Acceptation du devis — recette locale du 30 septembre 2026

- Client : confirmation explicite de la version et de la réception, reprise de la même tentative après coupure, relecture obligatoire après refus ou changement. Retrait Akwa ; frais et délai de livraison à confirmer.
- Serveur : prix négociés autorisés selon le rôle et motif de remise ; instantané matériel comparé à la proforma ; stock disponible tenant compte des tickets caisse ; création atomique d’une seule commande en attente et des sorties de stock. Aucun encaissement.
- Preuves : build backend, 88 tests ciblés, 26 tests Node storefront, builds storefront/admin, typage admin et trois tests UI ciblés ; recettes navigateur avec API simulée et PostgreSQL local réel pour les courses de commande, caisse, édition proforma et stock.
- Base de test : `127.0.0.1:55439/newoteg_quote_acceptance_test`, indépendante de Railway. Les migrations restent non appliquées à la base distante et aucune ouverture publique n’est autorisée à ce stade.

## Proposition client imprimable — 30 septembre 2026

- La demande privée donne accès à une proposition commerciale imprimable depuis `/mes-devis/:id/imprimer`. La page relit l’offre pour le compte authentifié et ne rend le document que si l’instantané est complet et cohérent.
- Le document ne contient que les lignes et prix communiqués au client, la validité et la réception. Pour la livraison, les frais et le délai restent « à confirmer ». Une offre expirée ou déjà acceptée porte un état visible ; l’impression ne déclenche ni commande ni paiement. Le document précise qu’il ne vaut ni facture ni preuve de paiement.
- Recette locale : build et ESLint storefront réussis ; navigateur avec toutes les API simulées, client autorisé, offre expirée, refus 404 pour un autre client, absence de mutation, rendu mobile/desktop et PDF A4 sur une page. Aucun accès Railway.

## Affectation des demandes — 30 septembre 2026

- Un vendeur prend explicitement une demande libre avant de répondre. Un administrateur peut l’attribuer, la réattribuer ou la libérer vers un compte de traitement actif. Chaque opération exige la version courante, modifie la demande dans une transaction et ajoute un événement d’historique ; une demande acceptée ou clôturée ne peut plus changer de responsable.
- La réponse ne désigne plus implicitement son auteur comme responsable. La file vendeur reste limitée aux demandes libres ou qui lui sont attribuées ; la liste des comptes de traitement n’est accessible qu’aux administrateurs.
- La modification du responsable incrémente la version avant publication d’une offre. Une offre déjà envoyée conserve sa version commerciale autorisée ; l’affectation reste atomique sur le responsable et l’état de la demande. Une réponse réseau incertaine entraîne une relecture de la file avant une nouvelle action.
- Contrôles : 25 tests backend devis et cinq tests UI administration réussis ; build backend, typage et build administration réussis. Recette PostgreSQL locale : réaffectation d’une offre envoyée puis acceptation client, ainsi que les courses de stock, proforma et caisse, réussies. Aucun accès Railway.

## Préparation et reprise de proforma — 30 septembre 2026

- POST `/devis/admin/:id/preparation` exige la version courante et le responsable connecté. Une demande reçue ou à préciser peut préparer une proforma depuis les références déjà choisies, les quantités demandées et les prix détail actifs lus sur le serveur. Références inconnues, répétées, inactives ou prix absent bloquent la préparation.
- Le compte client est issu de la demande. La proforma et son reçu d’historique sont créés dans une transaction sérialisable avec verrou de demande ; une reprise de la même version retrouve la même proforma. Une préparation supprimée, expirée ou appartenant à un autre responsable bloque la recréation silencieuse.
- Le bouton administration prépare ou reprend, puis sélectionne la proforma retrouvée ; une réponse perdue relit la file et permet de reprendre. La boutique vérifie toujours la proforma avant publication. Aucun envoi client, réservation de stock ou paiement à ce stade.
- Preuves : 55 tests backend ciblés, six tests UI de la file, typage et builds backend/administration réussis. Recette PostgreSQL locale réelle : concurrence, reprise avec un seul devis et un seul reçu, absence de stock réservé, suppression puis rejeu bloqué. Aucun accès Railway ni migration supplémentaire.

## Réception facultative et conseil sur une pièce — 1er octobre 2026

- Le header E conserve son logo, sa recherche et sa navigation ; sa destination ouvre un choix facultatif de retrait à Akwa ou demande de livraison. La ville est mémorisée sur l’appareil, sans adresse ni téléphone. Une ville n’implique ni couverture, ni tarif validé : frais et délai restent à confirmer. Stockage corrompu : retour au retrait ; stockage refusé : message indiquant que le choix vaut pour cette visite.
- Fiche et panier affichent la préférence, les modalités et l’accès à la modification. Le checkout reprend cette préférence. Un changement explicite depuis le header préserve les coordonnées saisies, annule le récapitulatif accepté et exige une nouvelle vérification. Une réponse de devis retardée ne peut pas rouvrir un récapitulatif après changement de réception. La reprise d’une commande déjà tentée conserve son payload enregistré.
- « Conseil sur cette pièce » ouvre un message modifiable avec nom, référence exacte, quantité choisie et URL de la fiche sans paramètres de suivi. Le lien vers le numéro WhatsApp déjà utilisé dans Contact ne s’ouvre que par une action du client ; celui-ci envoie le message lui-même. Aucune commande ou communication externe déclenchée par la recette.
- Contrôles : 31 tests Node storefront, lint et build Vite ; recette navigateur locale avec API entièrement interceptée, FR/EN, quantité et suffixe, message vide/caractères spéciaux, focus après Échap, conservation fiche/panier/checkout, changement après consentement et pendant réponse retardée, refus et corruption de stockage ; six largeurs 360/390/768/1100/1240/1440 px sans débordement horizontal. Captures inspectées. Régression générale : 24 contrôles réussis. Le navigateur intégré a échoué à se connecter ; la recette utilise Edge headless local, pas un téléphone physique.
- Le pilote n’offre pas encore de calcul de tarifs par poids/zone. La validation des horaires et coordonnées, l’enrichissement des fiches et le comparateur restent ouverts dans L1/L2/L3. L4, L6–L8 restent à poursuivre ; aucune publication ni migration Railway.

## Comparateur de composants — 1er octobre 2026

- `/comparer` compare deux ou trois références de la même catégorie. Les cartes catalogue et fiches offrent « Comparer » ; un lien indique le nombre sélectionné. Le header E et la confirmation restent préservés. La sélection stocke seulement des identifiants et la famille ; prix, stock et caractéristiques sont relus via le catalogue public avant le tableau et lors de l’actualisation.
- Famille inconnue, mélange de familles et quatrième référence donnent une explication sans remplacement silencieux. Une référence supprimée/inactive, une réponse de mauvaise identité, une famille modifiée ou des attributs illisibles bloquent le tableau jusqu’à correction. Une panne réseau reste distincte d’un article disparu. Une réponse retardée ne restaure pas une sélection vidée.
- Références avec suffixes, libellés et unités sources sont conservés. Les différences techniques ne sont établies que lorsque chaque article possède une valeur ; les données absentes sont explicites et ne démontrent ni égalité ni différence. Le filtre garde un avertissement sur les champs incomplets. Prix et disponibilité sont affichés séparément ; aucun score de compatibilité, mutation API, commande ou ajout panier automatique.
- Tableau de la direction E : critères visibles pendant le défilement horizontal, différences sur fond menthe, données manquantes en ambre ; FR/EN et clavier. Le même groupe catalogue n’est pas une preuve de remplacement compatible.
- Preuves locales : lint et build Vite réussis ; 35 tests Node storefront ; 12 contrôles navigateur dédiés sur toutes les API simulées, six largeurs (360/390/768/1100/1240/1440 px), corruption/refus du stockage, synchronisation entre onglets, erreurs/relance et réponse retardée ; 24 contrôles de régression générale. Une recette supplémentaire sans interception API passe avec le backend Nest et PostgreSQL local à 390/1440 px, sans mutation API ; captures inspectées. Le script Google existant est bloqué dans ces recettes, aucun trafic externe n’est autorisé.
- `seed-comparison-preview.cjs` initialise trois câbles fictifs dans une catégorie réservée à la démonstration. Le script refuse toute base autre que `127.0.0.1:55439/newoteg_quote_acceptance_test`, préserve les produits existants et ne charge aucun fichier d’environnement. La recette n’établit pas la qualité technique du catalogue réel ni le fonctionnement de Railway.
- Frontend et backend locaux relancés après constat de leur arrêt. Prévisualisation : `http://127.0.0.1:5187/catalogue?category=19f0fdc7-80b6-49df-98c2-b161c18557d0`. Prochain lot : listes de matériel par projet et gestion éditoriale ; enrichissement technique réel et validation des équivalences restent ouverts. Le plan A–Z n’est pas achevé ; aucune publication publique.
