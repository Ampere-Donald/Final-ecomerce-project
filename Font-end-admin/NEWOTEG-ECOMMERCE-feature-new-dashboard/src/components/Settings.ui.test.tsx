import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Settings } from './Settings';

const authMocks = vi.hoisted(() => ({
  logout: vi.fn(),
}));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    admin: {
      id: 'seller-1',
      nom: 'Vendeur Test',
      username: 'vendeur_test',
      email: null,
      role: 'VENDEUR',
    },
    logout: authMocks.logout,
  }),
}));

describe('Settings seller session', () => {
  beforeEach(() => {
    authMocks.logout.mockClear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('permet au vendeur de se déconnecter depuis son profil', () => {
    render(<Settings />);

    expect(screen.getByText('Session vendeur')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(window.confirm).toHaveBeenCalledWith('Voulez-vous vraiment vous déconnecter ?');
    expect(authMocks.logout).toHaveBeenCalledOnce();
  });

  it('annule la déconnexion si le vendeur refuse la confirmation', () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<Settings />);

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(authMocks.logout).not.toHaveBeenCalled();
  });
});
