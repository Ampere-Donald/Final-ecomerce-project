import { EcheanceService } from './echeance.service';

describe('EcheanceService', () => {
  let db: any;
  let caisseService: any;
  let notifications: any;
  let mail: any;
  let service: EcheanceService;

  const addDays = (n: number) => new Date(Date.now() + n * 86_400_000);

  beforeEach(() => {
    db = {
      echeance: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn(),
        delete: jest.fn(),
      },
      alerteEcheance: {
        create: jest.fn().mockResolvedValue({ id: 'alerte-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      coffre: { findUnique: jest.fn() },
      adminUser: { findMany: jest.fn().mockResolvedValue([]) },
    };
    caisseService = { calculateSolde: jest.fn().mockResolvedValue(0) };
    notifications = { create: jest.fn().mockResolvedValue({}) };
    mail = { sendMail: jest.fn().mockResolvedValue(true) };
    service = new EcheanceService(db, caisseService, notifications, mail);
  });

  describe('computeProchaineDate', () => {
    it('avance d un mois en clampant la fin de mois (31 jan -> 28 fev)', () => {
      const next = service.computeProchaineDate(
        new Date(Date.UTC(2026, 0, 31)),
        'MENSUELLE',
      );
      expect(next?.getUTCFullYear()).toBe(2026);
      expect(next?.getUTCMonth()).toBe(1); // février
      expect(next?.getUTCDate()).toBe(28);
    });

    it('avance d un trimestre', () => {
      const next = service.computeProchaineDate(
        new Date(Date.UTC(2026, 0, 15)),
        'TRIMESTRIELLE',
      );
      expect(next?.getUTCMonth()).toBe(3); // avril
    });

    it('retourne null pour une echeance UNIQUE', () => {
      expect(
        service.computeProchaineDate(new Date(), 'UNIQUE'),
      ).toBeNull();
    });
  });

  describe('emitAlerte (anti-doublon)', () => {
    it('ne re-emet pas une alerte deja emise le meme jour (non manuel)', async () => {
      db.alerteEcheance.create.mockRejectedValueOnce({ code: 'P2002' });
      const echeance = {
        id: 'e1',
        titre: 'Tontine',
        coffreId: null,
        dateEcheance: addDays(3),
      };

      const result = await service.emitAlerte(echeance, 'RAPPEL', {
        joursRestants: 3,
      });

      expect(result).toBeNull();
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('re-emet quand declenche manuellement malgre un doublon', async () => {
      db.alerteEcheance.create.mockRejectedValueOnce({ code: 'P2002' });
      const echeance = {
        id: 'e1',
        titre: 'Tontine',
        coffreId: null,
        dateEcheance: addDays(3),
      };

      await service.emitAlerte(echeance, 'RAPPEL', {
        joursRestants: 3,
        manuel: true,
      });

      expect(notifications.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('message avec coffre lie', () => {
    it('indique le manque restant', async () => {
      caisseService.calculateSolde.mockResolvedValue(600);
      const echeance = {
        id: 'e1',
        titre: 'Advans',
        coffreId: 'c1',
        montantCible: 1000,
        coffre: { nom: 'Advans', objectifMontant: 1000 },
        dateEcheance: addDays(3),
      };

      await service.emitAlerte(echeance, 'RAPPEL', { joursRestants: 3 });

      const message = notifications.create.mock.calls[0][1] as string;
      expect(message).toContain('il manque');
      expect(message).toContain('400');
    });
  });

  describe('email SUPER_ADMIN uniquement', () => {
    it('cible uniquement les SUPER_ADMIN actifs', async () => {
      db.adminUser.findMany.mockResolvedValue([{ email: 'boss@newoteg.com' }]);
      const echeance = {
        id: 'e1',
        titre: 'Salaires',
        coffreId: null,
        dateEcheance: addDays(1),
      };

      await service.emitAlerte(echeance, 'RAPPEL', { joursRestants: 1 });

      expect(db.adminUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'SUPER_ADMIN', isActive: true },
          select: { email: true },
        }),
      );
      expect(mail.sendMail).toHaveBeenCalledWith(
        'boss@newoteg.com',
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('processDailyAlerts', () => {
    it('emet une alerte URGENT le jour J', async () => {
      db.echeance.findMany.mockResolvedValue([
        { id: 'e1', titre: 'Tontine', coffreId: null, dateEcheance: new Date(), recurrence: 'UNIQUE', joursAlerteAvant: [7, 3, 1] },
      ]);

      await service.processDailyAlerts();

      expect(db.alerteEcheance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'URGENT' }),
        }),
      );
    });

    it('desactive une echeance UNIQUE en retard', async () => {
      db.echeance.findMany.mockResolvedValue([
        { id: 'e1', titre: 'Loyer', coffreId: null, dateEcheance: addDays(-2), recurrence: 'UNIQUE', joursAlerteAvant: [] },
      ]);

      await service.processDailyAlerts();

      const deactivated = db.echeance.update.mock.calls.some(
        (c: any[]) => c[0]?.data?.active === false,
      );
      expect(deactivated).toBe(true);
    });

    it('reporte une echeance recurrente en retard vers une date future', async () => {
      db.echeance.findMany.mockResolvedValue([
        { id: 'e1', titre: 'Tontine', coffreId: null, dateEcheance: addDays(-2), recurrence: 'MENSUELLE', joursAlerteAvant: [] },
      ]);

      await service.processDailyAlerts();

      const roll = db.echeance.update.mock.calls.find(
        (c: any[]) => c[0]?.data?.dateEcheance instanceof Date,
      );
      expect(roll).toBeDefined();
      expect((roll![0].data.dateEcheance as Date).getTime()).toBeGreaterThan(
        Date.now(),
      );
    });

    it("n'emet pas de RAPPEL si joursRestants n'est pas dans la liste", async () => {
      db.echeance.findMany.mockResolvedValue([
        { id: 'e1', titre: 'Tontine', coffreId: null, dateEcheance: addDays(5), recurrence: 'UNIQUE', joursAlerteAvant: [7, 3, 1] },
      ]);

      await service.processDailyAlerts();

      expect(db.alerteEcheance.create).not.toHaveBeenCalled();
    });
  });
});
