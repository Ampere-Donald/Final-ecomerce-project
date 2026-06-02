import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { Devise } from '@prisma/client';
import { CmupService } from './cmup.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const d = (v: string | number) => new Decimal(v.toString());

/** Construit un mock db minimal pour CmupService.preview(). */
const makeProduit = (id: string, stock: number, cmup: string) => ({
  id,
  nomProduit: `Produit ${id}`,
  quantiteStock: stock,
  cmupActuel: d(cmup),
});

describe('CmupService.calculer()', () => {
  let service: CmupService;

  beforeEach(() => {
    service = new CmupService({ produit: {} } as any);
  });

  // S1 — stock initial zéro : nouveau CMUP = coût unitaire entré
  it('S1 — stock 0 : CMUP = coutUnitaire entree', () => {
    const result = service.calculer(0, d('0'), 10, d('1000'));
    expect(result.toNumber()).toBe(1000);
  });

  // S2 partiel — pondération correcte
  it('S2 — stock 10 CMUP 1000 + 20 à 1260 FCFA → CMUP 1173.33', () => {
    // (10 * 1000 + 20 * 1260) / 30 = (10000 + 25200) / 30 = 35200 / 30 = 1173.33
    const result = service.calculer(10, d('1000'), 20, d('1260'));
    expect(result.toNumber()).toBeCloseTo(1173.33, 2);
  });

  it('refuse quantiteEntree <= 0', () => {
    expect(() => service.calculer(10, d('1000'), 0, d('500'))).toThrow(BadRequestException);
    expect(() => service.calculer(10, d('1000'), -1, d('500'))).toThrow(BadRequestException);
  });

  it('refuse coutUnitaire < 0', () => {
    expect(() => service.calculer(10, d('1000'), 5, d('-1'))).toThrow(BadRequestException);
  });

  it('accepte coutUnitaire = 0 (donation / entrée gratuite)', () => {
    const result = service.calculer(10, d('500'), 10, d('0'));
    // (10*500 + 10*0) / 20 = 5000/20 = 250
    expect(result.toNumber()).toBe(250);
  });
});

// ─── CmupService.preview() ──────────────────────────────────────────────────

