import { BadRequestException } from '@nestjs/common';
import { CaisseService } from './caisse.service';

describe('CaisseService coffres', () => {
  const actor = { id: 'admin-1', nom: 'Admin', role: 'SUPER_ADMIN' };
  let db: any;
  let notifications: any;
  let service: CaisseService;

  beforeEach(() => {
    notifications = { create: jest.fn().mockResolvedValue({}) };
    db = {
      caisse: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      coffre: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(db)),
    };
    service = new CaisseService(db, notifications);
  });

  it('cree deux ecritures atomiques pour un transfert caisse vers coffre', async () => {
    db.coffre.findUnique.mockResolvedValue({
      id: 'coffre-1',
      nom: 'Advans',
      statut: 'ACTIF',
      objectifMontant: 500,
    });
    db.caisse.findMany
      .mockResolvedValueOnce([{ typeOperation: 'ENTREE', montant: 1000 }])
      .mockResolvedValueOnce([{ typeOperation: 'ENTREE', montant: 500 }]);
    db.caisse.create = jest
      .fn()
      .mockResolvedValueOnce({ id: 'sortie', typeOperation: 'SORTIE' })
      .mockResolvedValueOnce({ id: 'entree', typeOperation: 'ENTREE' });
    db.coffre.update = jest.fn().mockResolvedValue({});

    const result = await service.transferer(
      { coffreId: 'coffre-1', montant: 500 },
      actor,
    );

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.caisse.create).toHaveBeenCalledTimes(2);
    expect(db.caisse.create.mock.calls[0][0].data.typeOperation).toBe('SORTIE');
    expect(db.caisse.create.mock.calls[1][0].data.typeOperation).toBe('ENTREE');
    expect(db.caisse.create.mock.calls[0][0].data.transfertGroupId).toBe(
      db.caisse.create.mock.calls[1][0].data.transfertGroupId,
    );
    expect(db.coffre.update).toHaveBeenCalledWith({
      where: { id: 'coffre-1' },
      data: { statut: 'ATTEINT' },
    });
    expect(result.operations).toHaveLength(2);
  });

  it('refuse un transfert si le solde caisse principale est insuffisant', async () => {
    db.coffre.findUnique.mockResolvedValue({
      id: 'coffre-1',
      nom: 'Advans',
      statut: 'ACTIF',
      objectifMontant: null,
    });
    db.caisse.findMany.mockResolvedValue([{ typeOperation: 'ENTREE', montant: 100 }]);
    db.caisse.create = jest.fn();

    await expect(
      service.transferer({ coffreId: 'coffre-1', montant: 500 }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.caisse.create).not.toHaveBeenCalled();
  });

  it("annule les deux lignes d'un transfert groupe", async () => {
    db.caisse.findUnique.mockResolvedValue({
      id: 'op-1',
      annulee: false,
      transfertGroupId: 'group-1',
    });
    db.caisse.findMany
      .mockResolvedValueOnce([
        { id: 'op-1', annulee: false },
        { id: 'op-2', annulee: false },
      ])
      .mockResolvedValueOnce([
        { id: 'op-1', annulee: true },
        { id: 'op-2', annulee: true },
      ]);
    db.caisse.updateMany = jest.fn().mockResolvedValue({ count: 2 });

    const result = await service.annuler('op-1', 'Erreur de saisie', actor);

    expect(db.caisse.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['op-1', 'op-2'] }, annulee: false },
      data: expect.objectContaining({
        annulee: true,
        motifAnnulation: 'Erreur de saisie',
        annuleeById: actor.id,
      }),
    });
    expect(result.annulees).toHaveLength(2);
  });

  it('calcule le solde global caisse principale plus coffres non clotures', async () => {
    db.coffre.findMany.mockResolvedValue([
      { id: 'c1', nom: 'Advans', objectifMontant: 1000, dateEcheance: null, statut: 'ACTIF' },
      { id: 'c2', nom: 'Salaire', objectifMontant: null, dateEcheance: null, statut: 'ATTEINT' },
    ]);
    db.caisse.findMany
      .mockResolvedValueOnce([
        { typeOperation: 'ENTREE', montant: 1000 },
        { typeOperation: 'SORTIE', montant: 250 },
      ])
      .mockResolvedValueOnce([{ typeOperation: 'ENTREE', montant: 400 }])
      .mockResolvedValueOnce([{ typeOperation: 'ENTREE', montant: 100 }]);

    const result = await service.getSoldeGlobal();

    expect(result.caissePrincipale).toBe(750);
    expect(result.coffres.map((c) => c.solde)).toEqual([400, 100]);
    expect(result.total).toBe(1250);
  });
});
