# Accueil public rendu au build — 10 octobre 2026

## Changement

L'accueil recevait un `#root` vide et attendait le téléchargement et l'exécution de React puis du module Home. Le build génère maintenant `__public-home.json` depuis les composants React existants, avec une session anonyme et les feuilles de style du manifeste client. Le Worker insère cet HTML uniquement dans le GET de `/`, sans recopier cookies, autorisation ou paramètres dans le fichier partagé. Aucune requête de catalogue au build, aucun prix, stock ou compte client figé dans ce document.

Le client résout Home puis utilise `hydrateRoot` ; les autres routes restent rendues côté client. Providers partagés, première passe française/anonyme identique au serveur, restauration ultérieure de la langue et de la session. Les écritures d'authentification attendent cette restauration et tolèrent le stockage bloqué. Menu et réception restent désactivés jusqu'à la reprise par React. La recherche conserve une saisie commencée avant la reprise, puis prend normalement la valeur de la nouvelle route lors d'une navigation ; son formulaire GET fonctionne sans JavaScript. Les métadonnées restent présentes si le module Home échoue. L'accueil déjà affiché ne rejoue pas l'animation d'entrée.

Fichiers principaux : `src/storefront/serverHome.jsx`, `tooling/prerenderHome.js`, `src/storefront/initialHome.js`, `worker.js`, `src/main.jsx`, `src/StorefrontProviders.jsx`, `src/App.jsx`, contextes Auth/I18n, Header/HeaderSearch/ReceptionChoice et `useBrowserReady.js`, garde navigateur de `journey.js`, règle ciblée de `styles/main.scss`, `vite.config.js`, `tests/initialHome.test.mjs`. Aucun changement du dessin du hero, des données commerciales, du backend ou de l'hébergement.

## Mesures locales

Même Worker en lecture seule aux ports 5207/5208, compression gzip, réponses GET publiques gelées et partagées entre les variantes, images CDN réelles. Référence applicative V3 équivalente à `0b4cd2de` / `56a58fcd` avant cette modification. Edge, viewport 390×844, cache froid, CPU ×4, débit configuré 200 000 octets/s et latence configurée 150 ms, trois passages par route. Ces paramètres sont une simulation de laboratoire, pas une mesure sur téléphone ni un percentile de terrain.

| Route | Avant, trois LCP | Candidat final, trois LCP | Médianes |
| --- | --- | --- | --- |
| Accueil | 4564 / 4520 / 4420 ms | 2552 / 2248 / 2376 ms | 4520 → 2376 ms, −47,4 % |
| Catalogue | 4964 / 4660 / 4940 ms | 5732 / 5496 / 5060 ms | 4940 → 5496 ms |

L'écart catalogue a déclenché une vérification supplémentaire alternée avant/après, trois paires avec le même profil : avant 5060 / 4980 / 4664 ms ; candidat 6632 / 4392 / 4788 ms. Médianes 4980 → 4788 ms, mais dispersion importante et résultats contradictoires entre séries. Aucune amélioration fiable du catalogue ni absence certaine de régression ne sont certifiées par ces échantillons. Cette route reste la cible suivante de L8.

CLS 0, aucun débordement, aucune erreur JavaScript ni requête interdite dans les mesures. JS transféré de l'accueil : 202 677 → 203 302 octets ; catalogue : 195 193 → 195 822 octets, sous le budget fixé à 220 Kio. Objectif LCP 2500 ms : médiane de l'accueil sous le seuil, un passage final encore au-dessus ; tous les passages catalogue au-dessus. **L8 reste ouvert.** JSON complets : `before.json`, `candidate.json`, `catalogue-alternating.json`.

## Recette

- Lint complet, 96 tests Node et build réussis. Manifeste actuel indispensable ; absence de module, HTML mal formé ou snapshot absent ne doivent pas produire un faux rendu. Tests unitaires des feuilles de style, du périmètre du Worker, des en-têtes/paramètres privés et du repli sur une ancienne livraison.
- Accueil sans JavaScript visible à 390/768/1440 px ; lien d'équivalence et formulaire GET fonctionnels.
- Nœuds initiaux du titre et de la recherche conservés après hydration ; texte saisi et focus conservés. Métadonnées avec un propriétaire unique ; navigation de catégorie ne conserve pas la vieille saisie.
- Compte, panier, favoris, langue et destination restaurés avec API simulée exclusivement dans un contexte navigateur isolé. Jeton conservé pendant la vérification, session invalide effacée après refus. Stockage bloqué : page et changement de langue utilisables. Anglais sans débordement à sept largeurs.
- Échec volontaire du module Home : HTML public, titre et recherche native restent disponibles. Cet échec attendu est séparé des recettes sans erreur.
- Recette commerciale V3 : douze groupes de contrôles réussis (carrousels, filtres, prix/stock, équivalences, comparaison, panier, offres et traductions). Une revue de commande entièrement interceptée localement ; aucune commande réelle.
- Header : vrais résultats API, clavier, fermeture, drawer, réception/favoris/panier, réponse lente obsolète, rupture/prix absent et erreur réseau ; 360/390/768/1024/1440 px. Douze caractères rapidement saisis : un appel après debounce.
- Bundle legacy exécuté et carrousel tactile testés sans erreur ni débordement ; ce test ne remplace pas un ancien appareil physique.
- Compilation Worker Wrangler à blanc réussie, liaison ASSETS conservée.

Preuves `hydration.json`, `legacy.json`. Scripts, logs, captures et autres résultats : `C:/Users/pc/Documents/Newoteg/output/implementation-work/initial-home-20261010/`. `preview.mjs` sert les deux builds ; `measure.cjs` et `measure-catalogue.cjs` exécutent les profils ; `verify-hydration.cjs` vérifie les sept contrats de reprise. Les scripts commerciaux existants acceptent `NEWOTEG_TEST_URL` / `NEWOTEG_TEST_OUTPUT`. Aucun de ces contrôles ne constitue la recette physique ou l'accord d'un opérateur.

## Livraison

Les tests locaux autorisent la livraison incrémentale du gain d'accueil. Le contrôle public et sa version Cloudflare doivent être ajoutés après publication effective ; ils ne sont pas déduits du build. Le catalogue reste côté client, et les gates métier/fournisseurs/téléphone/préproduction/observation du plan A–Z restent ouverts.