describe('CmupService.preview()', () => {
  let service: CmupService;
  let db: any;

  const produit1 = makeProduit('p1', 10, '1000');
  const produit2 = makeProduit('p2', 0, '0');

  beforeEach(() => {
    db = {
      produit: {
        findMany: jest.fn().mockResolvedValue([produit1, produit2]),
      },
    };
    service = new CmupService(db);
  });

  // S1 — achat FCFA, stock initial zéro
  it('S1 — preview FCFA stock 0 : CMUP après = coût entré', async () => {
    const result = await service.preview({
      devise: Devise.FCFA,
      tauxVersFcfa: 1,
      lignes: [{ produitId: 'p2', quantite: 10, prixUnitaireDevise: 1000 }],
    });

    const ligne = result.lignes[0];
    expect(ligne.cmupApres.toNumber()).toBe(1000);
    expect(ligne.stockApres).toBe(10);
    expect(result.totalFcfa.toNumber()).toBe(10000);
    expect(result.nombreProduitsImpactes).toBe(1);
  });

  // S2 — achat CNY, taux 84, pondération
  it('S2 — preview CNY taux 84 : conversion FCFA + pondération CMUP', async () => {
    // 15 CNY * 84 = 1260 FCFA/unité
    // (10*1000 + 20*1260) / 30 = 1173.33
    const result = await service.preview({
      devise: Devise.CNY,
      tauxVersFcfa: 84,
      lignes: [{ produitId: 'p1', quantite: 20, prixUnitaireDevise: 15 }],
    });

    const ligne = result.lignes[0];
    expect(ligne.coutUnitaireFcfa.toNumber()).toBe(1260);
    expect(ligne.cmupAvant.toNumber()).toBe(1000);
    expect(ligne.cmupApres.toNumber()).toBeCloseTo(1173.33, 2);
    expect(ligne.stockApres).toBe(30);
    expect(result.totalFcfa.toNumber()).toBe(25200); // 20 * 1260
  });

  it('leve une erreur si produit introuvable', async () => {
    db.produit.findMany.mockResolvedValue([]);
    await expect(
      service.preview({
        devise: Devise.FCFA,
        tauxVersFcfa: 1,
        lignes: [{ produitId: 'inconnu', quantite: 1, prixUnitaireDevise: 100 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // S3 — deux achats CNY à taux différents : chaque preview est indépendante
  it('S3 — preview stateless : taux 84 puis 60, chacun est calculé indépendamment', async () => {
    const preview84 = await service.preview({
      devise: Devise.CNY,
      tauxVersFcfa: 84,
      lignes: [{ produitId: 'p1', quantite: 5, prixUnitaireDevise: 10 }],
    });
    const preview60 = await service.preview({
      devise: Devise.CNY,
      tauxVersFcfa: 60,
      lignes: [{ produitId: 'p1', quantite: 5, prixUnitaireDevise: 10 }],
    });

    // Taux 84 : 10*84 = 840 FCFA/u
    expect(preview84.lignes[0].coutUnitaireFcfa.toNumber()).toBe(840);
    // Taux 60 : 10*60 = 600 FCFA/u
    expect(preview60.lignes[0].coutUnitaireFcfa.toNumber()).toBe(600);
    // Les deux previews sont stateless, le stock du produit n'a pas changé
    expect(preview84.lignes[0].stockAvant).toBe(produit1.quantiteStock);
    expect(preview60.lignes[0].stockAvant).toBe(produit1.quantiteStock);
  });
});

// ─── CmupService.appliquer() ────────────────────────────────────────────────

describe('CmupService.appliquer()', () => {
  let service: CmupService;
  let tx: any;

  const produitDb = {
    id: 'p1',
    nomProduit: 'Produit 1',
    quantiteStock: 10,
    cmupActuel: d('1000'),
    version: 1,
  };

  beforeEach(() => {
    tx = {
      produit: {
        findUnique: jest.fn().mockResolvedValue({ ...produitDb }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      mouvementCmup: { create: jest.fn().mockResolvedValue({}) },
      ligneAchat: { update: jest.fn().mockResolvedValue({}) },
    };
    service = new CmupService({} as any);
  });

  it('S5 — appliquer met à jour le produit avec le nouveau CMUP et stockApres', async () => {
    const lignes = [{ id: 'la1', produitId: 'p1', quantite: 20, coutUnitaireFcfa: d('1260') }];

    await service.appliquer(tx, 'achat-1', lignes, Devise.FCFA, d('1'), 'admin-1');

    expect(tx.produit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1', version: 1 },
        data: expect.objectContaining({
          quantiteStock: 30,       // 10 + 20
          cmupActuel: expect.objectContaining({ s: expect.anything() }),
        }),
      }),
    );
    expect(tx.mouvementCmup.create).toHaveBeenCalledTimes(1);
    expect(tx.ligneAchat.update).toHaveBeenCalledTimes(1);
  });

  it('lève une erreur de concurrence si updateMany retourne count=0', async () => {
    tx.produit.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.appliquer(
        tx,
        'achat-1',
        [{ id: 'la1', produitId: 'p1', quantite: 5, coutUnitaireFcfa: d('500') }],
        Devise.FCFA,
        d('1'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.mouvementCmup.create).not.toHaveBeenCalled();
  });

  it('retourne les résultats avec coutUnitaireDevise reconverti si non-FCFA', async () => {
    const lignes = [{ id: 'la1', produitId: 'p1', quantite: 10, coutUnitaireFcfa: d('840') }];
    // taux 84 : 840 FCFA / 84 = 10 CNY
    const resultats = await service.appliquer(tx, 'achat-1', lignes, Devise.CNY, d('84'));

    expect(resultats[0].coutUnitaireDevise.toDecimalPlaces(4).toNumber()).toBeCloseTo(10, 4);
    expect(resultats[0].coutUnitaireFcfa.toNumber()).toBe(840);
  });
});
