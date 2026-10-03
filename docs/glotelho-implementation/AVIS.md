# Avis liés aux achats — parcours et modération

3 octobre 2026. Branche locale `codex/newoteg-evolution`. Règle confirmée par l’utilisateur : **un avis par ligne de commande reçue, publication après modération, conservation des avis négatifs conformes**. API, formulaires avec compte/invité, lecture publique et interface de modération sont intégrés localement. Photos et indicateurs restent à réaliser. L’email invité dépend d’un fournisseur absent et reste désactivé.

## Preuve d’achat

`GET /api/avis/commandes/:id` exige le JWT du propriétaire courant et fournit les lignes et leur avis. `POST /api/avis` exige une ligne appartenant à ce même compte, une commande `LIVREE` avec date de réception renseignée, une note entière de 1 à 5, un texte de 10 à 2 000 caractères et un pseudonyme explicite de 2 à 40 caractères. Le nom, téléphone ou email du compte ne sont jamais utilisés automatiquement comme auteur public. Projet réalisé facultatif, au plus 300 caractères. Les espaces seuls et caractères de contrôle sont refusés.

La propriété est relue après verrouillage de la commande, dans la transaction. Une commande en attente, en livraison, annulée, sans date de réception ou appartenant à autrui ne permet pas de contribuer. Une commande invitée n’est pas autorisée par ces routes ; son lien de lecture ne vaut pas consentement de publication. Un avis est conservé par ligne même s’il est refusé. Deux unités sur la même ligne restent une seule contribution ; deux lignes distinctes peuvent recevoir chacune un avis.

Le formulaire conserve le `requestId` et le contenu exact dans le stockage de l’onglet avant envoi. Un stockage refusé empêche l’envoi ; une réponse perdue peut être reprise après rechargement. La même tentative avec le même contenu normalisé et le même compte retrouve le même identifiant, même après modération. La même tentative avec un autre contenu ou une nouvelle tentative sur une ligne déjà évaluée donne 409. Le reçu minimal `{id, enregistre: true}` n’affirme pas que l’avis est publié ; une lecture privée retrouve son état courant. Déconnexion explicite : tentatives du compte effacées, panier conservé.

## Client invité

Le suivi propose les articles reçus et leur état d’avis. `POST /api/avis/guest/purchases` accepte l’accès privé actif et fournit seulement les lignes, l’éligibilité et la disponibilité du code, sans contact. Le lien de lecture seul ne permet pas de créer un avis. Après choix du contenu et consentement explicite, `POST /api/avis/guest/request` envoie un code distinct à l’email enregistré lors de la commande ; aucun destinataire n’est fourni par le formulaire.

Code à huit chiffres, dix minutes, cinq essais maximum. Il est lié au contenu normalisé, à la tentative, à la ligne et aux versions de commande/accès. Budget partagé avec les autres actions invitées : trois codes par heure et soixante secondes entre nouvelles demandes. Une reprise de la même demande retrouve le challenge encore valide sans nouvel email. Une nouvelle demande remplace les codes en attente ; un échec d’envoi consomme le challenge. Aucune clé ou code dans les logs.

`POST /api/avis/guest` exige ce code et une clé de tentative distincte. Réception/date et accès sont relus sous verrou. Avis, consommation et reçu minimal sont enregistrés ensemble. Après une réponse perdue, la même preuve peut retrouver ce reçu sans nouveau code pendant trente jours, même si l’accès a été révoqué ; elle ne rétablit aucun droit ni donnée de commande. Un code expiré, non livré, d’un autre usage ou avec contenu/version modifiés ne crée rien. Le navigateur conserve la tentative avant demande de code, jamais le code lui-même. L’effacement explicite de l’accès retire aussi ses tentatives d’avis.

Sans fournisseur email configuré ou sans email enregistré, le formulaire explique l’indisponibilité et n’autorise pas l’envoi. La recette capture les emails fictifs dans sa mémoire ; aucun SMS ou email réel n’est envoyé.

## Publication et modération

`GET /api/avis/produits/:id` lit seulement les avis `PUBLIE` d’achats reçus, pour un produit actif. Projection explicite : pseudonyme choisi, note, texte, projet, date, réponse boutique et `achatVerifie`. Aucun identifiant de commande/ligne, contact, fingerprint, acteur, motif privé ou reçu n’est public. Moyenne `null` et liste vide sans contribution publiée ; aucune mauvaise note fictive ni avis inventé. Pagination bornée à 30 avis par page, ordre date puis identifiant ; total, moyenne et page dans le même instantané PostgreSQL.

