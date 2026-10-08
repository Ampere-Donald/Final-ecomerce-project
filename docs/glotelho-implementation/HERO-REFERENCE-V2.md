# Reprise du hero selon la référence client — 8 octobre 2026

## Écarts corrigés
La version précédente séparait le visuel dans un panneau à droite. La référence demande un décor continu, avec une zone calme à gauche pour le texte et les produits regroupés à droite. Les cartes flottantes étaient textuelles, les catégories réutilisaient des images, et le bandeau d’équivalences n’avait ni le rythme horizontal ni les composants détournés de la référence.

## Réalisation
- Nouveau panorama photographique généré : atelier clair, alimentation métallique, multimètre vert, bobine rouge/noire, composants sur le plan de travail ; aucun texte incorporé dans l’image.
- Texte, liens et cartes en HTML : restent lisibles, traduisibles et interactifs.
- Deux cartes flottantes illustrées ; six images de catégories distinctes.
- Bandeau d’équivalences : flèches dans un cercle, titre et texte, bouton contour bleu, composants détourés. Le lien utilise le moteur existant /equivalences. Les autres pages conservent la variante initiale du composant.
- À 1100 px et moins, texte et scène s’empilent ; catégories en trois puis deux colonnes. Les composants décoratifs du bandeau disparaissent pour préserver la lecture.
- En-tête, navigation, identité et logique métier conservés.

## Fichiers
Font-end/src/storefront/Home.jsx
Font-end/src/storefront/EquivalenceEntry.jsx
Font-end/src/storefront/home-hero.css
Font-end/index.html (préchargement du nouveau panorama)
Font-end/public/design-e/*-v2*.webp

## Assets
Panorama WebP en 1440 et 2160 px : environ 48 et 81 ko. Six vignettes de catégories, une bobine détourée et un groupe de composants. Images générées pour l’illustration commerciale ; elles ne remplacent pas les photographies des références réellement vendues ni ne certifient leur disponibilité.

## Vérifications
Build Vite réussi avec VITE_API_URL=/api ; lint ciblé réussi ; 82 tests de contrats existants réussis. Contrôle navigateur à 1440, 1024, 768, 390 et 360 px : pas de débordement horizontal, assets présents, accents corrects, CTA dirigés vers catalogue et équivalences. Les captures locales sont dans output/implementation-work/hero-reference-v2 sur le poste de travail. Le catalogue local sans configuration backend peut afficher une erreur ; la vérification publique après déploiement reste requise.
