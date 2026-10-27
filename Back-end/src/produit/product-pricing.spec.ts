import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../admin-auth/roles.decorator';
import { ProductPricingController } from './product-pricing.controller';
import { CompleteProductPricingDto } from './dto/complete-product-pricing.dto';
import {
  INITIAL_PRICE_ACTION,
  ProductPricingService,
  PRICING_STAFF_ROLES,
} from './product-pricing.service';

describe('Saisie collective des prix manquants', () => {
  const product = {
    id: 'product',
    nomProduit: 'Condensateur 1000 µF',
    version: 4,
    prixDetail: null,
    prixGros: null,
    prixDemiGros: null,
    estActif: true,
    code: 'COND-1000',
  };
  const build = (overrides = {}) => {
    const tx: any = {
      produit: {
        findUnique: jest.fn().mockResolvedValue({ ...product, ...overrides }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      activityLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const db: any = { $transaction: jest.fn((callback) => callback(tx)) };
    return { service: new ProductPricingService(db), db, tx };
  };
  const actor = { id: 'employee', nom: 'Équipe boutique', role: 'VENDEUR' };

  it('ouvre exclusivement la route aux cinq rôles du personnel', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ProductPricingController)).toEqual(
      PRICING_STAFF_ROLES,
    );
    expect(PRICING_STAFF_ROLES).toEqual(
      expect.arrayContaining([
        'SUPER_ADMIN',
        'ADMIN',
        'CAISSIER',
        'VENDEUR',
        'MANAGER',
      ]),
    );
  });

  it.each(PRICING_STAFF_ROLES)(
    'permet une saisie initiale tracée par %s',
    async (role) => {
      const { service, tx } = build();
      await expect(
        service.complete(
          'product',
          { prixDetail: 1500, prixGros: 1200, version: 4 },
          { ...actor, role },
        ),
      ).resolves.toMatchObject({ prixDetail: 1500, version: 5 });
      expect(tx.produit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'product',
            version: 4,
            AND: [{ OR: [{ prixDetail: null }, { prixDetail: { lte: 0 } }] }],
          }),
          data: { prixDetail: 1500, prixGros: 1200, version: { increment: 1 } },
        }),
      );
      expect(tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: INITIAL_PRICE_ACTION,
          adminUserId: actor.id,
          details: expect.objectContaining({
            productId: 'product',
            prixDetail: 1500,
            actorRole: role,
          }),
        }),
      });
    },
  );

  it('refuse les comptes externes avant toute écriture', async () => {
    const { service, db } = build();
    await expect(
      service.complete(
        'product',
        { prixDetail: 100, version: 4 },
        { ...actor, role: 'CLIENT' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each([0, -50, NaN, Infinity, 12.5, 1_000_000_001])(
    'refuse le montant invalide %s',
    async (prixDetail) => {
      const { service, db } = build();
      await expect(
        service.complete('product', { prixDetail, version: 4 }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it('n’écrase jamais un prix déjà présent', async () => {
    const { service, tx } = build({ prixDetail: 1000 });
    await expect(
      service.complete('product', { prixDetail: 1500, version: 4 }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.produit.updateMany).not.toHaveBeenCalled();
  });

  it('accepte le prix d’un brouillon sans le publier', async () => {
    const { service, tx } = build({ estActif: false });
    await expect(
      service.complete('product', { prixDetail: 1500, version: 4 }, actor),
    ).resolves.toMatchObject({ estActif: false });
    expect(tx.produit.updateMany.mock.calls[0][0].data).not.toHaveProperty(
      'estActif',
    );
  });

  it('détecte un concurrent gagnant au moment de l’UPDATE et ne crée aucun audit de succès', async () => {
    const { service, tx } = build();
    tx.produit.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.complete('product', { prixDetail: 1500, version: 4 }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.activityLog.create).not.toHaveBeenCalled();
  });

  it('garde l’audit dans la transaction et propage une erreur d’enregistrement', async () => {
    const { service, tx } = build();
    tx.activityLog.create.mockRejectedValue(new Error('audit indisponible'));
    await expect(
      service.complete('product', { prixDetail: 1500, version: 4 }, actor),
    ).rejects.toThrow('audit indisponible');
  });

  it('refuse une fiche obsolète et préserve les tarifs de gros existants', async () => {
    const stale = build();
    await expect(
      stale.service.complete(
        'product',
        { prixDetail: 1500, version: 3 },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    const { service, tx } = build({ prixGros: 1200 });
    await service.complete('product', { prixDetail: 1500, version: 4 }, actor);
    expect(tx.produit.updateMany.mock.calls[0][0].data).not.toHaveProperty(
      'prixGros',
    );
    await expect(
      service.complete(
        'product',
        { prixDetail: 1500, prixGros: 1100, version: 4 },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse un tarif de gros supérieur au détail', async () => {
    const { service } = build();
    await expect(
      service.complete(
        'product',
        { prixDetail: 1000, prixGros: 1200, version: 4 },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('valide le contrat HTTP sans convertir un texte ambigu en prix', async () => {
    expect(
      await validate(
        plainToInstance(CompleteProductPricingDto, {
          prixDetail: '1500',
          version: 4,
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CompleteProductPricingDto, {
          prixDetail: 1500,
          version: 4,
        }),
      ),
    ).toHaveLength(0);
  });

  it('filtre et pagine les articles actifs sans prix, sans exposer les coûts', async () => {
    const db: any = {
      produit: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(3),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      categorie: { findMany: jest.fn().mockResolvedValue([]) },
      activityLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    await new ProductPricingService(db).list({
      page: 2,
      limit: 18,
      search: 'COND',
      categoryId: 'cat',
      inStock: 'true',
      visibility: 'active',
    });
    expect(db.produit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 18,
        skip: 18,
        where: expect.objectContaining({
          estActif: true,
          categorieId: 'cat',
          quantiteStock: { gt: 0 },
          AND: expect.arrayContaining([
            { OR: [{ prixDetail: null }, { prixDetail: { lte: 0 } }] },
          ]),
        }),
      }),
    );
    expect(db.produit.findMany.mock.calls[0][0].select).not.toHaveProperty(
      'cmupActuel',
    );
  });
});
