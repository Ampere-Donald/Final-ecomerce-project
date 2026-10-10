# Coût du transport catalogue sur Workers Free — 10 octobre 2026

## Avancée et portée

Le rendu React du catalogue a été déplacé dans un paquet Node prévu pour Railway. Ce test mesure les **fonctions de transport HTML et de métadonnées sur le runtime réel Cloudflare**, avec un fragment public fixe à la place de la réponse Railway. Il ne prouve ni la latence du renderer hébergé, ni le LCP public, ni l'intégration complète. Le nouveau rendu catalogue reste désactivé en production ; L8 et le plan A–Z restent ouverts.

La préparation a également corrigé le build Docker : `VITE_API_URL` peut être donné comme argument public, au lieu d'imposer `/api` alors que Cloudflare utilise actuellement `https://api.newoteg.com`. [PR #6 fusionnée](https://github.com/Ampere-Donald/Final-ecomerce-project/pull/6), main `6bbd1ae12a26b2eb0b4ed9b88bb2f0ac24de3b78`. Le vrai frontend, le paquet indépendant et l'image Docker passent dans les **deux configurations**, avec identités concordantes. [CI de la matrice sur main](https://github.com/Ampere-Donald/Final-ecomerce-project/actions/runs/38067186666) et [CI complète](https://github.com/Ampere-Donald/Final-ecomerce-project/actions/runs/38067186690) réussies. Aucun drapeau d'activation ni configuration de production changé par cette correction.

## Protocole

Worker séparé `newoteg-transport-lab-20261010`, sans domaine de production. Les fonctions compilées sont les sources existantes `catalogueBackendFragment`, `injectBackendCatalogue`, `renderFallbackMetadata` et `staticPublicMetadata`. Le fragment représentatif de 102 028 octets provient de 24 articles et catégories lus par GET public puis du vrai paquet React compilé. La variante de 524 287 octets ajoute uniquement un commentaire non exécuté pour atteindre la limite de réception de 512 Kio. Ce remplissage ne représente pas un catalogue réel de cette taille.

Le fetcher de laboratoire reçoit la requête publique préparée par le transport et lit son fragment dans un asset interne ; il ne contacte pas le backend Railway. Aucun Cookie ou Authorization entrant n'est transmis. Les routes d'assets, API ou compte restent refusées. La réponse de mesure de livraison exige un en-tête de diagnostic et reste du texte brut, avec avertissement de données figées, `no-store` et `noindex, nofollow` : aucun script, parcours d'achat ou commande n'est exécuté.

Deux étapes distinguent le transport de son instrumentation :

1. Le diagnostic qui relisait la Response complète puis encodait à nouveau les octets donnait 2–7 ms pour le fragment représentatif, et 9–16 ms près de la limite. Cette copie supplémentaire n'existe pas dans le Worker de production. Elle n'est donc pas retenue comme preuve de dépassement du transport.
2. La réponse finale est construite directement depuis le HTML, comme dans le Worker réel, sans relecture ni réencodage de diagnostic dans le Worker. Dix GET alternent les deux tailles ; le client externe lit la réponse et vérifie son contenu. Les temps CPU proviennent des traces Cloudflare de la version exacte `7ee9e5b4-ade6-41b1-b8d5-c8e7ecce5b14`, pas d'un chronomètre local.

## Résultat

| Fragment | Échantillons | CPU min. | Médiane | Max. |
| --- | ---: | ---: | ---: | ---: |
| Catalogue représentatif, 102 028 octets | 5 | 2 ms | 2 ms | 5 ms |
| Limite simulée, 524 287 octets | 5 | 5 ms | 6 ms | 8 ms |

Les dix réponses sont 200, outcome `ok`, avec contenu initial et styles ajoutés. Les dix échantillons de livraison restent sous le plafond Free de 10 ms. Le repli sur réponse 503 et le refus des routes privées/écritures ont aussi été exercés dans le diagnostic précédent. **Petit échantillon de traitement avec fixtures, pas une garantie de charge, de percentiles visiteurs ou de CPU de l'intégration hébergée complète.**

Après capture, Worker temporaire supprimé ; lecture de contrôle 404/code 10007 à 16:41 UTC. Les deux processus locaux de développement/capture sont arrêtés. Les données et traces brutes ne sont pas versionnées. `result.json` contient seulement version, chemins de diagnostic, statuts et temps ; `cleanup.json` confirme la suppression.

## Production et suite

Les déploiements automatiques du commit main réussissent. Au contrôle public de 16:41 UTC : boutique et catalogue 200, administration 200, API/base/stockage OK ; renderer catalogue 503 car désactivé, aucun marqueur de catalogue initial. Les bundles modernes/legacy et styles publics restent identiques par SHA-256 au build vérifié de la livraison précédente (les sources frontend/admin sont inchangées dans ce commit). Workers actifs : client `d5b74d04-69a3-4452-a776-82d46867d67d`, admin `92d572af-1b92-4b13-bb79-b026ffb13f0f`. Statut Railway du commit : success, déploiement `6c9f0f23-2df2-485f-9859-cd596a175e5e`.

Reste à connecter la gestion Railway, préparer l'image et l'environnement isolés avec la même configuration publique que le frontend, vérifier prix/stock/hydratation et délai réel de 2 s, puis mesurer la combinaison hébergée avant activation. La publication automatique actuelle du backend ne fournit pas cet accès de gestion. La question de connexion officielle reste en attente. Les fournisseurs email/SMS, pilote métier/technique, téléphone physique et observation réelle restent également à traiter.

Preuves locales : `C:/Users/pc/Documents/Newoteg/output/implementation-work/catalogue-transport-20261010/`. Ce compte rendu ne clôture aucun gate métier ni le budget LCP public.
