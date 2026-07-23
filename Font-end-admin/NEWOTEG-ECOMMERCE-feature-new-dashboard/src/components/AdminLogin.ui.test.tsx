import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLogin } from './AdminLogin';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginPin: vi.fn(),
}));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    login: authMocks.login,
    loginPin: authMocks.loginPin,
  }),
}));

vi.mock('../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({
    canInstall: false,
    promptInstall: vi.fn(),
  }),
}));

const renderLoginRoutes = () => render(
  <MemoryRouter initialEntries={['/login']}>
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/pos" element={<p>Destination vendeur</p>} />
      <Route path="/file-caissier" element={<p>Destination caissier</p>} />
      <Route path="/" element={<p>Destination administration</p>} />
    </Routes>
  </MemoryRouter>,
);

describe('AdminLogin role navigation', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  beforeEach(() => {
    authMocks.login.mockReset();
    authMocks.loginPin.mockReset();
  });

  it('opens the POS after a vendor password login', async () => {
    authMocks.login.mockResolvedValue({
      id: 'vendor-test',
      nom: 'Vendeur Test',
      username: 'vendeur_test',
      role: 'VENDEUR',
    });
    const user = userEvent.setup();
    renderLoginRoutes();

    await user.type(screen.getByPlaceholderText('ex. admin'), 'vendeur_test');
    await user.type(screen.getByPlaceholderText('Votre mot de passe'), 'mot-de-passe-test');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(authMocks.login).toHaveBeenCalledWith('vendeur_test', 'mot-de-passe-test');
    expect(await screen.findByText('Destination vendeur')).toBeTruthy();
  });

  it('opens checkout after a cashier PIN login', async () => {
    authMocks.loginPin.mockResolvedValue({
      id: 'cashier-test',
      nom: 'Caissier Test',
      username: 'caissier_test',
      role: 'CAISSIER',
    });
    const user = userEvent.setup();
    renderLoginRoutes();

    await user.type(screen.getByPlaceholderText('ex. admin'), 'caissier_test');
    await user.click(screen.getByRole('button', { name: 'PIN boutique' }));
    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '7' }));
    await user.click(screen.getByRole('button', { name: 'Entrer avec le PIN' }));

    expect(authMocks.loginPin).toHaveBeenCalledWith('caissier_test', '4827');
    expect(await screen.findByText('Destination caissier')).toBeTruthy();
  });

  it('distinguishes a network failure from an incorrect PIN', async () => {
    authMocks.loginPin.mockRejectedValue(new Error('Network unavailable'));
    const user = userEvent.setup();
    renderLoginRoutes();

    await user.type(screen.getByPlaceholderText('ex. admin'), 'caissier_test');
    await user.click(screen.getByRole('button', { name: 'PIN boutique' }));
    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '7' }));
    await user.click(screen.getByRole('button', { name: 'Entrer avec le PIN' }));

    expect(await screen.findByText(/Impossible de joindre le serveur/)).toBeTruthy();
    expect(screen.queryByText('PIN incorrect')).toBeNull();
  });
});
