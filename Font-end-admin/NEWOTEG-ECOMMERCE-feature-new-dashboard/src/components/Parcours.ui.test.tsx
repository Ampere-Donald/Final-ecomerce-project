import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  admin: { id: 'admin-1', role: 'ADMIN' },
  token: 'test-session-1',
}));
vi.mock('../services/api', () => ({ default: { get: mocks.get } }));
vi.mock('../context/AdminAuthContext', () => ({ useAdminAuth: () => ({ admin: mocks.admin }) }));
vi.mock('../services/adminSession', () => ({ getAdminToken: () => mocks.token }));
import { Parcours } from './Parcours';
import { defaultPeriod, type Period } from '../services/parcours';

function response(range: Period, count = 3) {
  return {
    data: {
      ...range,
      actif: false,
      fuseau: 'Africa/Douala',
      jourEnCours: false,
      observations: [],
      activite: {
        commandesSansProvenance: 0,
        commandesEnregistrees: count,
        devisDemandes: 0,
        livraisonsPeriode: 0,
        retraitsPeriode: 0,
      },
      cohorte: {
        commandesEnregistrees: count,
        livrees: 0,
        retirees: 0,
        tauxReception: count ? 0 : null,
      },
      retoursIncompatibilite: { disponible: false, nombre: null },
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin = { id: 'admin-1', role: 'ADMIN' };
  mocks.token = 'test-session-1';
  mocks.get.mockImplementation((_url: string, config: { params: Period }) =>
    Promise.resolve(response(config.params)),
  );
});
it('lit seulement deux périodes authentifiées et distingue résultats, observations désactivées et registre absent', async () => {
  render(<Parcours />);
  await screen.findByRole('table', { name: 'Comparaison des résultats métier' });
  expect(mocks.get).toHaveBeenCalledTimes(2);
  for (const call of mocks.get.mock.calls) {
    expect(call[0]).toBe('/parcours/rapport');
    expect(Object.keys(call[1].params).sort()).toEqual(['debut', 'fin']);
    expect(call[1].signal).toBeInstanceOf(AbortSignal);
  }
  expect(screen.getByText(/Collecte actuellement désactivée/)).toBeTruthy();
  expect(screen.getByText(/Retours pour incompatibilité : non mesurables/)).toBeTruthy();
  expect(screen.getByText(/ni des visiteurs uniques/)).toBeTruthy();
  const table = screen.getByRole('table', { name: 'Comparaison des résultats métier' });
  expect(
    within(table).getByRole('row', { name: /Commandes web enregistrées/ }).textContent,
  ).toContain('330');
  expect(localStorage.getItem('parcours')).toBeNull();
});
it('masque une lecture ancienne sous des dates éditées et ignore une réponse annulée après nouvelle comparaison', async () => {
  render(<Parcours />);
  await screen.findByRole('table', { name: 'Comparaison des résultats métier' });
  const requests: { resolve: (value: unknown) => void; params: Period; signal: AbortSignal }[] = [];
  mocks.get.mockImplementation(
    (_url: string, config: { params: Period; signal: AbortSignal }) =>
      new Promise((resolve) => requests.push({ resolve, ...config })),
  );
  fireEvent.change(screen.getByLabelText('Du'), { target: { value: '2026-08-01' } });
  fireEvent.change(screen.getByLabelText('Au'), { target: { value: '2026-08-07' } });
  expect(screen.queryByRole('table')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Comparer' }));
  await waitFor(() => expect(requests).toHaveLength(2));
  mocks.get.mockImplementation((_url: string, config: { params: Period }) =>
    Promise.resolve(response(config.params, 7)),
  );
  fireEvent.change(screen.getByLabelText('Du'), { target: { value: '2026-08-08' } });
  fireEvent.change(screen.getByLabelText('Au'), { target: { value: '2026-08-14' } });
  await userEvent.click(screen.getByRole('button', { name: 'Comparer' }));
  await screen.findByRole('table', { name: 'Comparaison des résultats métier' });
  expect(requests.every((request) => request.signal.aborted)).toBe(true);
  await act(async () => {
    requests.forEach((request) => request.resolve(response(request.params, 99)));
  });
  const row = within(
    screen.getByRole('table', { name: 'Comparaison des résultats métier' }),
  ).getByRole('row', { name: /Commandes web enregistrées/ });
  expect(row.textContent).toContain('770');
  expect(row.textContent).not.toContain('99');
});
it('ne remplace pas une panne partielle par zéro, cache le précédent résultat et permet une reprise', async () => {
  render(<Parcours />);
  await screen.findByRole('table', { name: 'Comparaison des résultats métier' });
  mocks.get
    .mockResolvedValueOnce(response(defaultPeriod()))
    .mockRejectedValueOnce(new Error('private backend details'));
  await userEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('table')).toBeNull();
  expect(screen.getByRole('alert').textContent).not.toContain('private backend');
  await userEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
  await screen.findByRole('table', { name: 'Comparaison des résultats métier' });
});
it('rejette une période invalide avant requête et affiche le jour incomplet sur un rapport valide', async () => {
  render(<Parcours />);
  await screen.findByRole('table', { name: 'Comparaison des résultats métier' });
  const calls = mocks.get.mock.calls.length;
  fireEvent.change(screen.getByLabelText('Du'), { target: { value: '2026-08-08' } });
  fireEvent.change(screen.getByLabelText('Au'), { target: { value: '2026-08-07' } });
  await userEvent.click(screen.getByRole('button', { name: 'Comparer' }));
  await screen.findByRole('alert');
  expect(mocks.get).toHaveBeenCalledTimes(calls);
  fireEvent.change(screen.getByLabelText('Du'), { target: { value: '2026-08-01' } });
  mocks.get.mockImplementation((_url: string, config: { params: Period }) =>
    Promise.resolve({ data: { ...response(config.params).data, jourEnCours: true } }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Comparer' }));
  await screen.findByText(/Cette journée est incomplète/);
});
it('efface le rapport sur changement de session et refuse les rôles de comptoir sans requête', async () => {
  const view = render(<Parcours />);
  await screen.findByRole('table', { name: 'Comparaison des résultats métier' });
  mocks.get.mockImplementation(() => new Promise(() => {}));
  mocks.token = 'test-session-2';
  view.rerender(<Parcours />);
  expect(screen.queryByRole('table')).toBeNull();
  await screen.findByText('Lecture des deux périodes…');
  const calls = mocks.get.mock.calls.length;
  mocks.admin = { id: 'seller', role: 'VENDEUR' };
  view.rerender(<Parcours />);
  expect(screen.getByRole('alert').textContent).toContain('réservé aux administrateurs');
  expect(mocks.get).toHaveBeenCalledTimes(calls);
});
