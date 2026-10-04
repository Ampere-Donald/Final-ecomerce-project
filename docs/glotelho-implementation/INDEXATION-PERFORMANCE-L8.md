# Indexation et chargement — L8

## Objectifs de laboratoire fixés avant mesure

Ce protocole est enregistré avant la première exécution de `Font-end/tests/measure-built-mobile.cjs` :

- Build Vite de production avec sandbox, aperçu HTTP 127.0.0.1:5188, API main locale de démonstration via le véritable proxy Vite. Lecture seulement, aucun fournisseur ou compte client.
- Edge moderne, fenêtre 390 × 844, contexte neuf et cache désactivé pendant chaque passage, latence 150 ms, téléchargement 1,6 Mbit/s (200 000 octets/s), envoi 750 kbit/s, CPU ralenti quatre fois. Trois passages indépendants sur accueil et catalogue. Ce profil strict ne mesure pas le bénéfice du cache pendant une session normale.
- Objectifs internes pour chaque passage : LCP ≤ 2 500 ms, CLS ≤ 0,1, JavaScript réellement transféré et compressé ≤ 220 Kio. Le budget d’octets est propre au projet. Les deux seuils visuels reprennent les repères [Web Vitals](https://web.dev/articles/vitals), sans assimiler ces mesures à des percentiles de trafic réel.
- LCP et CLS observés pendant le chargement puis cinq secondes après réseau inactif. CLS : plus grande fenêtre de changements de moins de cinq secondes, avec moins d’une seconde entre changements, sans événement lié à une interaction récente. Les tâches longues sont enregistrées pour diagnostic. Aucun score Lighthouse ni INP annoncé.
- Ce protocole ne couvre pas un téléphone physique, un navigateur Android ancien, le HTTPS/CDN distant, la charge serveur ou les images du catalogue réel. Ces contrôles restent ouverts avant publication.

## Corrections d'indexation vérifiées le 4 octobre 2026

Le build précédent avait des titres vides sur catalogue, fiche et pages boutique, deux descriptions et un Open Graph resté sur l'ancienne présentation corporate. Les titres JSX composés de plusieurs enfants et les instances multiples de Helmet sont incompatibles avec l'unicité requise par le comportement natif de React 19. La première tentative de centralisation conservait encore des doublons ; elle n'est pas retenue comme preuve réussie.

Un seul `PageMetadataProvider` émet désormais les balises natives ; les pages enregistrent uniquement les données chargées. Le titre est une chaîne unique. Une mise à jour n'est utilisable que pour le même chemin, paramètres et langue ; une ancienne fiche ne peut pas contaminer la route suivante. Les métadonnées statiques marquées sont retirées au démarrage de React, en conservant le fallback pour un document sans JavaScript. Mécanisme documenté par [React pour title](https://react.dev/reference/react-dom/components/title) et [meta](https://react.dev/reference/react-dom/components/meta).

- Titre, description, Open Graph et Twitter cohérents FR/EN ; canonical des pages publiques, pagination normalisée, résultats filtrés en noindex/follow. Fiches et projets absents : titre d'erreur, noindex/follow et retrait du canonical. Une panne temporaire n'est pas assimilée à une disparition définitive.
- Panier, checkout, suivi invité, devis privés/impression, commandes, compte, favoris et authentification : noindex/nofollow sans canonical public. Referrer privé retiré lors du retour à une page publique. Les protections serveur d'accès restent indispensables ; noindex ne remplace pas l'authentification.
- Sitemap ramené à quatorze routes publiques réellement disponibles, sans dates ni catégories inventées. Les fiches/projets réels seront ajoutés après qualification du catalogue ; les fixtures locales ne sont pas publiées. Pas de hreflang pointant FR et EN vers la même URL : le changement de langue actuel est une préférence locale, pas deux adresses publiques distinctes.
- Robots permet la lecture du noindex des documents privés plutôt que de bloquer cette lecture : [règle Google](https://developers.google.com/search/docs/crawling-indexing/block-indexing). Cela n'autorise aucun contenu privé et ne modifie pas les guards ou les clés d'accès.

`verify-seo-build.cjs` : neuf groupes passent sur le build servi, quatorze routes publiques × deux langues, fiche réellement lue dans l'API locale, cinq routes privées, filtres/pagination, 404 de fiche/projet et navigation sans rechargement. Un titre, une description, une directive robots et des métadonnées sociales cohérentes ; aucun canonical privé. Échec initial du test sur un lien caché mobile corrigé avec le lien visible. Le visuel d'une fixture utilise 5187/design-e : cette origine locale de lecture est explicitement autorisée, aucun domaine extérieur. Captures accueil/catalogue/fiche 390 px inspectées ; aucune largeur globale dépassée.

## Défaut de routage des fichiers privés

`wrangler.jsonc` laissait le routage par défaut servir le fallback SPA avant le Worker. Dans le runtime local réel workerd/Miniflare, une navigation HTTP sur `/suivi-invite` renvoyait 200 sans les en-têtes privés, même si un appel direct au Worker était correctement protégé. Le test initial utilisant Node fetch ne reproduisait pas ce défaut car il transmet un mode cors ; le pilote utilise maintenant HTTP natif et le vrai en-tête de navigation.

`assets.run_worker_first=true` assure le passage préalable dans le Worker, conformément à la [documentation Cloudflare](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/). La protection couvre aussi les API invitées avis/incompatibilités. Trois groupes runtime passent : défaut préalable reproduit, onze documents privés protégés avant JavaScript, quatre documents publics et image marketing inchangés. Toutes les sorties réseau du Worker de test sont refusées ; aucune n'est tentée. Les options de routage utilisent la correspondance booléenne de la version Wrangler installée. Ce n'est pas un déploiement Cloudflare ; coût et comportement de la cible/CDN restent à vérifier. Les tests Node séparés couvrent aussi les erreurs API invitées et la frontière de chemins.

## Mesures de chargement et limites restantes

Les images et le design E sont conservés. L'image principale de l'accueil est découverte avant le chargement des modules de page et prioritaire, uniquement sur `/`. La première image du catalogue est eager/prioritaire ; les suivantes restent lazy. Les photos utilisent le décodage asynchrone. La couche Helmet devenue inutile est retirée du chemin exécuté ; les builds modernes et legacy restent générés, sans changement des cibles Android.

| Mesure, trois passages froids | Avant les priorités et la suppression de la couche | Après | Objectif |
| --- | --- | --- | --- |
| LCP accueil | 5 512 / 5 204 / 5 332 ms | 4 748 / 4 524 / 4 524 ms | ≤ 2 500 ms : non atteint |
| LCP catalogue | 5 992 / 5 872 / 5 832 ms | 5 012 / 4 924 / 5 196 ms | ≤ 2 500 ms : non atteint |
| CLS accueil / catalogue | 0,01549 / 0 | 0,01549 / 0 | ≤ 0,1 : atteint |
| JS compressé transféré accueil | 202 489 octets | 196 606 octets | ≤ 225 280 : atteint |
| JS compressé transféré catalogue | 192 819 octets | 186 925 octets | ≤ 225 280 : atteint |

L'image principale multimetre.webp reste le candidat LCP de l'accueil, hdmi-5m.webp celui du catalogue de démonstration. Le logo de 126 046 octets est lourd pour sa petite taille affichée, et le profil sans cache le transfère aussi comme icône. Préparer des ressources adaptées à leur taille d'affichage et réduire le chemin JavaScript critique restent à traiter ; ne pas annoncer la performance comme validée. Les images de fixture venant d'une autre origine locale peuvent avoir encodedBodySize=0 dans Resource Timing faute de Timing-Allow-Origin : aucune mesure du poids total des images n'est annoncée.

Le build actuel passe, avec index moderne 402,62 ko / gzip 134,14 ko et polyfills modernes 125,05 ko / gzip 46,83 ko. L'avertissement Browserslist ancien reste présent. Onze tests Node ciblés et lint des composants modifiés passent. Les six passages instrumentés terminent sans erreur runtime ni sortie extérieure, mais leur état est **budgets-missed** : ce n'est pas un certificat de publication.

Preuves dans `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/seo-performance/` : `baseline.json`, `metadata-result.json`, `private-assets-result.json`, `mobile-lab-before-hints.json`, `mobile-lab-result.json`, captures mobiles et avec débit limité. L'aperçu Vite mesure le build et le proxy local ; le test workerd séparé couvre le routage des assets. Aucun test ne prouve ici HTTPS, délivrabilité email/SMS, catalogue réel, crawler social sans JavaScript, classement Google ou performance terrain.

Reproduction depuis `Font-end`, API de démonstration main 3000 et preview du build 5188 déjà disponibles :

```powershell
$env:NEWOTEG_SEO_OUTPUT='C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/seo-performance'
node tests/verify-seo-build.cjs
node tests/verify-private-assets.cjs
node tests/measure-built-mobile.cjs
node --test tests/routeMetadata.test.mjs tests/guestWorker.test.mjs tests/guestAccess.test.mjs tests/orderData.test.mjs
```

Le rendu initial public reste un fallback générique et les métadonnées détaillées demandent JavaScript. Pré-rendu/rendu serveur et réponses HTTP des ressources absentes restent à étudier avant de conclure l'indexation. L8 et l'objectif A–Z demeurent ouverts ; L9 non autorisé.

## Vérification suivante — images et essai de préchargement

Correction du résolveur partagé des photos : `/api` conserve une adresse média relative sur le même domaine ; seul le segment final `/api` d'une URL complète est retiré. L'ancien remplacement pouvait altérer un sous-domaine `api` et la valeur relative vide déclenchait une adresse `localhost` chez le visiteur. Les URL absolues HTTP(S) existantes sont conservées. Vite relaie maintenant `/uploads` vers le même backend IPv4 que `/api`, en développement et en preview.

Deux tests ciblés couvrent les configurations relative/absolue, chemins avec et sans slash et images absentes. `verify-local-media.cjs` copie temporairement un WebP marketing sans le modifier dans le dossier du main local dédié, compare les 115 186 octets reçus sur 3000/5187/5188 et supprime son fichier unique dans finally. Trois lectures HTTP réussies ; aucun produit, commande ou stock modifié. Cette preuve concerne le routage local des fichiers, pas les photos du catalogue de production ni son stockage durable.

Un essai de découverte anticipée des modules accueil/catalogue dans le HTML a été retiré : aucun bénéfice mesuré, chargement plus lent lors de cet essai. Il n'est pas livré. Profil identique au protocole précédent ; fluctuations entre passages interdisent une attribution précise de chaque écart au seul changement.

| LCP, trois passages froids | Essai retiré | Version conservée |
| --- | --- | --- |
| Accueil | 6 708 / 6 456 / 6 324 ms | 4 484 / 5 608 / 5 884 ms |
| Catalogue | 7 708 / 7 480 / 7 332 ms | 6 732 / 6 120 / 6 356 ms |

La version conservée reste **budgets-missed**. CLS accueil 0,01549 et catalogue 0 ; JavaScript compressé 196 674 / 186 985 octets. Ces deux budgets passent, le LCP non. Les cibles Android et le design E sont conservés. Build et lint passent ; treize tests Node ciblés réussissent. Les neuf groupes de métadonnées et les trois groupes du runtime d'assets privés sont recontrôlés sur le build conservé. Les vingt parcours commerce de la recette précédente ne sont pas annoncés comme rejoués pour ce correctif de média.

Preuves séparées : `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/seo-performance/preload-2/` pour l'essai retiré, `.../media-2/` pour la version conservée. Ni gain de performance validé, ni publication.