`GET /api/avis/admin` et `POST /api/avis/admin/:id/moderation` réservés aux ADMIN/SUPER_ADMIN, avec rôle et session relus en base. État filtré, pages de 30 lignes, au plus 20 décisions récentes et 30 signalements récents par avis ; pas de contacts de commande ou de reporters. Actions : publier, refuser pour un motif de contenu, répondre à un avis publié. Motifs autorisés : données personnelles, injures/menaces, spam, hors sujet. « Note négative » n’existe pas comme motif et est refusée. Une note de 1/5 conforme est publiable normalement. Le serveur ne peut pas juger à la place de l’équipe si le motif choisi correspond réellement au texte ; le guide et la recette humaine restent nécessaires.

Version observée et `requestId` requis. Transaction verrouillée : avis et historique avec acteur/date/motif/résultat enregistrés ensemble. Version ancienne refusée ; réponse perdue rejouable sans nouvelle décision. Deux modérateurs concurrents ne peuvent écraser le même état observé. Réutiliser une tentative sur deux avis annule la décision perdante. Aucun endpoint de suppression physique ; liens `RESTRICT` empêchent la disparition silencieuse de la preuve et de l’historique.

`POST /api/avis/:id/signalement` exige un compte et un motif de contenu. Un signalement par compte/avis, doublon idempotent, aucun retrait automatique : une vague de signalements ne suffit pas à cacher un avis négatif. La fiche produit propose ce formulaire, avec connexion demandée si nécessaire, et distingue absence d’avis, panne et nouvelle tentative. Moyenne affichée seulement avec des avis publiés.

Administration → Boutique → Avis clients (`/avis`) : liste par état, contenu, note, réponse, signalements et historique. La décision exige une relecture et une confirmation explicite. La tentative avec version observée est conservée avant envoi, puis rejouée telle quelle après une coupure. Changer d’administrateur remonte un état séparé. Après 409, relire l’état avant une nouvelle décision ; après résultat incertain, reprendre la même demande.

### Procédure de l’équipe

1. Lire l’avis et son contexte de projet ; la note ne détermine pas la publication.
2. Publier les retours conformes, même à 1/5. Ne refuser que pour données personnelles, injures/menaces, spam ou hors sujet, avec le motif correspondant au contenu.
3. Répondre publiquement pour aider, sans coordonnées personnelles ou informations de commande. Les réponses sont visibles seulement avec l’avis publié.
4. Examiner les signalements ; ils n’entraînent aucun retrait automatique. Une réponse réseau perdue ne justifie pas une nouvelle décision : utiliser « Vérifier ou reprendre la décision ».

## Validation locale

Migrations additives `20261003130000_verified_reviews` (tables, contraintes et liens) et `20261003140000_guest_reviews` (liaison du challenge à la ligne/contenu), comparées hors ligne avec Prisma. Appliquées seulement à `127.0.0.1:55439/newoteg_quote_acceptance_test`. Aucune migration Railway ni réconciliation de divergence historique.

Builds backend/storefront/administration, typage admin et lints ciblés réussis ; sept suites backend (45 tests) et 58 tests Node storefront. `Back-end/scripts/verify-reviews-local.cjs` refuse toute autre base avant connexion et passe **14 groupes PostgreSQL/HTTP**, avec vrais JWT/guards/DTO Nest : réception, propriété, reprise/concurrence, droits, projection, publication négative, signalements, rollback, consentement invité, expiration/versions, cinq échecs, budget partagé et envoi indisponible. Les commandes/lignes fictives sont créées directement dans la base dédiée pour isoler le contrat des avis ; cette recette ne prouve pas une réception physique ou un paiement réel. Fixtures de chaque exécution nettoyées, aucun email, stock ou appel extérieur. Preuve : `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/reviews-server/result.json`.

Avec `NEWOTEG_REVIEWS_TEST_BROWSER=true`, quatre groupes navigateur supplémentaires vérifient formulaires FR/EN, stockage/rechargement, réponses perdues après création et modération, reprise de demande sans second email, affichage public négatif, signalement, vide/panne/réessai et six largeurs (360 à 1440 px). Les coques catalogue/compte/suivi/authentification admin sont simulées ; toutes les routes d’avis utilisent le serveur Nest/JWT/PostgreSQL réel de recette. Edge indépendant après l’échec connu du navigateur intégré ; pas de téléphone physique testé. Captures : `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/reviews-ui`.

Backend local relancé sur le build vérifié : API publique 200 avec moyenne vide, administration non authentifiée 401, storefront 5187 disponible. Nettoyage programmé et messages explicitement désactivés.

Suite L7 : photos facultatives avec vérification des fichiers et retrait des métadonnées, mesures sans données personnelles. Puis recette transversale L8 et pilote humain, dont relecture de la modération et activation d’un fournisseur email. Aucun envoi d’invitations, publication publique du site ou validation de l’objectif A–Z n’est déduit de ce lot.
