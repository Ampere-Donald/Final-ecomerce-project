# Header commerce — contrôle final du 10 octobre 2026

La mission jointe correspond au header livré le 8 octobre. Le composant public est bien `Font-end/src/storefront/Header.jsx`, monté par `App.jsx`. L'ancienne implémentation `src/components/Header/` n'est pas utilisée. L'identité, le hero, les sections de l'accueil, les fiches produit, le backend, l'administration et les données métier n'ont pas été modifiés pendant ce contrôle.

## Correction supplémentaire

L'accueil dispose depuis le 10 octobre d'un HTML initial avant JavaScript. Un utilisateur pouvait saisir une recherche dans cet HTML : le texte et le focus étaient conservés après hydratation, mais l'événement de focus antérieur à React n'ouvrait pas les suggestions.

`HeaderSearch.jsx` reprend maintenant, après hydratation, un champ effectivement focalisé contenant au moins deux caractères. Le rendu initial reste identique au HTML serveur. Le panneau reste fermé si le visiteur a quitté le champ. Le délai de 300 ms, l'annulation des requêtes et le moteur `salesSearch` sont conservés. `tests/verify-header-hydration.cjs` reproduit ce cas en bloquant les scripts, avec une réponse API isolée au navigateur de test. Le test échoue sur le build précédent et réussit sur le build corrigé, sans erreur d'hydratation et avec un seul appel de suggestions.

## Conformité vérifiée

- Trois niveaux, logo officiel 48/96 WebP, actions verticales, vrai compteur panier et réception existante.
- Catégories provenant de `GET /categories`, regroupements de présentation limités aux identifiants réels. Trois zones dans le méga-menu et bande basse vers `/catalogue`. Pas de sous-catégories fictives en l'absence de parent/enfant dans la base.
- Suggestions : `GET /produits?search=…&salesSearch=true&limit=8`, six affichées au maximum, prix et stock issus des produits réels, références surlignées, navigation directe vers `/product/:id`.
- Survol/focus/changement de famille, Escape avec retour du focus, clic extérieur, fermeture après navigation et absence de déplacement du hero.
- Recherche exacte, partielle, accents, faute, aucun résultat, clavier, clic, réponses retardées, annulation, panne réseau, prix inconnu et rupture contrôlés.
- Frappe de douze caractères à 20 ms par caractère : un appel API. Aucun débordement à 360, 390, 768, 1024 et 1440 px ; drawer mobile avec catégories fonctionnelles.
- Restauration du compte vérifié, panier, favoris, réception et anglais contrôlée avec fixtures isolées. Expiration de session, refus du stockage et échec du module accueil gardent les replis prévus.
- `autocomplete=off`, `name=search` et formulaire GET utilisable avant JavaScript. Aucune garantie de suppression universelle des panneaux natifs du navigateur.

Les captures annoncées comme Image 1 et Image 2 ne figuraient pas dans le dossier joint, qui contenait uniquement le texte. Contrôle visuel effectué contre les spécifications et la référence NEWOTEG déjà fournie, sans prétendre à une comparaison exacte avec ces deux captures absentes.

## Validation avant publication

Lint complet, 96 tests Node, build Vite et simulation Wrangler réussis. Recette navigateur locale complète et sept contrats d'hydratation réussis ; aucune erreur JavaScript ni écriture métier dans les contrôles d'hydratation.

Profil synthétique mobile : 390 × 844, CPU ×4, latence configurée 150 ms, débit 200 000 octets/s, cache froid, trois essais par route. Accueil : LCP 2592 / 2360 / 2376 ms, médiane 2376 ms ; catalogue : 5124 / 4740 / 4688 ms, médiane 4740 ms. CLS nul sur les six essais. JavaScript compressé : 203 378 octets accueil, 195 897 catalogue, soit environ 76 octets de plus que la livraison précédente. Ce contrôle n'est pas une mesure terrain ni la preuve d'un gain de LCP ; le catalogue reste au-dessus de la cible de 2500 ms et le chantier de performance demeure ouvert.

Captures et preuves sur le poste : `C:/Users/pc/Documents/Newoteg/output/implementation-work/header-commerce/final-recheck-20261010/` (`header-closed.png`, `mega-menu.png`, `suggestions.png`, `header-390.png`, `suggestions-390.png`, `drawer-390.png`, `verification.json`, `hydration-local.json`, `hydration.json`, `performance/mobile-lab-result.json`).

## Publication

Statut de publication et contrôle public à compléter après livraison par le workflow Cloudflare Wrangler déjà configuré, sans modification d'hébergement.
