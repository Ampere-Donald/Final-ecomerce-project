import { ProduitService } from './produit.service';

describe('ProduitService pagination', () => {
  const build = (total = 1200) => {
    const db: any = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'p-1' }]),
      produit: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(total),
      },
    };
    const service = new ProduitService(db, {} as any, {} as any, {} as any);
    return { service, db };
  };

  it('plafonne la taille des pages et normalise une page invalide', async () => {
    const { service, db } = build();

    const result = await service.findAll({ page: -8, limit: 20_000 });

    expect(db.produit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 500,
    }));
    expect(result.meta).toEqual({ total: 1200, page: 1, limit: 500, lastPage: 3 });
  });

  it('applique la recherche, la catégorie et les codes côté serveur', async () => {
    const { service, db } = build(2);

    await service.findAll({
      page: 2,
      limit: 50,
      search: 'capteur',
      categoryId: 'cat-1',
      codeFamille: 'ELEC',
      code: '0042',
      inStock: true,
      sort: 'name_asc',
    });

    expect(db.produit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 50,
      take: 50,
      where: expect.objectContaining({
        categorieId: 'cat-1',
        codeFamille: { contains: 'ELEC', mode: 'insensitive' },
        code: { contains: '0042', mode: 'insensitive' },
        quantiteStock: { gt: 0 },
      }),
      orderBy: { nomProduit: 'asc' },
    }));
  });

  it('utilise une recherche vendeur legere, multi-mots et sans comptage global', async () => {
    const { service, db } = build(2);

    const result = await service.findAll({
      search: 'fer 40w',
      limit: 20,
      salesSearch: true,
    });

    expect(db.produit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 40,
      where: expect.objectContaining({
        id: { in: ['p-1'] },
      }),
      select: expect.objectContaining({
        nomProduit: true,
        code: true,
        categorie: { select: { id: true, nom: true } },
      }),
    }));
    expect(db.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('word_similarity'),
      'fer 40w',
      null,
      false,
      40,
    );
    expect(db.produit.count).not.toHaveBeenCalled();
    expect(result.meta).toEqual({ total: 0, page: 1, limit: 20, lastPage: 1 });
  });
});

describe('ProduitService creation avec code automatique', () => {
  it('continue la sequence 000 historique dans une transaction verrouillee', async () => {
    const created = {
      id: 'p-new',
      nomProduit: 'Nouveau produit',
      codeFamille: '000',
      code: '0000387',
      categorie: { id: 'cat-1', nom: 'Divers' },
    };
    const tx: any = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ locked: true }]),
      produit: {
        findMany: jest.fn().mockResolvedValue([
          { code: '0000385' },
          { code: '0000386' },
          { code: 'code-invalide' },
        ]),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const db: any = {
      $transaction: jest.fn().mockImplementation((callback: any) => callback(tx)),
      produit: { create: jest.fn() },
    };
    const notifications: any = { create: jest.fn().mockResolvedValue({}) };
    const service = new ProduitService(db, notifications, {} as any, {} as any);

    const result = await service.create({
      categorieId: 'cat-1',
      nomProduit: 'Nouveau produit',
      marque: 'Newoteg',
      quantiteStock: 12,
    });

    expect(result).toBe(created);
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      'newoteg:produit-code:000',
    );
    expect(tx.produit.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ codeFamille: '000', code: '0000387' }),
    }));
  });

  it('conserve un code explicite et deduit sa famille', async () => {
    const db: any = {
      $transaction: jest.fn(),
      produit: {
        create: jest.fn().mockResolvedValue({
          id: 'p-legacy', codeFamille: '123', code: '123456', categorie: {},
        }),
      },
    };
    const service = new ProduitService(
      db,
      { create: jest.fn().mockResolvedValue({}) } as any,
      {} as any,
      {} as any,
    );

    await service.create({
      categorieId: 'cat-1',
      nomProduit: 'Produit historique',
      marque: '',
      code: '123456',
    });

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.produit.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ codeFamille: '123', code: '123456' }),
    }));
  });
});
