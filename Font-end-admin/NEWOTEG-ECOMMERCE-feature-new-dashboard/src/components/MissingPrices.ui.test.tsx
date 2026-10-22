import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MissingPrices } from './MissingPrices';
import {
  cataloguePricingApi,
  parseFcfaInput,
  type PricingResult,
} from '../services/cataloguePricing';
import { can } from '../utils/permissions';

vi.mock('../services/cataloguePricing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/cataloguePricing')>()),
  cataloguePricingApi: { list: vi.fn(), complete: vi.fn() },
}));
const toast = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('./ui/Toast', () => ({ useToast: () => toast }));

const item = {
  estActif: true,
  id: 'p1',
  version: 4,
  nomProduit: 'Condensateur 1000 µF',
  marque: 'Test',
  code: 'COND-1000',
  imageUrl: null,
  prixDetail: null,
  prixGros: null,
  prixDemiGros: null,
  quantiteStock: 20,
  categorie: { id: 'c1', nom: 'Condensateurs' },
};
const makeResult = (): PricingResult => ({
  data: [{ ...item }],
  total: 1,
  page: 1,
  limit: 18,
  totalPages: 1,
  summary: { totalCount: 10, missingCount: 1, pricedCount: 9 },
  categories: [{ id: 'c1', nom: 'Condensateurs', count: 1 }],
  recentActivity: [],
});

describe('Prix à renseigner', () => {
  let result: PricingResult;
  beforeEach(() => {
    vi.clearAllMocks();
    result = makeResult();
    vi.mocked(cataloguePricingApi.list).mockImplementation(async () => result);
    vi.mocked(cataloguePricingApi.complete).mockImplementation(async () => {
      result = {
        ...result,
        data: [],
        total: 0,
        summary: { totalCount: 10, missingCount: 0, pricedCount: 10 },
      };
      return { prixDetail: 1500 };
    });
  });

  it('enregistre un prix, retire l’article de la file et affiche la fin du travail', async () => {
    const user = userEvent.setup();
    render(<MissingPrices />);
    const article = await screen.findByRole('article', {
      name: item.nomProduit,
    });
    await user.type(within(article).getByLabelText(/Prix détail/), '1 500');
    await user.click(
      within(article).getByRole('button', {
        name: `Enregistrer le prix de ${item.nomProduit}`,
      }),
    );
    await screen.findByText('Tous les prix sont renseignés');
    expect(cataloguePricingApi.complete).toHaveBeenCalledWith('p1', {
      prixDetail: 1500,
      version: 4,
    });
    expect(screen.queryByRole('article', { name: item.nomProduit })).toBeNull();
    expect(toast.success).toHaveBeenCalled();
  });

  it('permet une recherche et une catégorie sans perdre les choix affichés', async () => {
    const user = userEvent.setup();
    render(<MissingPrices />);
    await screen.findByRole('article', { name: item.nomProduit });
    await user.type(screen.getByRole('searchbox'), 'COND');
    await waitFor(() =>
      expect(cataloguePricingApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'COND' }),
        expect.any(AbortSignal),
      ),
    );
    await user.click(screen.getByRole('button', { name: /Condensateurs.*1/ }));
    await waitFor(() =>
      expect(cataloguePricingApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoryId: 'c1' }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('explique un conflit concurrent et ne relance aucune écriture', async () => {
    const user = userEvent.setup();
    vi.mocked(cataloguePricingApi.complete).mockRejectedValue({
      response: {
        status: 409,
        data: { message: 'Un prix a déjà été renseigné.' },
      },
    });
    render(<MissingPrices />);
    const article = await screen.findByRole('article', {
      name: item.nomProduit,
    });
    await user.type(within(article).getByLabelText(/Prix détail/), '1500');
    await user.click(
      within(article).getByRole('button', {
        name: `Enregistrer le prix de ${item.nomProduit}`,
      }),
    );
    await screen.findByRole('alert');
    expect(cataloguePricingApi.complete).toHaveBeenCalledTimes(1);
    expect(
      screen.getAllByText('Un prix a déjà été renseigné.').length,
    ).toBeGreaterThan(0);
  });

  it('retrouve une saisie non enregistrée après un changement de filtre', async () => {
    const user = userEvent.setup();
    vi.mocked(cataloguePricingApi.list).mockImplementation(async params => params?.search === 'autre' ? { ...result, data: [], total: 0 } : result);
    render(<MissingPrices />);
    const article = await screen.findByRole('article', { name: item.nomProduit });
    await user.type(within(article).getByLabelText(/Prix détail/), '1500');
    await user.type(screen.getByRole('searchbox'), 'autre');
    await screen.findByText('Aucun article pour ces filtres');
    await user.clear(screen.getByRole('searchbox'));
    const restored = await screen.findByRole('article', { name: item.nomProduit });
    expect((within(restored).getByLabelText(/Prix détail/) as HTMLInputElement).value).toBe('1500');
    expect(cataloguePricingApi.complete).not.toHaveBeenCalled();
  });

  it('conserve la saisie quand le serveur échoue et propose de réessayer', async () => {
    const user = userEvent.setup();
    vi.mocked(cataloguePricingApi.complete).mockRejectedValue(
      new Error('offline'),
    );
    render(<MissingPrices />);
    const article = await screen.findByRole('article', {
      name: item.nomProduit,
    });
    const input = within(article).getByLabelText(
      /Prix détail/,
    ) as HTMLInputElement;
    await user.type(input, '1500');
    await user.click(
      within(article).getByRole('button', {
        name: `Enregistrer le prix de ${item.nomProduit}`,
      }),
    );
    await screen.findByRole('alert');
    expect(input.value).toBe('1500');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('refuse un montant ambigu avant de contacter le serveur', async () => {
    const user = userEvent.setup();
    render(<MissingPrices />);
    const article = await screen.findByRole('article', {
      name: item.nomProduit,
    });
    await user.type(within(article).getByLabelText(/Prix détail/), '1e3');
    await user.click(
      within(article).getByRole('button', {
        name: `Enregistrer le prix de ${item.nomProduit}`,
      }),
    );
    await screen.findByRole('alert');
    expect(cataloguePricingApi.complete).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'SUPER_ADMIN', 'VENDEUR', 'CAISSIER', 'MANAGER'])(
    'ouvre le chantier au rôle %s',
    (role) => {
      expect(can.renseignerPrixManquants(role)).toBe(true);
    },
  );
  it.each(['', '1e3', '1,5', '-1', '0', 'Infinity'])('rejette %s', (value) => {
    expect(parseFcfaInput(value)).toBeNull();
  });
});
