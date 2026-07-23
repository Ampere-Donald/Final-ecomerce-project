import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

const authMocks = vi.hoisted(() => ({
  logout: vi.fn(),
}));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    admin: {
      id: 'cashier-test',
      nom: 'Caissier Test',
      username: 'caissier_test',
      role: 'CAISSIER',
    },
    logout: authMocks.logout,
  }),
}));

describe('Sidebar for a cashier', () => {
  beforeEach(() => {
    authMocks.logout.mockClear();
  });

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

  it('garde la déconnexion disponible dans la barre compacte tablette et desktop', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/file-caissier']}>
        <Sidebar open onClose={vi.fn()} compact />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(authMocks.logout).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });
});
