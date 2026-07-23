import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CashierDesktopTopBar } from './CashierDesktopShell';

const authMocks = vi.hoisted(() => ({
  logout: vi.fn(),
}));

vi.mock('../../context/AdminAuthContext', () => ({
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

vi.mock('../../services/api', () => ({
  caisseJourApi: {
    aujourdhui: vi.fn().mockResolvedValue({ statut: 'OUVERTE' }),
  },
}));

describe('CashierDesktopTopBar', () => {
  beforeEach(() => {
    authMocks.logout.mockClear();
  });

  it('affiche la déconnexion et ferme réellement la session après confirmation', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CashierDesktopTopBar caisseStatus="OUVERTE" />);

    expect(screen.getByText('Caissier Test')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(confirm).toHaveBeenCalledWith('Voulez-vous vraiment vous déconnecter de la caisse ?');
    expect(authMocks.logout).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });

  it('conserve la session lorsque le caissier annule', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<CashierDesktopTopBar caisseStatus="OUVERTE" />);

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(authMocks.logout).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
