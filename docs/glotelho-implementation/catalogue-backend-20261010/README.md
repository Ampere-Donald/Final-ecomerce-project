# Catalogue initial préparé pour Railway — 10 octobre 2026

## État exact

Le prototype React exécuté sur Cloudflare consomme 18–70 ms CPU par requête pour une offre Workers Free limitée à 10 ms. Cette adaptation déplace le rendu dans un paquet Node appartenant à la livraison du backend. Cloudflare reçoit uniquement le fragment HTML public et ses données d'hydratation. **Adaptation vérifiée en CI et contre la base réelle en lecture seule, non activée.** Les paramètres Railway/Cloudflare de rendu catalogue n'ont pas été changés dans cette étape. La livraison des sources et l'activation du rendu sont deux étapes distinctes.

## Contrat et protections

- `GET /api/storefront/catalogue?renderer=<empreinte>&url=<adresse catalogue>` utilise `ProduitService.findAll` en mode public, avec 24 produits, et `CategorieService.findAll`. Les filtres, prix datés et disponibilité après réservations suivent les règles existantes. La projection partagée `public-product.ts` conserve également le comportement personnel/admin de l'API précédente.
- Pas de données au build, d'envoi, de commande ni de nouveau cache de stock. Le paquet filtre les champs transmis au navigateur. Cookies et Authorization n'activent jamais une vue admin sur cet endpoint.
- Le paquet CJS est compilé depuis les composants réels, chargé depuis `.storefront-renderer`, contrôlé par SHA-256 et limité à 2 Mio. Aucun chemin ni code demandé par un visiteur n'est chargé. L'activation nécessite `STOREFRONT_CATALOGUE_RENDERING=true`; un paquet invalide avec ce drapeau arrête le démarrage. Sans activation, le service retourne 503.
- Identité déterministe du renderer, comprenant le bundle et les sources App/main. Un désaccord backend/frontend retourne 409 avant toute recherche. Le Worker rejette redirection, mauvais type/enveloppe, autre identité, dépassement de 512 Kio ou délai de 2 secondes. Il garde alors la page client actuelle. L'affichage initial réussi est `no-store`.
- Le paquet Node utilise React en production et le renderer Node. Cela évite le port de messages qui maintenait le processus de test ouvert avec la variante navigateur. `useResource` garde son identifiant de requête en interne : le prop React `key` n'est plus transmis accidentellement via le spread des wrappers.

## Vérifications effectuées

Builds frontend et backend réussis. Lint frontend réussi. **102 tests frontend et 419 tests backend réussis** (58 suites backend), dont neuf tests nouveaux pour le chargement du paquet et la projection publique. Le vrai paquet compilé passe aussi le contrat URL, caractères spéciaux, champs privés, stock nul/prix absent et identité identique entre deux builds indépendants.

Le contrôleur et service Nest réels ont été exercés sur un serveur local, avec un adaptateur de données alimenté uniquement par les GET publics du catalogue. Il ne lance pas la base de production ni les tâches planifiées. Quatre groupes HTTP passent : arguments/version, ressources identiques avec/sans faux credentials, erreur API et repli Worker. Cela ne prouve pas la latence ou le fonctionnement de cette image sur Railway.

Six groupes navigateur Edge passent : vrais articles avant JavaScript sur 360/390/768/1024/1440 px, hydratation conservant les nœuds et contenus, absence de second GET des produits frais, tri/pagination/stock, retour navigateur, URL filtrée, langue anglaise/comparaison restaurées et panne API sans faux résultat vide. Zéro erreur d'hydratation et zéro écriture. Le test de checkbox attend désormais la fin de la transition Router et vérifie simultanément URL et état coché. Les captures desktop/mobile ont été relues. L'accès au navigateur intégré n'a pas fonctionné ; ces contrôles utilisent Edge indépendant.

Comparaison locale des mêmes réponses publiques, réseau 150 ms / 200000 octets/s / CPU ×4, cache navigateur froid, trois passages :

| Mesure catalogue | Build principal 099e1368 | Candidat backend |
| --- | --- | --- |
| LCP (ms) | 4416 / 4136 / 4556 | 2244 / 1996 / 2048 |
| Médiane | 4416 | 2048 |
| CLS | 0 | 0 |
| Scripts compressés | 195897 octets | 197304 octets |

