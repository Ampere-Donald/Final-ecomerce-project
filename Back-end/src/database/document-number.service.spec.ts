import { DocumentNumberService } from './document-number.service';

describe('DocumentNumberService', () => {
  it('formate les sequences annuelles retournees atomiquement par la base', async () => {
    const upsert = jest.fn().mockResolvedValue({ nextValue: 42 });
    const service = new DocumentNumberService({ documentSequence: { upsert } } as any);

    await expect(
      service.nextAnnual('TICKET_CAISSE', 'TIC-', undefined, new Date('2026-07-13T10:00:00Z')),
    ).resolves.toBe('TIC-2026-0042');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { type_period: { type: 'TICKET_CAISSE', period: '2026' } },
      update: { nextValue: { increment: 1 } },
    }));
  });

  it('isole les sequences quotidiennes par date', async () => {
    const upsert = jest.fn().mockResolvedValue({ nextValue: 7 });
    const service = new DocumentNumberService({ documentSequence: { upsert } } as any);

    await expect(
      service.nextDaily('TICKET_QUEUE', 'T-', undefined, new Date(2026, 6, 13, 12)),
    ).resolves.toBe('T-20260713-0007');
  });
});
