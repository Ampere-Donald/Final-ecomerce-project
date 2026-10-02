import { CommandeService } from './commande.service';
import { CommandeController } from './commande.controller';
import { OptionalClientAuthGuard } from '../auth/optional-client-auth.guard';
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('FAKE-HASH') }));
const product = {
  id: 'p1',
  nomProduit: 'Catalogue name',
  prixDetail: '3500',
  quantiteStock: 5,
};
const dto: any = {
  nomClient: 'Client QA',
  telephone: '600000000',
  adresseLivraison: 'Akwa',
  modeReception: 'RETRAIT_MAGASIN',
  montantTotal: 3500,
  email: 'qa@example.invalid',
  motDePasse: 'QAonly123',
  lignes: [
    {
      produitId: 'p1',
      nomProduit: 'Untrusted name',
      quantite: 1,
      prixUnitaire: 3500,
    },
  ],
};
function fixture() {
  const tx = {
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    ligneTicket: { groupBy: jest.fn().mockResolvedValue([]) },
    produit: {
      findUnique: jest.fn().mockResolvedValue(product),
      findMany: jest.fn().mockResolvedValue([product]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
    client: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'qa-user', nom: 'Client QA' }),
    },
    commande: {
      create: jest
        .fn()
        .mockImplementation(async ({ data }) => ({ id: 'qa-order', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn(),
    },
    mouvementStock: { create: jest.fn() },
  };
  const db = {
    $transaction: jest.fn(async (callback) => callback(tx)),
    commande: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'qa-order', statut: 'EN_ATTENTE' }),
    },
  };
  const service = new CommandeService(
    db as any,
    { create: jest.fn().mockResolvedValue({}) } as any,
    { signToken: jest.fn().mockReturnValue('QA-token') } as any,
  );
  return { tx, db, service };
}
describe('Checkout transaction and ownership', () => {
  it('creates the account inside the transaction after price acceptance and uses canonical values', async () => {
    const { service, tx } = fixture();
    const result = await service.createWithAccount(dto);
    expect(tx.client.create).toHaveBeenCalledTimes(1);
    expect(result.commande.montantTotal).toBe(3500);
    expect(
      tx.commande.create.mock.calls[0][0].data.lignes.create[0].nomProduit,
    ).toBe(product.nomProduit);
    expect(tx.produit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1', estActif: true, quantiteStock: { gte: 1 } },
      }),
    );
  });
  it('does not create an account or order on a stale price', async () => {
    const { service, tx } = fixture();
    await expect(
      service.createWithAccount({ ...dto, montantTotal: 1 }),
    ).rejects.toThrow();
    expect(tx.client.create).not.toHaveBeenCalled();
    expect(tx.commande.create).not.toHaveBeenCalled();
  });
  it('aborts on concurrent stock loss instead of returning confirmation', async () => {
    const { service, tx } = fixture();
    tx.produit.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.createWithAccount(dto)).rejects.toThrow(
      'Stock insuffisant',
    );
    expect(tx.mouvementStock.create).not.toHaveBeenCalled();
  });
  it('does not restore stock twice when cancellation loses the status race', async () => {
    const { service, tx } = fixture();
    await expect(service.cancel('qa-order')).rejects.toThrow(
      'Le statut a changé',
    );
    expect(tx.produit.update).not.toHaveBeenCalled();
  });
  it('derives ownership from JWT and discards public claimed ownership', async () => {
    const service = {
      create: jest.fn(),
      createWithAccount: jest.fn().mockResolvedValue({ commande: { id: 'qa-order', lignes: [] } }),
      findOne: jest.fn().mockResolvedValue({ clientId: null }),
      cancel: jest.fn(),
    };
    const controller = new CommandeController(service as any);
    await controller.create(
      { ...dto, clientId: 'victim' },
      { user: { id: 'real-user' } },
    );
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'real-user' }),
    );
    await controller.checkout({ ...dto, clientId: 'victim' });
    expect(service.createWithAccount).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: undefined }),
    );
    await expect(
      controller.cancel({ user: { id: 'real-user' } }, 'qa-order'),
    ).rejects.toThrow('ne vous appartient pas');
    expect(service.cancel).not.toHaveBeenCalled();
  });
  it('allows a missing token for legacy guest calls but rejects a supplied invalid token', () => {
    const guard = new OptionalClientAuthGuard();
    const context = (authorization?: string) => ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization } }),
      }),
    });
    expect(guard.handleRequest(null, null, null, context())).toBeNull();
    expect(() =>
      guard.handleRequest(null, null, null, context('Bearer invalid')),
    ).toThrow();
    expect(
      guard.handleRequest(
        null,
        { id: 'real-user' },
        null,
        context('Bearer valid'),
      ),
    ).toEqual({ id: 'real-user' });
  });
});
