import { customerOrder } from './customer-order';
import { CommandeController } from './commande.controller';
const order = {
  id: 'order',
  clientId: 'owner',
  numeroSuivi: 'CMD-TEST',
  montantTotal: 2800,
  client: { motDePasse: 'PRIVATE', otpCode: 'PRIVATE' },
  requests: [{ fingerprint: 'PRIVATE' }],
  lignes: [
    {
      produitId: 'part',
      prixUnitaire: 2800,
      quantite: 1,
      sousTotal: 2800,
      produit: {
        id: 'part',
        nomProduit: 'Cable',
        code: 'REF-N',
        imageUrl: '/image.webp',
        cmupActuel: 'PRIVATE',
        dernierFournisseurId: 'PRIVATE',
        prixGros: 'PRIVATE',
        quantiteStock: 99,
        futurePrivateField: 'PRIVATE',
      },
    },
  ],
};
describe('Customer order projection', () => {
  it('keeps historical line prices and thumbnails but omits costs, stock, relations and future private fields', () => {
    const projected = customerOrder(order);
    expect(projected.lignes[0]).toMatchObject({
      prixUnitaire: 2800,
      produit: { id: 'part', code: 'REF-N', imageUrl: '/image.webp' },
    });
    expect(JSON.stringify(projected)).not.toContain('PRIVATE');
    expect(projected.lignes[0].produit).not.toHaveProperty('quantiteStock');
    expect(order.lignes[0].produit.cmupActuel).toBe('PRIVATE');
  });
  it('projects every customer route including guest checkout and its replay, preserving token and public identity', async () => {
    const service: any = {
      create: jest.fn().mockResolvedValue(order),
      createWithAccount: jest.fn().mockResolvedValue({
        commande: order,
        access_token: 'test-token',
        user: { id: 'owner' },
      }),
      findByClient: jest.fn().mockResolvedValue([order]),
      findOne: jest.fn().mockResolvedValue(order),
      cancel: jest.fn().mockResolvedValue(order),
      confirmReception: jest.fn().mockResolvedValue(order),
    };
    const controller = new CommandeController(service),
      req = { user: { id: 'owner' } };
    const results = [
      await controller.create({} as any, req),
      await controller.checkout({} as any),
      await controller.myOrders(req),
      await controller.cancel(req, 'order'),
      await controller.confirmReception(req, 'order'),
    ];
    for (const result of results)
      expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(results[1]).toMatchObject({
      access_token: 'test-token',
      user: { id: 'owner' },
    });
    service.createWithAccount.mockResolvedValue({ commande: order });
    expect(await controller.checkout({} as any)).toEqual({
      commande: customerOrder(order),
    });
  });
});
