import { period, ParcoursService } from './parcours.service';
import { AuditLogInterceptor } from '../common/interceptors/audit-log.interceptor';
import { Logger } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';

describe('Journey aggregate boundaries', () => {
  const now = new Date('2026-10-04T12:00:00Z');
  const event = () => ({
    id: randomUUID(),
    jour: '2026-10-04',
    evenement: 'FICHE_OUVERTE' as const,
    langue: 'fr' as const,
    appareil: 'mobile' as const,
    reception: 'GENERAL' as const,
  });
  afterEach(() => {
    delete process.env.PARCOURS_METRICS_ENABLED;
    jest.restoreAllMocks();
  });
  it('uses Douala midnight with a 90-day ceiling, real dates and no future periods', () => {
    const p = period('2026-10-04', '2026-10-04', now);
    expect(p.start.toISOString()).toBe('2026-10-03T23:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-10-04T23:00:00.000Z');
    expect(() => period('2026-02-30', '2026-03-01', now)).toThrow();
    expect(() => period('0000-01-01', '0000-01-01', now)).toThrow();
    expect(() => period('2026-10-04', '2026-10-05', now)).toThrow();
    expect(() => period('2026-10-04', '2026-10-03', now)).toThrow();
    expect(() => period('2026-06-01', '2026-10-01', now)).toThrow();
    expect(
      period('2026-10-04', '2026-10-04', new Date('2026-10-03T23:30:00Z'))
        .start,
    ).toEqual(p.start);
  });
  it('does no database work when measurement is disabled', async () => {
    const transaction = jest.fn();
    const service = new ParcoursService({ $transaction: transaction } as never);
    expect(await service.ingest({ evenements: [event()] }, now)).toEqual({
      actif: false,
      enregistre: false,
    });
    expect(transaction).not.toHaveBeenCalled();
  });
  it('rejects free fields, impossible dimensions, stale days and fabricated sales before a transaction', async () => {
    process.env.PARCOURS_METRICS_ENABLED = 'true';
    const transaction = jest.fn(),
      service = new ParcoursService({ $transaction: transaction } as never);
    for (const invalid of [
      null,
      [],
      { ...event(), email: 'private@example.invalid' },
      { ...event(), evenement: 'COMMANDE_ENREGISTREE' },
      { ...event(), reception: 'RETRAIT' },
      { ...event(), jour: '2026-10-01' },
      { ...event(), jour: '2026-10-05' },
    ])
      await expect(
        service.ingest({ evenements: [invalid] } as never, now),
      ).rejects.toThrow();
    expect(transaction).not.toHaveBeenCalled();
    for (const invalid of [
      null,
      { evenements: 'invalid' },
      { evenements: [event()], email: 'private@example.invalid' },
    ])
      await expect(service.ingest(invalid as never, now)).rejects.toThrow();
  });
  it('does not write an audit IP, account or correlation ID for aggregate observations', async () => {
    const log = jest.spyOn(Logger.prototype, 'log'),
      warn = jest.spyOn(Logger.prototype, 'warn');
    for (const route of [
      '/api/parcours/evenements',
      '/api/parcours/evenements/',
      '/API/PARCOURS/EVENEMENTS',
    ]) {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            path: route,
            url: '/api/parcours/evenements?email=private',
            ip: '192.0.2.1',
            requestId: 'private-correlation',
            user: { email: 'private@example.invalid' },
          }),
        }),
      };
      expect(
        await firstValueFrom(
          new AuditLogInterceptor().intercept(context as never, {
            handle: () => of({ enregistre: true }),
          }),
        ),
      ).toEqual({ enregistre: true });
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    }
  });
});
