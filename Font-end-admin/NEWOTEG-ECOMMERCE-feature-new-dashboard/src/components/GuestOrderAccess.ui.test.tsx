import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { GuestOrderAccess } from './GuestOrderAccess';

const api = vi.hoisted(() => ({ getGuestAccess: vi.fn(), revokeGuestAccess: vi.fn() }));
vi.mock('../services/api', () => ({ commandeApi: api, getApiErrorMessage: (_error: unknown, fallback: string) => fallback }));
const active = { state: 'ACTIVE', canRevoke: true, grant: { issuedAt: '2026-10-03T09:00:00Z', expiresAt: '2026-11-02T09:00:00Z', version: 3, revokedAt: null, reason: null }, channels: { email: false, sms: false } };
const revoked = { ...active, state: 'REVOKED', canRevoke: false, grant: { ...active.grant, version: 4, revokedAt: '2026-10-03T10:00:00Z', reason: 'Lien partagé par erreur' } };
beforeEach(() => vi.clearAllMocks());

async function prepare() {
  const user = userEvent.setup();
  await screen.findByText('Lien actif');
  await user.click(screen.getByRole('button', { name: 'Préparer la révocation de l’accès' }));
  await user.type(screen.getByLabelText('Motif de révocation'), 'Lien partagé par erreur');
  await user.click(screen.getByRole('checkbox'));
  return user;
}
it('requires explicit reason and confirmation, preserves current version and shows verified result', async () => {
  api.getGuestAccess.mockResolvedValueOnce(active).mockResolvedValue(revoked);
  api.revokeGuestAccess.mockResolvedValue({ revoked: true });
  render(<GuestOrderAccess orderId="order-1" />);
  const user = userEvent.setup();
  await screen.findByText('Lien actif');
  await user.click(screen.getByRole('button', { name: 'Préparer la révocation de l’accès' }));
  expect((screen.getByRole('button', { name: 'Révoquer l’accès invité' }) as HTMLButtonElement).disabled).toBe(true);
  await user.type(screen.getByLabelText('Motif de révocation'), 'Lien partagé par erreur');
  expect((screen.getByRole('button', { name: 'Révoquer l’accès invité' }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Révoquer l’accès invité' }));
  await screen.findByText('Accès révoqué');
  expect(api.revokeGuestAccess).toHaveBeenCalledExactlyOnceWith('order-1', { expectedVersion: 3, reason: 'Lien partagé par erreur' });
});
it('verifies a lost response without repeating a revocation', async () => {
  api.getGuestAccess.mockResolvedValueOnce(active).mockResolvedValue(revoked);
  api.revokeGuestAccess.mockRejectedValue(new Error('Network reset'));
  render(<GuestOrderAccess orderId="order-1" />);
  const user = await prepare();
  await user.click(screen.getByRole('button', { name: 'Révoquer l’accès invité' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('button', { name: 'Révoquer l’accès invité' }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Vérifier le résultat de la révocation' }));
  await screen.findByText('La révocation est confirmée.');
  expect(api.revokeGuestAccess).toHaveBeenCalledTimes(1);
});
it('requires fresh state after a stale-version rejection before preparing another attempt', async () => {
  api.getGuestAccess.mockResolvedValueOnce(active).mockResolvedValue({ ...active, grant: { ...active.grant, version: 4 } });
  api.revokeGuestAccess.mockRejectedValue({ response: { status: 409 } });
  render(<GuestOrderAccess orderId="order-1" />);
  const user = await prepare();
  await user.click(screen.getByRole('button', { name: 'Révoquer l’accès invité' }));
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'Vérifier le résultat de la révocation' }));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Révoquer l’accès invité' }) as HTMLButtonElement).disabled).toBe(false));
  api.revokeGuestAccess.mockResolvedValue({ revoked: true }); api.getGuestAccess.mockResolvedValue(revoked);
  await user.click(screen.getByRole('button', { name: 'Révoquer l’accès invité' }));
  expect(api.revokeGuestAccess.mock.calls[1]).toEqual(['order-1', { expectedVersion: 4, reason: 'Lien partagé par erreur' }]);
});
it.each(['LINKED', 'ACCOUNT', 'NO_ACCESS', 'REVOKED'])('does not offer revocation for %s', async (state) => {
  api.getGuestAccess.mockResolvedValue({ ...active, state, canRevoke: false });
  render(<GuestOrderAccess orderId="order-1" />);
  await waitFor(() => expect(api.getGuestAccess).toHaveBeenCalled());
  await screen.findByText('Email de récupération :', { exact: false });
  expect(screen.queryByRole('button', { name: 'Préparer la révocation de l’accès' })).toBeNull();
});
it('distinguishes a failed lookup from a missing guest access and permits retry', async () => {
  api.getGuestAccess.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(active);
  render(<GuestOrderAccess orderId="order-1" />);
  await screen.findByRole('alert');
  expect(screen.queryByText('Aucun accès invité')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Actualiser l’état de l’accès' }));
  await screen.findByText('Lien actif');
});