Gain synthétique médian 53,6 %. Les GET publics sont partagés dans l'adaptateur de laboratoire pour éviter de comparer des articles différents. **Pas de cache équivalent en production.** Ces nombres ne mesurent ni Railway, ni le téléphone réel, ni les Web Vitals terrain ou l'INP.

Le paquet Node pèse environ 828 Ko. Le Worker candidat compilé à blanc pèse 28,91 Kio / 8,26 Kio gzip, contre environ 160,79 Kio gzip avec React dans le prototype précédent. Cette diminution ne certifie pas un CPU inférieur à 10 ms : nouvelle mesure réelle obligatoire avant activation.

## Livraison préparée et travail restant

`Dockerfile.catalogue` est une image backend optionnelle à construire depuis la **racine du dépôt**. Elle compile le paquet dans un étage frontend et le copie avec Nest dans l'image finale, sous utilisateur node et démarrage de migrations existant. L'ancien Dockerfile et les réglages de production restent conservés. Le moteur Docker n'est pas disponible sur le poste, mais **la véritable image est construite et exécutée en CI Linux** : contrat du paquet final sans réseau, base ou migration, système de fichiers en lecture seule. [Workflow réussi au commit d2c2d27e](https://github.com/Ampere-Donald/Final-ecomerce-project/actions/runs/38062416779).

La [CI complète du même commit](https://github.com/Ampere-Donald/Final-ecomerce-project/actions/runs/38062416783) réussit : backend, storefront, administration, construction APK Android et recette Windows à blanc. Les dépendances proxy-addr/source-map-js et Capacitor sont corrigées sans changement majeur ; les audits de production ne signalent plus de vulnérabilité haute/critique. L'administration conserve une alerte esbuild de niveau faible. Le setup Android n'exige plus l'ancien paquet SDK `tools`. Les apostrophes dans les chaînes PowerShell sont correctement échappées ; aucun contrôle n'est retiré.

`verify-catalogue-database.cjs` exerce les vrais services Produit/Catégorie et le renderer compilé contre la base existante, avec session **et transactions forcées en lecture seule**. Cinq routes passent : catalogue (1883 articles), deuxième page triée, accents/prix/stock, catégorie réelle et aucun résultat. Identités, prix, offres datées, disponibilités et totaux correspondent exactement à la projection publique ; champs internes et produits inactifs absents. Aucun envoi, écriture ou tâche planifiée. Les temps depuis le poste (5,7–10,2 s) ne mesurent pas la latence d'un serveur Railway proche de sa base et ne prouvent pas que le délai Worker de 2 s sera respecté.

Reproduction native depuis `Font-end` : `VITE_API_URL=/api`, `VITE_CATALOGUE_SSR_BUILD=true`, `npm run build -- --outDir dist-release`, puis `npm run build:catalogue-package`. Depuis `Back-end` : `npm ci`, `npm run build`, `npm test -- --runInBand`. Ensuite `node Font-end/tests/verify-catalogue-package.cjs` depuis la racine. Configuration publique VITE identique obligatoire pour les deux compilations ; sinon l'identité diffère et le repli reste actif.

Suite requise : exercer l'image sur environnement isolé Railway, vérifier sa latence et mesurer le Worker Free avec ce backend, puis activer les versions concordantes et contrôler le domaine. L'authentification de gestion Railway manque sur le poste ; l'association demandée a expiré. Les credentials de base utilisés pour le test ne donnent pas un accès de gestion des déploiements. Ne pas promouvoir l'ancien Worker contenant React ni transformer ces preuves en confirmation du rendu catalogue en production. L8 et l'objectif A–Z restent ouverts, ainsi que les validations métier, fournisseurs email/SMS, projet pilote et observation réelle.

Preuves locales : `C:/Users/pc/Documents/Newoteg/output/implementation-work/catalogue-backend-20261010/` (adaptateur, HTTP, navigateur, mesures). Le fichier `result.json` versionné contient le résumé sans credentials, adresse IP client ou contenu privé.
