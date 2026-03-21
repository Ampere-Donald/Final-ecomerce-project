# Guide de Migration Design - Catalogue NEWOTEG SARL

Ce document contient les instructions et le prompt nécessaires pour transformer votre page catalogue actuelle en une interface moderne, épurée et professionnelle (Style "Oraimo/Tech Premium").

## 1. Style des Photos (Conseils)
Pour obtenir le même rendu visuel que dans ma démo :
*   **Fond** : Utilisez des images avec un fond blanc pur (`#FFFFFF`) ou transparent (PNG).
*   **Cadrage** : Assurez-vous que le produit occupe environ 80% de l'espace de l'image.
*   **Ratio** : Utilisez un ratio 1:1 (carré) pour toutes les photos.
*   **Qualité** : Privilégiez des photos haute résolution avec un éclairage studio uniforme.
*   **Outil** : Vous pouvez utiliser des outils comme [Remove.bg](https://www.remove.bg/) pour nettoyer les fonds de vos photos actuelles.

---

## 2. Prompt pour Gemini 3.1 Pro

Copiez et collez le texte ci-dessous dans votre interface Antigravity :

> **PROMPT :**
> "Agis en tant qu'expert Senior Frontend Developer. Je souhaite que tu modifies le design de la page Catalogue de mon projet React (NEWOTEG SARL) pour lui donner un aspect 'Premium Tech' similaire au style Oraimo.
>
> **Objectifs techniques :**
> 1. **Modularisation** : Sépare la page en composants réutilisables : `Sidebar.jsx`, `ProductCard.jsx` et `Catalogue.jsx`.
> 2. **Tailwind CSS** : Utilise exclusivement Tailwind CSS pour le styling.
> 3. **Design Tokens** :
>    - Primary Color: `#2A2FCE` (Indigo profond)
>    - Background: `#F4F5F8` (Gris très clair)
>    - Surface: `#FFFFFF` (Blanc pur pour les cartes)
>    - Text: `#111827` (Titres), `#374151` (Corps)
> 4. **Composant Sidebar** :
>    - Filtres par 'Famille' avec badges de compteurs.
>    - Range slider pour le prix (FCFA).
>    - Checkbox personnalisée pour la disponibilité.
> 5. **Composant ProductCard** :
>    - Aspect ratio 1:1 pour l'image.
>    - Badge 'En Stock' en haut à gauche.
>    - Affichage clair du prix 'Détail' (en gros/indigo) et 'Gros' (plus petit/gris).
>    - Bouton 'Ajouter au Panier' large et moderne.
>    - Effet de survol (zoom image + ombre portée douce).
> 6. **Données** : Assure-toi que les composants utilisent les données provenant de `src/data/productsData.js` et `src/data/categoriesData.js`.
>
> **Structure de fichiers attendue :**
> - `src/components/Sidebar/Sidebar.jsx`
> - `src/components/ProductCard/ProductCard.jsx`
> - `src/pages/Catalogue/Catalogue.jsx`
>
> Exécute les modifications de A à Z en respectant scrupuleusement cette esthétique épurée."

---

## 3. Configuration Tailwind (index.css)

Assurez-vous que votre fichier `src/index.css` contient ces définitions pour que le prompt fonctionne parfaitement :

```css
@theme {
  --color-primary: #2A2FCE;
  --color-primary-light: #4345d6;
  --color-primary-dark: #1E23A5;
  --color-background-light: #F4F5F8;
  --color-surface: #FFFFFF;
  --color-text-main: #111827;
  --color-text-body: #374151;
  --color-text-muted: #6B7280;
  --color-border-soft: #E5E7EB;
  --color-success: #10B981;
  --color-danger: #EF4444;
}
```

---

*Note : Ce guide a été généré pour assurer une transition fluide vers le nouveau design "Oraimo Style" de NEWOTEG SARL.*
