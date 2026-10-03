# Avis liés aux achats — fondation serveur

3 octobre 2026. Branche locale `codex/newoteg-evolution`. Règle confirmée par l’utilisateur : **un avis par ligne de commande reçue, publication après modération, conservation des avis négatifs conformes**. Cette livraison prépare les API pour les clients avec compte et la modération ; les interfaces, invités, photos et indicateurs ne sont pas encore intégrés.

## Preuve d’achat

`GET /api/avis/commandes/:id` exige le JWT du propriétaire courant et fournit les lignes et leur avis. `POST /api/avis` exige une ligne appartenant à ce même compte, une commande `LIVREE` avec date de réception renseignée, une note entière de 1 à 5, un texte de 10 à 2 000 caractères et un pseudonyme explicite de 2 à 40 caractères. Le nom, téléphone ou email du compte ne sont jamais utilisés automatiquement comme auteur public. Projet réalisé facultatif, au plus 300 caractères. Les espaces seuls et caractères de contrôle sont refusés.

La propriété est relue après verrouillage de la commande, dans la transaction. Une commande en attente, en livraison, annulée, sans date de réception ou appartenant à autrui ne permet pas de contribuer. Une commande invitée n’est pas autorisée par ces routes ; son lien de lecture ne vaut pas consentement de publication. Un avis est conservé par ligne même s’il est refusé. Deux unités sur la même ligne restent une seule contribution ; deux lignes distinctes peuvent recevoir chacune un avis.

Le client fournira un `requestId` durable avant envoi. La même tentative avec le même contenu normalisé et le même compte retrouve le même identifiant, même après modération. La même tentative avec un autre contenu ou une nouvelle tentative sur une ligne déjà évaluée donne 409. Le reçu minimal `{id, enregistre: true}` n’affirme pas que l’avis est publié ; une lecture privée retrouve son état courant. Le formulaire et cette conservation côté navigateur restent à livrer.

## Publication et modération

`GET /api/avis/produits/:id` lit seulement les avis `PUBLIE` d’achats reçus, pour un produit actif. Projection explicite : pseudonyme choisi, note, texte, projet, date, réponse boutique et `achatVerifie`. Aucun identifiant de commande/ligne, contact, fingerprint, acteur, motif privé ou reçu n’est public. Moyenne `null` et liste vide sans contribution publiée ; aucune mauvaise note fictive ni avis inventé. Pagination bornée à 30 avis par page, ordre date puis identifiant ; total, moyenne et page dans le même instantané PostgreSQL.

`GET /api/avis/admin` et `POST /api/avis/admin/:id/moderation` réservés aux ADMIN/SUPER_ADMIN, avec rôle et session relus en base. État filtré, pages de 30 lignes, au plus 20 décisions récentes et 30 signalements récents par avis ; pas de contacts de commande ou de reporters. Actions : publier, refuser pour un motif de contenu, répondre à un avis publié. Motifs autorisés : données personnelles, injures/menaces, spam, hors sujet. « Note négative » n’existe pas comme motif et est refusée. Une note de 1/5 conforme est publiable normalement. Le serveur ne peut pas juger à la place de l’équipe si le motif choisi correspond réellement au texte ; le guide et la recette humaine restent nécessaires.

Version observée et `requestId` requis. Transaction verrouillée : avis et historique avec acteur/date/motif/résultat enregistrés ensemble. Version ancienne refusée ; réponse perdue rejouable sans nouvelle décision. Deux modérateurs concurrents ne peuvent écraser le même état observé. Réutiliser une tentative sur deux avis annule la décision perdante. Aucun endpoint de suppression physique ; liens `RESTRICT` empêchent la disparition silencieuse de la preuve et de l’historique.

`POST /api/avis/:id/signalement` exige un compte et un motif de contenu. Un signalement par compte/avis, doublon idempotent, aucun retrait automatique : une vague de signalements ne suffit pas à cacher un avis négatif. Interface de signalement et parcours invité à compléter.

## Validation locale

Migration additive `20261003130000_verified_reviews` générée hors ligne avec Prisma : tables avis, historique et signalements, contraintes d’unicité et liens. Appliquée seulement à `127.0.0.1:55439/newoteg_quote_acceptance_test`. Aucune migration Railway ni réconciliation de divergence historique.

Build et lint ciblé réussis ; sept suites backend (45 tests) dont avis, entretien, actions invitées, rattachement, accès, administration et transitions. `Back-end/scripts/verify-reviews-local.cjs` refuse toute autre base avant connexion et passe **11 scénarios PostgreSQL/HTTP**, avec vrais JWT/guards/DTO Nest : preuve de réception, accès à autrui, reprise concurrente, moyenne vide, publication négative, projection publique, droits administratifs, version, réponse boutique, signalements, rollback, changements de propriétaire et collisions de tentative. Les commandes/lignes fictives sont créées directement dans la base dédiée pour isoler le contrat des avis ; cette recette ne prouve pas une réception physique ou un paiement réel. Fixtures entièrement nettoyées, aucun email, stock ou appel extérieur. Preuve : `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/reviews-server/result.json`.

Backend local relancé sur le build vérifié : API publique 200 avec moyenne vide, administration non authentifiée 401, storefront 5187 disponible. Nettoyage programmé et messages explicitement désactivés.

Suite L7 : parcours des invités avec preuve distincte, interfaces client/modération, photos facultatives avec vérification des fichiers et retrait des métadonnées, mesures sans données personnelles. Puis recette transversale L8 et pilote humain. Aucun envoi d’invitations, publication publique du site ou validation de l’objectif A–Z n’est déduit de ce lot.
