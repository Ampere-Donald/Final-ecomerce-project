# Navigation commerce NEWOTEG — 8 octobre 2026

## Périmètre
Header public monté par Font-end/src/App.jsx. Le logo officiel /logo-header-48.webp et /logo-header-96.webp, son texte, le hero, la réception, le panier, l’authentification, les favoris et les pages métier sont conservés. Aucun asset généré, aucune modification du backend, des stocks, des prix, de l’administration ou de l’hébergement.

## Livraison
Header.jsx et header-commerce.css : trois niveaux, actions verticales Conseil / Mon compte / Favoris / Panier, numéro issu de shopContact, raccourcis réels et bouton d’ouverture du catalogue. Pas d’horaires ajoutés faute de configuration officielle.
CatalogueMenu.jsx : panneau desktop en trois zones et bande basse ; même navigation utilisable dans le drawer mobile. Ouverture au clic, sélection par survol/focus/activation, fermeture Escape/clic extérieur/navigation, y compris retour navigateur. Le panneau est superposé sans déplacer le hero.
catalogueNavigation.js : regroupement de présentation des seules catégories réelles. GET /categories fournit actuellement 15 familles, sans parent/enfant dans le schéma Prisma ; aucune sous-catégorie fictive n’est créée. Les catégories non regroupées restent accessibles. Les destinations utilisent /catalogue?category=<id>. Les données indisponibles laissent Voir tout le catalogue et Réessayer utilisables.
HeaderSearch.jsx : combobox avec six suggestions au maximum, chargement, absence de résultat et erreur réseau. GET /produits?search=...&salesSearch=true&limit=8 ; ordre du backend préservé. Déclenchement à deux caractères avec 300 ms de pause, AbortController et résultats associés à leur requête. Images via Photo/adaptProduct, prix via Price/formatFCFA, stock via Stock. Entrée sur un article ouvre /product/:id ; sinon recherche complète /catalogue?search=... . Flèches, Escape, clic et focus testés. Champ catalogue-query avec autocomplete=off ; les politiques natives du navigateur ne sont pas modifiables par CSS et peuvent ignorer cet attribut.

## Contrôles locaux
Lint complet réussi ; build Vite réussi ; 85 tests Node réussis (trois nouveaux contrats de navigation et surlignage). Tests navigateur avec API publique via proxy local : détails dans verification-local.json. Cas contrôlés de réponse retardée, annulation, rupture, prix inconnu, erreur réseau et catégories indisponibles également réussis. Frappe de 12 caractères à 20 ms/caractère : un appel de suggestions. Pas de débordement à 360, 390, 768, 1024 et 1440 px, ainsi qu’à 1100, 1200, 1280 et 1366 px. Français/anglais vérifiés. Favoris invité redirige vers login?returnTo=/favourites ; panier et dialogue de réception restent accessibles. Aucune commande ni message envoyé.

IRF510 et câble HDMI ne renvoient actuellement aucun résultat via le moteur public ; condens donne six suggestions affichées, multimètre quatre, condensatuer six. Aucun produit ni prix inventé pour remplir ces cas.

## Captures
Sur le poste : C:/Users/pc/Documents/Newoteg/output/implementation-work/header-commerce/
header-closed.png, mega-menu.png, suggestions.png, header-390.png, suggestions-390.png, drawer-390.png et variantes par largeur. Les deux nouvelles captures annoncées dans la mission ne figuraient pas parmi les pièces jointes ; comparaison effectuée avec les spécifications détaillées et la direction NEWOTEG existante.

## Production
Publication et vérifications publiques à compléter après livraison avec le workflow Cloudflare Wrangler déjà utilisé pour newoteg-client / newoteg.com.
