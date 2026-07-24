import { BadRequestException } from '@nestjs/common';
import { CaisseJourService } from './caisse-jour.service';

describe('CaisseJourService', () => {
  let db: any;
  let notifications: any;
  let service: CaisseJourService;

  beforeEach(() => {
    const tx = {
      caisseJour: {
        update: jest.fn().mockResolvedValue({
          id: 'jour-1',
          statut: 'FERMEE',
          date: new Date('2026-07-24'),
        }),
      },
      coffre: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'coffre-1',
          nom: 'Dépôt banque',
          statut: 'ACTIF',
          objectifMontant: 100_000,
        }),
        update: jest.fn(),
      },
      caisse: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { typeOperation: 'ENTREE', montant: 15_000 },
            { typeOperation: 'SORTIE', montant: 2_500 },
          ])
          .mockResolvedValueOnce([
            { typeOperation: 'ENTREE', montant: 112_500 },
          ]),
        create: jest.fn().mockResolvedValue({ id: 'op-1' }),
      },
    };

    db = {
      caisseJour: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'jour-1',
          date: new Date('2026-07-24'),
          statut: 'OUVERTE',
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
      __tx: tx,
    };
    notifications = { create: jest.fn().mockResolvedValue({}) };
    service = new CaisseJourService(db, notifications);
  });

  it('ferme la caisse et transfère le solde vers le coffre choisi', async () => {
    const result = await service.fermer(
      'jour-1',
      'caissier-1',
      'RAS',
      'coffre-1',
    );

    expect(result.solde).toBe(12_500);
    expect(result.destination).toEqual({
      type: 'COFFRE',
      coffre: { id: 'coffre-1', nom: 'Dépôt banque' },
    });
    expect(db.__tx.caisse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        coffreId: 'coffre-1',
        typeOperation: 'ENTREE',
        montant: 12_500,
        transfertGroupId: 'jour-1',
        effectueePar: 'caissier-1',
      }),
    });
    expect(db.__tx.coffre.update).toHaveBeenCalledWith({
      where: { id: 'coffre-1' },
      data: { statut: 'ATTEINT' },
    });
  });

  it('refuse un transfert vers un coffre qui n’est plus actif', async () => {
    db.__tx.coffre.findUnique.mockResolvedValue({
      id: 'coffre-1',
      nom: 'Dépôt banque',
      statut: 'ATTEINT',
    });

    await expect(
      service.fermer('jour-1', 'caissier-1', undefined, 'coffre-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.__tx.caisseJour.update).not.toHaveBeenCalled();
    expect(db.__tx.caisse.create).not.toHaveBeenCalled();
  });
});
