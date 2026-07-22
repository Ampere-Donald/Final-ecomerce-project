import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    admin: {
      id: 'cashier-test',
      nom: 'Caissier Test',
      username: 'caissier_test',
      role: 'CAISSIER',
    },
    logout: vi.fn(),
  }),
}));

describe('Sidebar for a cashier', () => {
  it('makes checkout primary and clearly separates cash opening and closing', () => {
    render(
      <MemoryRouter initialEntries={['/file-caissier']}>
        <Sidebar open onClose={vi.fn()} />
      </MemoryRouter>,
    );

    const checkoutLink = screen.getByRole('link', { name: 'Encaissement' });
    const cashSessionLink = screen.getByRole('link', { name: 'Session de caisse' });

    expect(checkoutLink.getAttribute('href')).toBe('/file-caissier');
    expect(cashSessionLink.getAttribute('href')).toBe('/caisse-jour');
    expect(screen.queryByRole('link', { name: 'Caisse du jour' })).toBeNull();
    expect(checkoutLink.compareDocumentPosition(cashSessionLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
