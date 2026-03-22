# Visual Category Grid Design 

## Objective
Implement a "Visual Category Grid" on the Catalogue page to replace the default "All Products" view. This addresses the user's request to allow quick, visual navigation into specific hardware families rather than exposing the user to an overwhelming list of unsorted products upon first visit.

## Architecture & Components
1. **Catalogue Page State Logic**:
   - When `!selectedCategory && !searchQuery` -> Render `<CategoryGrid mode="catalogue" />`.
   - When `selectedCategory || searchQuery` -> Render the standard Product Grid / Table view.
2. **CategoryGrid Component Modification**:
   - Enhance the existing `CategoryGrid.jsx` to support a `mode` prop (`'home'` vs `'catalogue'`).
   - In `mode="home"`, it will display a limited number of categories (e.g. 6) and include the "Explore Catalogue" link.
   - In `mode="catalogue"`, it will display ALL categories without the "Show More" wrapper, filling the page as a visual index.
   - **Bug Fix**: Fix the URL mismatch bug where clicking a category points to `?categorie=X` instead of `?category=X` so routing works flawlessly.

## UX Flow
1. User clicks "Catalogue" in the main navigation.
2. The URL navigates to `/catalogue`.
3. The page renders a premium grid of Category Cards (`category-card-premium`) with placeholder or API images.
4. User clicks "Accessoires électriques".
5. The URL updates to `/catalogue?category=accessoires-electriques`.
6. The Catalogue page state immediately replaces the grid with the product list, applying the category filter.

## Next Steps
Proceed to the PLANNING phase to update `implementation_plan.md` and then EXECUTION to build this logic into `Catalogue.jsx` and `CategoryGrid.jsx`.
