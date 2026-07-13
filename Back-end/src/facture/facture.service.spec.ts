import { FactureService } from './facture.service';

describe('FactureService print audit', () => {
  const build = (previousSuccesses = 0) => {
    const tx: any = {
      printEvent: {
        count: jest.fn().mockResolvedValue(previousSuccesses),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'event-1', ...data })),
      },
      facture: {
        update: jest.fn().mockResolvedValue({ printCount: previousSuccesses + 1 }),
      },
      proforma: { update: jest.fn() },
      factureVirtuelle: { update: jest.fn() },
    };
    const db: any = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    return { service: new FactureService(db), tx };
  };

  it('marque la première impression réussie comme ORIGINAL', async () => {
    const { service, tx } = build(0);
    const result = await service.recordPrint({
      documentType: 'FACTURE',
      documentId: '0f7f6a40-9151-4cf7-9f2d-cb2fc47b10d0',
      documentNumber: 'FAC-2026-0001',
      status: 'SUCCESS',
      workstationId: 'poste-1',
      printerName: 'EPSON TM-T20II',
    }, 'admin-1');

    expect(result.mode).toBe('ORIGINAL');
    expect(result.printCount).toBe(1);
    expect(tx.printEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ mode: 'ORIGINAL', actorId: 'admin-1' }),
    });
  });

  it('marque les impressions suivantes comme DUPLICATA', async () => {
    const { service } = build(1);
    await expect(service.recordPrint({
      documentType: 'TICKET',
      documentId: '0f7f6a40-9151-4cf7-9f2d-cb2fc47b10d0',
      documentNumber: 'TIC-2026-0001',
      status: 'SUCCESS',
    }, 'admin-1')).resolves.toMatchObject({ mode: 'DUPLICATA', printCount: 2 });
  });

  it('journalise un échec sans incrémenter le compteur', async () => {
    const { service, tx } = build(1);
    const result = await service.recordPrint({
      documentType: 'TICKET',
      documentNumber: 'TIC-2026-0001',
      status: 'FAILED',
      errorCode: 'QZ_UNAVAILABLE',
    }, 'admin-1');

    expect(result.printCount).toBe(1);
    expect(tx.facture.update).not.toHaveBeenCalled();
    expect(tx.printEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'FAILED', errorCode: 'QZ_UNAVAILABLE' }),
    });
  });
});
