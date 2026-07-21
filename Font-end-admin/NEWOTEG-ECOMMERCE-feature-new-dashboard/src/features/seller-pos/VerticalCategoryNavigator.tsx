import { useState } from 'react';
import { ChevronDown, Clock3, LayoutGrid, Layers3, Star } from 'lucide-react';

export interface SellerCategoryOption {
  id: string;
  label: string;
  count: number;
}

interface VerticalCategoryNavigatorProps {
  categories: SellerCategoryOption[];
  selectedCategoryId: string;
  selectedView: 'all' | 'favorites' | 'recent';
  favoriteCount: number;
  onSelectCategory: (categoryId: string) => void;
  onSelectView: (view: 'favorites' | 'recent') => void;
}

export function VerticalCategoryNavigator({
  categories,
  selectedCategoryId,
  selectedView,
  favoriteCount,
  onSelectCategory,
  onSelectView,
}: VerticalCategoryNavigatorProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const allProductsCount = categories.reduce((total, category) => total + category.count, 0);
  const selectedCategory = categories.find(category => category.id === selectedCategoryId);
  const selectedLabel = selectedView === 'favorites'
    ? 'Favoris'
    : selectedView === 'recent'
      ? 'Récents'
      : selectedCategory?.label || 'Tous les produits';

  const selectCategory = (categoryId: string) => {
    onSelectCategory(categoryId);
    setMobileOpen(false);
  };

  const selectView = (view: 'favorites' | 'recent') => {
    onSelectView(view);
    setMobileOpen(false);
  };

  const navigationContent = (
    <>
      <button
        type="button"
        onClick={() => selectCategory('all')}
        aria-label={`Tous les produits (${allProductsCount} articles)`}
        aria-pressed={selectedView === 'all' && selectedCategoryId === 'all'}
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
          selectedView === 'all' && selectedCategoryId === 'all'
            ? 'bg-indigo-50 text-primary'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
        }`}
      >
        <LayoutGrid size={17} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-bold">Tous les produits</span>
        <span className="shrink-0 text-xs font-semibold text-slate-400">{allProductsCount}</span>
      </button>

      {categories.map(category => {
        const active = selectedView === 'all' && selectedCategoryId === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => selectCategory(category.id)}
            aria-label={`${category.label} (${category.count} articles)`}
            aria-pressed={active}
            className={`group flex min-h-11 w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-left transition-colors ${
              active
                ? 'border-primary bg-indigo-50 text-primary'
                : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={category.label}>{category.label}</span>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${active ? 'bg-white text-primary' : 'bg-slate-100 text-slate-500'}`}>
              {category.count}
            </span>
          </button>
        );
      })}

      <div className="my-2 border-t border-slate-100" />
      <button
        type="button"
        onClick={() => selectView('favorites')}
        aria-pressed={selectedView === 'favorites'}
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
          selectedView === 'favorites' ? 'bg-amber-50 text-amber-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
        }`}
      >
        <Star size={17} className="shrink-0" />
        <span className="flex-1 text-sm font-semibold">Favoris</span>
        <span className="text-xs font-semibold text-slate-400">{favoriteCount}</span>
      </button>
      <button
        type="button"
        onClick={() => selectView('recent')}
        aria-pressed={selectedView === 'recent'}
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
          selectedView === 'recent' ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
        }`}
      >
        <Clock3 size={17} className="shrink-0" />
        <span className="flex-1 text-sm font-semibold">Récents</span>
      </button>
    </>
  );

  return (
    <>
      <section className="md:hidden" aria-label="Choisir une catégorie">
        <button
          type="button"
          onClick={() => setMobileOpen(open => !open)}
          aria-label={`Catégories : ${selectedLabel}`}
          aria-expanded={mobileOpen}
          aria-controls="seller-mobile-categories"
          className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left text-slate-800 shadow-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-primary">
            <Layers3 size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Catégorie</span>
            <span className="block truncate text-sm font-bold">{selectedLabel}</span>
          </span>
          <ChevronDown size={19} className={`shrink-0 text-slate-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>
        {mobileOpen && (
          <div id="seller-mobile-categories" className="relative mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-extrabold text-slate-900">Catégories de la boutique</p>
              <p className="text-xs text-slate-500">Faites défiler pour afficher toute la liste.</p>
            </div>
            <nav data-testid="seller-category-scroll-mobile" className="max-h-[min(50vh,24rem)] space-y-0.5 overflow-y-auto overscroll-contain p-2" aria-label="Catégories du catalogue mobile">
              {navigationContent}
            </nav>
          </div>
        )}
      </section>

      <aside className="sticky top-3 hidden self-start overflow-hidden rounded-xl border border-slate-200 bg-white md:block" aria-label="Catégories du catalogue">
        <div className="border-b border-slate-100 px-3 py-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Layers3 size={17} className="text-primary" />
            <h3 className="text-sm font-extrabold">Catégories</h3>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">Faites défiler toute la boutique</p>
        </div>
        <nav data-testid="seller-category-scroll-desktop" className="max-h-[calc(100vh-13rem)] space-y-0.5 overflow-y-auto overscroll-contain p-2" aria-label="Liste verticale des catégories">
          {navigationContent}
        </nav>
      </aside>
    </>
  );
}
