import { cancelOrder, receiveOrder } from './order-transitions';
import { CommandeService } from './commande.service';

describe('Atomic order transitions', () => {
  it('claims ownership/status/version before returning stock', async () => {
    const tx = {
      commande: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      produit: { update: jest.fn() },
      mouvementStock: { create: jest.fn() },
    };
    await expect(
      cancelOrder(tx, 'order', { version: 2, clientId: 'owner' }),
    ).rejects.toThrow('Le statut a changé');
    expect(tx.commande.updateMany.mock.calls[0][0].where).toMatchObject({
      clientId: 'owner',
      version: 2,
    });
    expect(tx.produit.update).not.toHaveBeenCalled();
    expect(tx.mouvementStock.create).not.toHaveBeenCalled();
  });
  it('receipt loses cleanly if ownership, dispatch, delivery mode or version changed', async () => {
    const tx = {
      commande: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
      },
    };
    await expect(
      receiveOrder(tx, 'order', { version: 2, clientId: 'owner' }),
    ).rejects.toThrow('Le statut a changé');
    expect(tx.commande.updateMany.mock.calls[0][0].where).toMatchObject({
      clientId: 'owner',
      version: 2,
      statut: 'EN_LIVRAISON',
      modeReception: 'LIVRAISON',
    });
    expect(tx.commande.findUnique).not.toHaveBeenCalled();
  });
  it('does not record cash after a stale or concurrent pickup', async () => {
    const tx = {
      commande: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      caisse: { create: jest.fn() },
    };
    const db = {
      commande: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order',
          statut: 'CONFIRMEE',
          modeReception: 'RETRAIT_MAGASIN',
          version: 4,
        }),
      },
      $transaction: (fn: any) => fn(tx),
    };
    await expect(
      new CommandeService(db as any, {} as any, {} as any).processPickup(
        'order',
        { paiementSurPlace: true },
      ),
    ).rejects.toThrow('Le statut a changé');
    expect(tx.caisse.create).not.toHaveBeenCalled();
  });
  it.each(['ANNULEE', 'LIVREE'])(
    'does not reopen terminal %s orders using an admin status edit',
    async (statut) => {
      const db = {
        commande: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'order', statut, version: 2 }),
        },
        $transaction: jest.fn(),
      };
      await expect(
        new CommandeService(db as any, {} as any, {} as any).update('order', {
          statut: 'EN_ATTENTE',
        }),
      ).rejects.toThrow('terminée');
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
});
