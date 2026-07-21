import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VerticalCategoryNavigator, type SellerCategoryOption } from './VerticalCategoryNavigator';

const categories: SellerCategoryOption[] = Array.from({ length: 12 }, (_, index) => ({
  id: `category-${index + 1}`,
  label: `Catégorie ${index + 1}`,
  count: (index + 1) * 3,
}));

describe('VerticalCategoryNavigator', () => {
  it('affiche toutes les catégories dans une liste verticale scrollable', () => {
    const onSelectCategory = vi.fn();
    render(
      <VerticalCategoryNavigator
        categories={categories}
        selectedCategoryId="all"
        selectedView="all"
        favoriteCount={2}
        onSelectCategory={onSelectCategory}
        onSelectView={vi.fn()}
      />,
    );

    const desktopList = screen.getByTestId('seller-category-scroll-desktop');
    expect(desktopList.className).toContain('overflow-y-auto');
    const lastCategory = within(desktopList).getByRole('button', { name: /Catégorie 12/ });
    fireEvent.click(lastCategory);
    expect(onSelectCategory).toHaveBeenCalledWith('category-12');
  });

  it('ouvre la liste verticale sur mobile puis la referme après le choix', () => {
    const onSelectCategory = vi.fn();
    render(
      <VerticalCategoryNavigator
        categories={categories}
        selectedCategoryId="all"
        selectedView="all"
        favoriteCount={0}
        onSelectCategory={onSelectCategory}
        onSelectView={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Catégories : Tous les produits/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);

    const mobileList = screen.getByTestId('seller-category-scroll-mobile');
    expect(mobileList.className).toContain('overflow-y-auto');
    fireEvent.click(within(mobileList).getByRole('button', { name: /Catégorie 10/ }));

    expect(onSelectCategory).toHaveBeenCalledWith('category-10');
    expect(screen.queryByTestId('seller-category-scroll-mobile')).toBeNull();
  });
});
