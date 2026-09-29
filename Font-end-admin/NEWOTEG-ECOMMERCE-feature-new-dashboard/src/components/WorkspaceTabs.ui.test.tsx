import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Box, Receipt } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceTabs } from './WorkspaceTabs';

describe('WorkspaceTabs', () => {
  it('synchronise l’onglet avec l’URL et permet la navigation au clavier', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/stock-achats?tab=produits']}>
        <WorkspaceTabs
          eyebrow="Test"
          title="Stock & achats"
          description="Description"
          tabs={[
            { id: 'a-traiter', label: 'À traiter', icon: Receipt, content: <p>Priorités stock</p> },
            { id: 'produits', label: 'Produits', icon: Box, content: <p>Catalogue produit</p> },
          ]}
        />
      </MemoryRouter>,
    );

    const productsTab = screen.getByRole('tab', { name: 'Produits' });
    expect(productsTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Catalogue produit')).toBeTruthy();
    productsTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'À traiter' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Priorités stock')).toBeTruthy();
  });
});
