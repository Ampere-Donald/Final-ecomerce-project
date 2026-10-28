import { previousOrder } from './order-request';
import { ConflictException } from '@nestjs/common';
describe('Order source and idempotency', () => {
  it('preserves the old fingerprint and rejects a changed channel on the same attempt', async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'isolated-test-key';
    let fingerprint: unknown;
    const tx = { $executeRaw: jest.fn(async (_sql, _id, hash) => {
      if (fingerprint) return 0;
      fingerprint = hash; return 1;
    }), $queryRaw: jest.fn(async () => [{ fingerprint, commande_id: 'order' }]), commande: { findUniqueOrThrow: jest.fn(async () => ({ id: 'order' })) } };
    const dto = { requestId: '00000000-0000-4000-8000-000000000001', nomClient: 'Synthetic', telephone: '000000', adresseLivraison: 'Fixture', modeReception: 'RETRAIT_MAGASIN', montantTotal: 10, lignes: [{ produitId: 'p', quantite: 1, prixUnitaire: 10 }] } as never;
    try {
      expect(await previousOrder(tx, dto, 'standard')).toBeNull();
      expect(await previousOrder(tx, dto, 'standard')).toEqual({ id: 'order' });
      await expect(previousOrder(tx, { ...dto as object, canalEntree: 'SOCIAL' } as never, 'standard')).rejects.toBeInstanceOf(ConflictException);
      fingerprint = undefined;
      const sourced = { ...dto as object, canalEntree: 'RECHERCHE_NATURELLE' } as never;
      expect(await previousOrder(tx, sourced, 'standard')).toBeNull();
      expect(await previousOrder(tx, sourced, 'standard')).toEqual({ id: 'order' });
      await expect(previousOrder(tx, { ...sourced as object, canalEntree: 'SOCIAL' } as never, 'standard')).rejects.toBeInstanceOf(ConflictException);
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
    }
  });
});
