# Chargement initial — contrôle du 10 octobre 2026

## Décision

Le préchargement conditionnel des modules de l'accueil et du catalogue a été essayé, mesuré, puis retiré. Il ne justifie pas une livraison : découvrir le module plus tôt ne réduit pas suffisamment le délai de rendu. Aucun changement applicatif de cet essai n'est publié. Le header et la refonte commerciale V3 restent intacts.

Base analysée : `0b4cd2de`, incluant V3 et le header publié. Le dernier contrôle commercial documenté reste celui de V3 ; cette mesure ne certifie pas la clôture du plan A–Z.

## Méthode et limites

Deux builds du même code, l'un sans indice et l'autre avec des indices `modulepreload` conditionnels à la route, servis localement avec gzip. Le dernier candidat anticipe uniquement le graphe statique de la route courante et ses CSS, à faible priorité ; aucune page privée, exécution anticipée ou appel API supplémentaire. Ancien chemin de chargement conservé pour les navigateurs sans prise en charge native.

API publique en GET seulement, réponses conservées dans la même instance de proxy pour rendre les données identiques avant/après ; images produit du CDN réel. Chaque passage utilise un contexte navigateur neuf, cache désactivé, écran 390 × 844, CPU ×4, latence 150 ms, débit 200 000 octets/s. Trois passages par route ; observation pendant cinq secondes après networkidle. Ces résultats sont des mesures de laboratoire locales, pas les percentiles des visiteurs ni un test sur téléphone Android physique.

Le premier proxy renvoyait `Cache-Control: no-store` pour les assets, ce qui provoquait un deuxième chargement du hero. Ce jeu de résultats est exclu de la comparaison retenue. Le proxy final reprend `public, max-age=0, must-revalidate` constaté sur le visuel public ; un seul transfert du hero a été vérifié. Un premier essai bloquait également une image légitime de `/product-images/` : la liste autorisée a été corrigée avant les mesures retenues. Les traces exclues restent dans le dossier local, pas utilisées comme preuve de performance.

## Comparaison retenue

| Route | LCP avant, trois passages | LCP candidat, trois passages | Médiane avant → candidat |
| --- | --- | --- | --- |
| Accueil | 4504 / 4412 / 4168 ms | 4552 / 4584 / 4880 ms | 4412 → 4584 ms |
| Catalogue | 6376 / 4544 / 4800 ms | 4600 / 4712 / 5268 ms | 4800 → 4712 ms |

L'accueil ralentit de 172 ms en médiane ; le catalogue gagne seulement 88 ms. Dispersion et séquences de mesure interdisent de traiter ce faible écart comme un gain établi. Le candidat est retiré, plutôt que publié sur la seule preuve d'une découverte plus précoce du fichier.

Dans les deux builds : CLS 0, JS encodé 202 677 octets sur l'accueil et 195 193 sur le catalogue, aucune erreur JavaScript, aucun débordement ni requête interdite. Budgets JS 220 Kio et CLS 0,1 respectés. **Budget LCP 2500 ms non atteint** sur les deux routes. Les JSON complets `before.json` et `rejected-preload.json` conservent les ressources et les timings, ainsi que le statut `budgets-missed`.

## Contrôles et état final

- Le candidat a passé 95 tests Node et le lint ; ses trois nouveaux tests vérifiaient la sélection de route, la déduplication, le repli ancien navigateur et l'échec du build si un module manque. Ces tests et le plugin ont été retirés avec l'expérience ; ils ne constituent pas une fonctionnalité livrée.
- Le build applicatif d'origine est reconstruit après retrait. Aucun plugin expérimental ne doit rester dans `dist-release/index.html`.
- Le test legacy accepte maintenant `NEWOTEG_TEST_URL` et `NEWOTEG_TEST_OUTPUT`, au lieu d'imposer le port 5199 et d'écraser les anciennes preuves. Exécution réussie sur le build de référence à 5203 : bundle legacy exécuté, carrousel tactile, aucun débordement ni erreur JS. Preuve : `legacy.json`. Cela ne prouve pas le fonctionnement sur un ancien Android physique.
- Aucun déploiement frontend ni modification de backend ou de données métier pour cet essai.

Sources techniques consultées : [API de transformation HTML Vite](https://vite.dev/guide/api-plugin.html#transformindexhtml) et README du plugin legacy installé, version 7.2.1. Aucun polyfill n'a été supprimé pour gagner artificiellement du poids au détriment des anciens navigateurs.

## Suite du plan global

Le prochain travail sur L8 doit porter sur le rendu public initial et le temps d'exécution, au-delà des indices de téléchargement. L'HTML initial n'inclut actuellement que les métadonnées et un `#root` vide. Une solution de rendu initial devra réutiliser les composants, éviter les compteurs ou données clients inventés, conserver l'authentification et le panier, gérer la reprise React, puis être mesurée avec une vraie comparaison. Ce rapport ne remplace pas ce travail par une optimisation d'image ou un budget moins exigeant.

Les gates publics ont aussi été relus le 10 octobre à 07:47 UTC (`public-gates.json`) : API/base/stockage OK, email et SMS désactivés, zéro projet public, collecteur de parcours arrêté. Les validations boutique/technicien, fournisseur de messages, projet pilote, recette opérateur sur téléphone et période d'observation restent nécessaires conformément à `ETAT-CLOTURE-2026-10-08.md`. Aucun lot n'est déclaré clos sur ces seuls contrôles.

## Reproduire les mesures sur ce poste

Racine des outils et captures : `C:/Users/pc/Documents/Newoteg/output/implementation-work/route-preload-20261010/`.

`preview.cjs` sert les builds de référence et candidat aux ports 5203/5204 et bloque tout écrit. `measure.cjs` utilise les paramètres indiqués ci-dessus ; définir `NEWOTEG_LAB_BASE` et un répertoire absolu `NEWOTEG_SEO_OUTPUT`, puis l'exécuter avec Node. Le build candidat est archivé comme code expérimental dans `rejected-publicRoutePreload.js`, et ses tests dans `rejected-publicRoutePreload.test.mjs`. Le build courant de `dist-release` revient à la version applicative sans plugin après retrait : reconstruire le candidat est nécessaire pour rejouer la comparaison. Aucun de ces outils n'appelle une commande, un paiement ou un fournisseur de messages.
