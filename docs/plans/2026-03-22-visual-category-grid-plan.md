# Plan d'Implémentation : Visual Category Grid

**Objectif :** Intégrer une grille visuelle de catégories sur la page Catalogue pour faciliter la navigation rapide par images, affichée uniquement lorsqu'aucune catégorie ou recherche n'est active.

**Architecture :** L'actuel composant `CategoryGrid` sera modifié de manière défensive pour accepter une propriété `mode` ('home' ou 'catalogue'). Sur la page d'accueil, il gardera son comportement par tronçons avec un bouton "Charger plus". Dans le catalogue, il affichera instantanément la grille complète. La route des catégories sera corrigée (`categorie=` devient `category=`). Le composant `Catalogue` basculera dynamiquement entre l'affichage de la grille Visuelle ou la Grille de Produits.

**Pile Technologique (Tech Stack) :** React, SCSS, React-Router.

---

### Tâche 1 : Mettre à jour CategoryGrid.jsx pour le multi-mode

**Fichiers :**
- Modifier : `c:/Users/Donald/OneDrive/Bureau/e-commerce-papa/NEWOTEG-ECOMMERCE-main (1)/Font-end/src/components/CategoryGrid/CategoryGrid.jsx`

**Étape 1 : Implémenter le code minimal**

```jsx
// 1. Ajouter la props `mode = 'home'`
const CategoryGrid = ({ mode = 'home' }) => {
    // ...
    // 2. Modifier la liste affichée :
    const displayedCategories = mode === 'catalogue' ? categories : categories.slice(0, visibleCount);
    
    // ...
    // 3. Masquer le Header si mode catalogue
    {mode === 'home' && (
        <div className="category-section__header">
            <h2 className="category-section__title">{t('home.categoriesTitle')}</h2>
            <Link to="/catalogue" className="category-section__view-all">{t('home.exploreCatalogue')}</Link>
        </div>
    )}
    
    // 4. Corriger le paramètre d'URL dans le Link :
    <Link to={`/catalogue?category=${cat.id}`} ...>
    
    // 5. Masquer le bouton "Show More" en mode catalogue
    {mode === 'home' && visibleCount < categories.length && (
        // bouton handleShowMore
    )}
```

**Étape 2 : Faire un Commit**

\`\`\`bash
git add Font-end/src/components/CategoryGrid/CategoryGrid.jsx
git commit -m "feat(UI): support custom modes in CategoryGrid & fix routing query param"
\`\`\`

---

### Tâche 2 : Refactorisation de la vue du Catalogue

**Fichiers :**
- Modifier : `c:/Users/Donald/OneDrive/Bureau/e-commerce-papa/NEWOTEG-ECOMMERCE-main (1)/Font-end/src/pages/Catalogue/Catalogue.jsx`

**Étape 1 : Implémenter le basculement Vue**

```jsx
import CategoryGrid from '../../components/CategoryGrid/CategoryGrid';

// Identifier l'état : a-t-on besoin de filtres ?
const isVisualGridMode = !selectedCategory && !searchQuery;

return (
    <div className="catalogue-page">
        <Helmet>...</Helmet>
        
        {/* Le Header (Breadcrumb, etc) reste visible */}
        <div className="catalogue-page__header">...</div>

        {/* CONDITION PRINCIPALE */}
        {isVisualGridMode ? (
            <div className="catalogue-page__visual-grid">
                <CategoryGrid mode="catalogue" />
            </div>
        ) : (
            <div className="catalogue-main">
                {/* On garde tout le contenu existant de la sidebar et de la grille produit */}
                <div className="catalogue-main__sidebar-wrapper">...</div>
                <div className="catalogue-main__content">...</div>
            </div>
        )}
    </div>
);
```

**Étape 2 : Faire un Commit**

\`\`\`bash
git add Font-end/src/pages/Catalogue/Catalogue.jsx
git commit -m "feat(UX): render visual CategoryGrid as default index for Catalogue page"
\`\`\`
