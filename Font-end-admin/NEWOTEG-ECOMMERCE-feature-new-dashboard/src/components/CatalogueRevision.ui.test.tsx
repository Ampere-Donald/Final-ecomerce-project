import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { CatalogueRevision } from './CatalogueRevision';
const api = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), categories: vi.fn(), equipe: vi.fn(), action: vi.fn() }));
vi.mock('../features/catalogue-revision/api', async original => ({ ...await original<typeof import('../features/catalogue-revision/api')>(), revisionApi: api }));
vi.mock('../context/AdminAuthContext', () => ({ useAdminAuth: () => ({ admin: { id: 'admin1', nom: 'Admin', role: 'ADMIN' } }) }));
vi.mock('../context/FlowShellContext', () => ({ useFlowShellFocus: vi.fn() }));
vi.mock('../services/api', () => ({ getApiErrorMessage: (_err: unknown, fallback: string) => fallback }));
const first = { id: 'p1', nomProduit: 'Article A', prixDetail: 1500, prixDemiGros: 1200, prixGros: 1000, prixPromo: null, finPromo: null, quantiteGros: null, quantiteStock: 4, categorieId: 'c1', sousCategorieId: null, categorie: { nom: 'Composants' }, prixRevision: 1, classementRevision: 1, commercialRevision: 1, prixVerifieRevision: null, classementVerifieRevision: null, estActif: true };
const second = { ...first, id: 'p2', nomProduit: 'Article B' };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  api.categories.mockResolvedValue([{ id: 'c1', nom: 'Composants', sousCategories: [] }]); api.equipe.mockResolvedValue([]);
  api.list.mockResolvedValue({ data: [first, second], total: 2, page: 1, lastPage: 1, counts: { A_VERIFIER: 2 } });
  api.detail.mockImplementation(async id => ({ produit: id === first.id ? first : second, propositions: [], historique: [] }));
  api.action.mockImplementation(async () => { api.list.mockResolvedValue({ data: [second], total: 1, page: 1, lastPage: 1, counts: { A_VERIFIER: 1 } }); return {}; });
});
it('enchaîne la vérification de plusieurs articles et conserve le filtre de catégorie', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/revision-catalogue?categorieId=c1']}><CatalogueRevision /></MemoryRouter>);
  await screen.findByText('2 article(s) · actualisation toutes les 10 s');
  await user.click(screen.getByRole('button', { name: 'Commencer la vérification' }));
  await screen.findByRole('heading', { name: 'Article A' });
  await user.click(screen.getByRole('button', { name: /Valider et suivant/ }));
  await screen.findByRole('heading', { name: 'Article B' });
  expect(api.action).toHaveBeenCalledWith('p1', expect.objectContaining({ action: 'VALIDER', sujet: 'PRIX' }));
  expect(api.list).toHaveBeenLastCalledWith({ categorieId: 'c1' });
  await user.click(screen.getByRole('button', { name: /Liste/ }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Révision du catalogue' })).toBeTruthy());
});

it('ouvre directement le premier article de la page suivante en conservant les filtres', async () => {
  const user = userEvent.setup();
  api.list.mockImplementation(async params => ({
    data: params.page === '2' ? [second] : [first],
    total: 2, page: params.page === '2' ? 2 : 1, lastPage: 2,
    counts: { A_VERIFIER: 2 },
  }));
  render(<MemoryRouter initialEntries={['/revision-catalogue?categorieId=c1']}><CatalogueRevision /></MemoryRouter>);
  await screen.findByText('2 article(s) · actualisation toutes les 10 s');
  await user.click(screen.getByRole('button', { name: 'Commencer la vérification' }));
  await screen.findByRole('heading', { name: 'Article A' });
  await user.click(screen.getByRole('button', { name: /Passer/ }));
  await screen.findByRole('heading', { name: 'Article B' });
  expect(api.list).toHaveBeenCalledWith({ categorieId: 'c1', page: '2' });
  expect(api.action).not.toHaveBeenCalled();
});
