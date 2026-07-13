import { ProduitService } from './produit.service';

describe('ProduitService pagination', () => {
  const build = (total = 1200) => {
    const db: any = {
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
});
