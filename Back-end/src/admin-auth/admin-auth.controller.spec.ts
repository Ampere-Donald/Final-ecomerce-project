import { AdminAuthController } from './admin-auth.controller';

describe('AdminAuthController diagnostics', () => {
  it('journalise uniquement les métadonnées techniques autorisées', async () => {
    const activityLog = { log: jest.fn().mockResolvedValue(undefined) };
    const controller = new AdminAuthController({} as any, activityLog as any);
    const request = {
      user: { id: 'admin-1' },
      headers: { 'x-request-id': 'req-123', 'user-agent': 'Newoteg PWA' },
      ip: '127.0.0.1',
    };

    await expect(controller.recordDiagnostic(request, {
      action: 'SYNC_FAILURE',
      code: 'STOCK_CONFLICT',
      operationKind: 'VENTE',
      operationId: '0f7f6a40-9151-4cf7-9f2d-cb2fc47b10d0',
      workstationId: 'caisse-1',
      state: 'CONFLICT',
    })).resolves.toEqual({ recorded: true });

    expect(activityLog.log).toHaveBeenCalledWith('admin-1', 'SYNC_FAILURE', {
      code: 'STOCK_CONFLICT',
      operationKind: 'VENTE',
      operationId: '0f7f6a40-9151-4cf7-9f2d-cb2fc47b10d0',
      workstationId: 'caisse-1',
      state: 'CONFLICT',
      correlationId: 'req-123',
    }, '127.0.0.1', 'Newoteg PWA');
  });
});
