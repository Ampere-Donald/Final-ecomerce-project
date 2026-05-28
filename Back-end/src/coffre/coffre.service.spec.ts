import { BadRequestException } from '@nestjs/common';
import { CoffreService } from './coffre.service';

describe('CoffreService', () => {
  const actor = { id: 'admin-1', nom: 'Admin', role: 'SUPER_ADMIN' };
  let db: any;
  let caisseService: any;
  let notifications: any;
  let service: CoffreService;

  beforeEach(() => {
    db = {
      coffre: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      caisse: {
        create: jest.fn(),
      },
    };
    caisseService = { calculateSolde: jest.fn() };
    notifications = { create: jest.fn().mockResolvedValue({}) };
    service = new CoffreService(db, caisseService, notifications);
  });

  it('refuse une sortie coffre si le solde est insuffisant', async () => {
    db.coffre.findUnique.mockResolvedValue({
      id: 'coffre-1',
      nom: 'Advans',
      statut: 'ACTIF',
    });
    caisseService.calculateSolde.mockResolvedValue(100);

    await expect(
      service.sortie('coffre-1', { montant: 500, motif: 'Paiement' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.caisse.create).not.toHaveBeenCalled();
  });

  it('refuse la cloture si le solde du coffre est non nul', async () => {
    db.coffre.findUnique.mockResolvedValue({
      id: 'coffre-1',
      nom: 'Advans',
      statut: 'ACTIF',
      objectifMontant: null,
      dateEcheance: null,
    });
    caisseService.calculateSolde.mockResolvedValue(10);

    await expect(service.cloturer('coffre-1', false, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.coffre.update).not.toHaveBeenCalled();
  });
});
