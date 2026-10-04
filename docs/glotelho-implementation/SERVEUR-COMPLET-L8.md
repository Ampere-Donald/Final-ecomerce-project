# L8 — Démarrage et protections du serveur complet

Le 4 octobre 2026, huit contrôles passent sur le **vrai `dist/src/main.js`**, qui démarre `AppModule` avec tous ses modules, middleware de corrélation, Helmet, parsing, filtres, audit et garde global de limitation. Il s'agit d'un processus local construit depuis les sources, pas d'une image Docker ni de la cible Railway.

## Défaut constaté et correction

Le premier passage reproduit le défaut : les vingt premières lectures privées répondent 400/401 avec leurs en-têtes privés, mais la vingt-et-unième, rejetée par `ThrottlerGuard` (429), ne porte plus `Cache-Control`. Les décorateurs des contrôleurs n'interviennent pas lorsque le garde refuse la requête.

`guestPrivateHeadersMiddleware` applique `private, no-store`, `no-referrer` et `noindex, nofollow` sur les routes invitées commandes, avis et incompatibilités **avant** le parsing et les guards. La corrélation est également installée avant le parsing. Le passage corrigé protège les erreurs 400 de DTO/JSON, 401 d'accès, 429 de débit et 404 de route privée inconnue. Le catalogue public ne reçoit pas le noindex privé. Aucun changement du budget, de l'authentification ou des règles commerciales.

`LISTEN_HOST` permet de limiter explicitement le processus à `127.0.0.1` pour la recette/preview. Le défaut historique reste `0.0.0.0` pour les hébergements existants ; le paramètre doit être relu lors de la configuration de la cible.

## Huit contrôles réels

1. Démarrage de main/AppModule, connexion à la base propre et santé API/base/stockage à 200.
2. Preflight autorisé pour l'origine locale configurée ; origine inconnue sans permission CORS navigateur ; Helmet et canaux email/SMS désactivés.
3. Connexion boutique réelle d'un ADMIN fictif, lecture de son identité, refus anonyme et du rôle insuffisant, rejet du JWT après incrément réel de version de session. Lecture caisse du jour sans encaissement ; sixième essai de connexion bloqué.
4. Erreur de validation d'accès invité protégée, avec le même requestId dans l'en-tête et le corps.
5. Vingt tentatives d'accès au total, puis vraie réponse 429 du garde global avec Retry-After et en-têtes privés.
6. Cinq demandes de récupération sur leur budget distinct, sixième bloquée. Transport indisponible et aucun challenge créé.
7. JSON invalide, DTO d'incompatibilité et route privée inconnue protégés ; catalogue public accessible sans noindex privé.
8. Dossier de stockage rendu temporairement indisponible : santé 503, puis retour à 200 après restauration.

Build Nest et lint du middleware passent. Base supprimée après fermeture du processus et des connexions ; contrôle indépendant : zéro base `newoteg_runtime_…` restante. Aucune donnée réelle, commande, paiement, Railway ou publication.

## Reproduire

Depuis `Back-end`, avec le cluster dédié déjà démarré :

```powershell
node node_modules/@nestjs/cli/bin/nest.js build
$env:NEWOTEG_RUNTIME_TEST_DATABASE_URL='postgresql://quote_test@127.0.0.1:55439/postgres'
$env:NEWOTEG_RUNTIME_TEST_OUTPUT='C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/full-runtime'
node scripts/verify-full-runtime-local.cjs
```

Le script refuse une autre cible, crée une base avec UUID propre et utilise le modèle source/les CHECK du contrat. Aucun historique de migration fabriqué. Le processus enfant reçoit une allowlist d'environnement, un secret JWT aléatoire en mémoire, aucun identifiant SMTP/Google/Gemini/Cloudinary et un répertoire de travail sans `.env`. Un preload refuse les connexions TCP à un hôte non local. Port éphémère et écoute loopback ; seules sa base et son dossier uploads sont modifiés. Le rapport contient méthodes/routes/statuts, jamais mot de passe, JWT ou corps de requête. Les journaux du processus restent en mémoire et ne sont pas exportés.

Preuve : `output/implementation-work/captures/full-runtime/result.json`. Cette recette est distincte des vingt groupes commerciaux de `RECETTE-TRANSVERSALE-L8.md` ; ces groupes ne sont pas annoncés comme rejoués dans main.

## Portée restante

Les modules de planification sont chargés comme dans le serveur complet ; la collecte et l'entretien des codes sont désactivés. Les échéances de jobs et leur exploitation ne sont pas testées par cette recette. La limitation est vérifiée pour un processus et une IP locale ; elle ne prouve pas l'identification des clients derrière le proxy Railway, ni une limite commune à plusieurs instances ou conservée au redémarrage. CORS n'est pas une preuve d'authentification, et le refus d'une origine navigateur ne bloque pas un client HTTP indépendant.

HTTPS, origines réelles, proxy/IP, secrets, image de livraison, démarrage préproduction avec historique réel et restauration de la cible restent à vérifier. Docker n'était pas disponible par les chemins contrôlés dans cet environnement ; aucune image actualisée n'a été construite. Performances/indexation du storefront, réseau lent et pilote téléphone/équipe restent ouverts. Les fournisseurs email/SMS sont toujours absents. L8 reste en cours et L9 exige l'accord de publication distinct.

La preview locale a été reconnectée au main courant sur `127.0.0.1:3000` et au storefront `127.0.0.1:5187`, sur la seule base de démonstration `newoteg_quote_acceptance_test`. Sa structure a été comparée en lecture seule au contrat courant sans différence ; cela ne valide pas son historique de migrations. API et santé via proxy répondent 200. Aucun fournisseur chargé, migrations automatiques désactivées, entretien et mesure désactivés ; cette preview n'est pas une préproduction publiable.
