import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Devise, StatutAchat } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { AchatService } from './achat.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const d = (v: string | number) => new Decimal(v.toString());

const makeBrouillon = (overrides: Partial<any> = {}) => ({
  id: 'achat-1',
  statutAchat: StatutAchat.BROUILLON,
  devise: Devise.FCFA,
  tauxChange: d('1'),
  fournisseurId: 'four-1',
  fournisseur: null,
  lignesAchat: [
    {
      id: 'la1',
      produitId: 'p1',
      quantite: 10,
      prixUnitaireDevise: d('1000'),
    },
  ],
  mouvementsCmup: [],
  montantTotalFcfa: d('10000'),
  ...overrides,
});

// ─── S4 — create() — BROUILLON, aucun impact stock/CMUP ─────────────────────

describe('AchatService.create() — S4', () => {
  let service: AchatService;
  let db: any;
  let notifications: any;
  let cmup: any;

  beforeEach(() => {
    db = {
      achat: {
        create: jest.fn().mockResolvedValue(makeBrouillon()),
      },
      $transaction: jest.fn(),
    };
    notifications = { create: jest.fn().mockResolvedValue({}) };
    cmup = { appliquer: jest.fn() };
    service = new AchatService(db, notifications, cmup);
  });

  it('S4 — crée un BROUILLON sans appeler cmup.appliquer ni ouvrir de transaction', async () => {
    const result = await service.create({
      fournisseurId: 'four-1',
      devise: Devise.FCFA,
      tauxVersFcfa: 1,
      lignesAchat: [{ produitId: 'p1', quantite: 10, prixUnitaireDevise: 1000 }],
    } as any);

    expect(result.statutAchat).toBe(StatutAchat.BROUILLON);
    expect(cmup.appliquer).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.achat.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statutAchat: StatutAchat.BROUILLON }),
      }),
    );
  });

  it('S4 CNY — calcule correctement le montant FCFA via le taux', async () => {
    // 15 CNY * 84 = 1260 FCFA/unité, 10 unités → 12600 FCFA
    db.achat.create.mockResolvedValue(makeBrouillon({ montantTotalFcfa: d('12600') }));

    const result = await service.create({
      fournisseurId: 'four-1',
      devise: Devise.CNY,
      tauxVersFcfa: 84,
      lignesAchat: [{ produitId: 'p1', quantite: 10, prixUnitaireDevise: 15 }],
    } as any);

    expect(result.statutAchat).toBe(StatutAchat.BROUILLON);
    expect(cmup.appliquer).not.toHaveBeenCalled();
    // Vérifier que create a été appelé avec les bons champs FCFA
    const callData = db.achat.create.mock.calls[0][0].data;
    expect(callData.tauxChange.toNumber()).toBe(84);
    expect(callData.devise).toBe(Devise.CNY);
  });
});

// ─── S5 — valider() — applique CMUP + MouvementStock ────────────────────────

describe('AchatService.valider() — S5', () => {
  let service: AchatService;
  let db: any;
  let notifications: any;
  let cmup: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      ligneAchat: { update: jest.fn().mockResolvedValue({}) },
      mouvementStock: { create: jest.fn().mockResolvedValue({}) },
      produit: { update: jest.fn().mockResolvedValue({}) },
      achat: {
        update: jest.fn().mockResolvedValue({
          id: 'achat-1',
          statutAchat: StatutAchat.VALIDE,
          montantTotalFcfa: d('10000'),
        }),
      },
    };

    db = {
      achat: { findUnique: jest.fn().mockResolvedValue(makeBrouillon()) },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
    };
    notifications = { create: jest.fn().mockResolvedValue({}) };
    cmup = { appliquer: jest.fn().mockResolvedValue([]) };
    service = new AchatService(db, notifications, cmup);
  });

  it('S5 — appelle cmup.appliquer, crée MouvementStock, passe en VALIDE', async () => {
    const result = await service.valider('achat-1');

    expect(cmup.appliquer).toHaveBeenCalledTimes(1);
    expect(cmup.appliquer).toHaveBeenCalledWith(
      tx,
      'achat-1',
      expect.arrayContaining([
        expect.objectContaining({ produitId: 'p1', quantite: 10 }),
      ]),
      Devise.FCFA,
      expect.anything(), // taux Decimal
      undefined,          // actor?.id
    );
    expect(tx.mouvementStock.create).toHaveBeenCalledTimes(1);
    expect(tx.mouvementStock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ produitId: 'p1', typeMouvement: 'ENTREE', quantite: 10 }),
      }),
    );
    expect(tx.achat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statutAchat: StatutAchat.VALIDE }),
      }),
    );
    expect(result.statutAchat).toBe(StatutAchat.VALIDE);
  });

  it('refuse de valider un achat déjà VALIDE', async () => {
    db.achat.findUnique.mockResolvedValue(makeBrouillon({ statutAchat: StatutAchat.VALIDE }));
    await expect(service.valider('achat-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(cmup.appliquer).not.toHaveBeenCalled();
  });

  it('refuse de valider un achat sans lignes', async () => {
    db.achat.findUnique.mockResolvedValue(makeBrouillon({ lignesAchat: [] }));
    await expect(service.valider('achat-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(cmup.appliquer).not.toHaveBeenCalled();
  });

  it('refuse de valider si taux <= 0', async () => {
    db.achat.findUnique.mockResolvedValue(makeBrouillon({ tauxChange: d('0') }));
    await expect(service.valider('achat-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lève NotFoundException si achat introuvable', async () => {
    db.achat.findUnique.mockResolvedValue(null);
    await expect(service.valider('inconnu')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── AchatService.annuler() ──────────────────────────────────────────────────

describe('AchatService.annuler()', () => {
  let service: AchatService;
  let db: any;
  let notifications: any;
  let cmup: any;

  beforeEach(() => {
    db = {
      achat: {
        findUnique: jest.fn().mockResolvedValue(makeBrouillon({ lignesAchat: [] })),
        update: jest.fn().mockResolvedValue(
          makeBrouillon({ statutAchat: StatutAchat.ANNULE, lignesAchat: [] }),
        ),
      },
    };
    notifications = { create: jest.fn().mockResolvedValue({}) };
    cmup = {};
    service = new AchatService(db, notifications, cmup);
  });

  it('annule un BROUILLON — retourne statutAchat=ANNULE', async () => {
    const result = await service.annuler('achat-1', {});
    expect(result.statutAchat).toBe(StatutAchat.ANNULE);
    expect(db.achat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statutAchat: StatutAchat.ANNULE }),
      }),
    );
  });

  it("refuse d'annuler un achat VALIDE (V1 — stock déjà impacté)", async () => {
    db.achat.findUnique.mockResolvedValue(makeBrouillon({ statutAchat: StatutAchat.VALIDE, lignesAchat: [] }));
    await expect(service.annuler('achat-1', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(db.achat.update).not.toHaveBeenCalled();
  });

  it("refuse d'annuler un achat déjà ANNULE", async () => {
    db.achat.findUnique.mockResolvedValue(makeBrouillon({ statutAchat: StatutAchat.ANNULE, lignesAchat: [] }));
    await expect(service.annuler('achat-1', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(db.achat.update).not.toHaveBeenCalled();
  });

  it('lève NotFoundException si achat introuvable', async () => {
    db.achat.findUnique.mockResolvedValue(null);
    await expect(service.annuler('id-inexistant', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
