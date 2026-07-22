import { DocumentNumberService } from './document-number.service';

describe('DocumentNumberService', () => {
  it('formate les sequences annuelles retournees atomiquement par la base', async () => {
    const upsert = jest.fn().mockResolvedValue({ nextValue: 42 });
    const service = new DocumentNumberService({
      documentSequence: { upsert },
    } as any);

    await expect(
      service.nextAnnual(
        'TICKET_CAISSE',
        'TIC-',
        undefined,
        new Date('2026-07-13T10:00:00Z'),
      ),
    ).resolves.toBe('TIC-2026-0042');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type_period: { type: 'TICKET_CAISSE', period: '2026' } },
        update: { nextValue: { increment: 1 } },
      }),
    );
  });

  it('isole les sequences quotidiennes par date', async () => {
    const upsert = jest.fn().mockResolvedValue({ nextValue: 7 });
    const service = new DocumentNumberService({
      documentSequence: { upsert },
    } as any);

    await expect(
      service.nextDaily(
        'TICKET_QUEUE',
        'T-',
        undefined,
        new Date(2026, 6, 13, 12),
      ),
    ).resolves.toBe('T-20260713-0007');
  });

  it('ne duplique aucun numéro lorsque deux caisses demandent en parallèle', async () => {
    let value = 0;
    const upsert = jest.fn().mockImplementation(async () => {
      const nextValue = ++value;
      await Promise.resolve();
      return { nextValue };
    });
    const service = new DocumentNumberService({
      documentSequence: { upsert },
    } as any);

    const numbers = await Promise.all(
      Array.from({ length: 20 }, () =>
        service.nextAnnual(
          'TICKET_CAISSE',
          'TIC-',
          undefined,
          new Date('2026-07-13T10:00:00Z'),
        ),
      ),
    );

    expect(new Set(numbers).size).toBe(20);
  });

  it('reprend apres le dernier ticket existant lorsque la sequence a disparu', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ nextValue: 4 }]);
    const service = new DocumentNumberService({
      $queryRawUnsafe: queryRaw,
      documentSequence: { upsert: jest.fn() },
    } as any);

    await expect(
      service.nextAnnual(
        'TICKET_CAISSE',
        'TIC-',
        undefined,
        new Date('2026-07-22T10:00:00Z'),
      ),
    ).resolves.toBe('TIC-2026-0004');
    expect(queryRaw).toHaveBeenCalledWith(
      expect.stringContaining('GREATEST'),
      'TICKET_CAISSE:2026',
      'TICKET_CAISSE',
      '2026',
      'TIC-2026-%',
    );
  });

  it('resynchronise aussi les numeros quotidiens des tickets vendeurs', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ nextValue: 5 }]);
    const service = new DocumentNumberService({
      $queryRawUnsafe: queryRaw,
      documentSequence: { upsert: jest.fn() },
    } as any);

    await expect(
      service.nextDaily(
        'TICKET_QUEUE',
        'T-',
        undefined,
        new Date(2026, 6, 22, 12),
      ),
    ).resolves.toBe('T-20260722-0005');
    expect(queryRaw.mock.calls[0][0]).toContain('ticket_vente');
    expect(queryRaw.mock.calls[0][4]).toBe('T-20260722-%');
  });
});
