import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirstLoginCredentialChange } from './FirstLoginCredentialChange';

const mocks = vi.hoisted(() => ({
  refreshAdmin: vi.fn(),
  logout: vi.fn(),
  changePin: vi.fn(),
}));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    admin: {
      id: 'doris-seller',
      nom: 'Doris',
      username: 'doris_vendeur',
      role: 'VENDEUR',
      mustChangeCredential: true,
    },
    refreshAdmin: mocks.refreshAdmin,
    logout: mocks.logout,
  }),
}));

vi.mock('../services/api', () => ({
  adminAuthApi: { changePin: mocks.changePin, changePassword: vi.fn() },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

describe('changement obligatoire du PIN à la première connexion', () => {
  beforeEach(() => {
    mocks.changePin.mockReset();
    mocks.refreshAdmin.mockReset();
    mocks.logout.mockReset();
    mocks.changePin.mockResolvedValue({ message: 'PIN modifie avec succes' });
    mocks.refreshAdmin.mockResolvedValue({ mustChangeCredential: false });
  });

  it('bloque le parcours jusqu’à la création d’un PIN personnel', async () => {
    const user = userEvent.setup();
    render(<FirstLoginCredentialChange />);

    expect(screen.getByText('Bienvenue Doris')).toBeTruthy();
    await user.type(screen.getByLabelText('PIN temporaire'), '0000');
    await user.type(screen.getByLabelText('Nouveau PIN'), '4827');
    await user.type(screen.getByLabelText('Confirmer le nouveau PIN'), '4827');
    await user.click(screen.getByRole('button', { name: 'Enregistrer mon nouveau PIN' }));

    await waitFor(() => expect(mocks.changePin).toHaveBeenCalledWith('0000', '4827'));
    expect(mocks.refreshAdmin).toHaveBeenCalledTimes(1);
  });
});
