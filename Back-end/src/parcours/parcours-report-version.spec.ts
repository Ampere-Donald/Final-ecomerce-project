import { ParcoursService } from './parcours.service';
import { ParcoursController } from './parcours.controller';
describe('Report upgrade compatibility', () => {
  it('keeps the legacy event vocabulary unless version 2 is explicitly requested', async () => {
    const tx = {
      parcoursJour: { findMany: jest.fn(async (_query: any) => []) },
      parcoursAcquisitionJour: { groupBy: jest.fn(async () => []) },
      commande: { count: jest.fn(async () => 0) },
      demandeDevis: { count: jest.fn(async () => 0) },
      dossierIncompatibilite: { aggregate: jest.fn(async () => ({ _count: { _all: 0 }, _sum: { retourQuantite: null } })), count: jest.fn(async () => 0) },
    };
    const service = new ParcoursService({ $transaction: (callback: (v: unknown) => unknown) => callback(tx) } as never);
    const now = new Date('2026-10-28T12:00:00Z');
    await service.report('2026-10-27', '2026-10-27', now);
    expect(tx.parcoursAcquisitionJour.groupBy).not.toHaveBeenCalled();
    await service.report('2026-10-27', '2026-10-27', now, true);
    expect(tx.parcoursAcquisitionJour.groupBy).toHaveBeenCalledTimes(1);
  });
  it('rejects arbitrary report versions before reading data', () => {
    const report = jest.fn();
    const controller = new ParcoursController({ report } as never);
    expect(() => controller.report('2026-10-27', '2026-10-27', 'private')).toThrow();
    expect(report).not.toHaveBeenCalled();
    controller.report('2026-10-27', '2026-10-27', '2');
    expect(report).toHaveBeenCalledWith('2026-10-27', '2026-10-27', expect.any(Date), true);
  });
});
