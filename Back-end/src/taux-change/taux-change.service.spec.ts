import { Devise, SourceTaux } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { TauxChangeService } from './taux-change.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const d = (v: string | number) => new Decimal(v.toString());

const makeDbRate = (taux: string, source: SourceTaux = SourceTaux.API) => ({
  devise: Devise.CNY,
  tauxVersFcfa: d(taux),
  source,
  fetchedAt: new Date('2026-01-01'),
});

// ─── TauxChangeService.getLatest() ──────────────────────────────────────────

describe('TauxChangeService.getLatest()', () => {
  let service: TauxChangeService;
  let db: any;
  let fetchSpy: jest.SpyInstance | undefined;

  beforeEach(() => {
    db = {
      tauxChange: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new TauxChangeService(db);
    fetchSpy = undefined;
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it('FCFA — retourne taux=1 sans appel API ni DB', async () => {
    const result = await service.getLatest(Devise.FCFA);

    expect(result.tauxVersFcfa.toNumber()).toBe(1);
    expect(result.fromCache).toBe(false);
    expect(result.alerteEcart).toBeUndefined();
    expect(db.tauxChange.create).not.toHaveBeenCalled();
  });

  it('CNY — succès API : sauvegarde en DB, retourne fromCache=false', async () => {
    // 1 CNY = 0.1 EUR; 0.1 * 655.957 = 65.5957 FCFA
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { EUR: 0.1 } }),
    } as any);

    const savedRate = makeDbRate('65.5957');
    db.tauxChange.create.mockResolvedValue(savedRate);

    const result = await service.getLatest(Devise.CNY);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(db.tauxChange.create).toHaveBeenCalledTimes(1);
    expect(db.tauxChange.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ devise: Devise.CNY, source: SourceTaux.API }),
      }),
    );
    expect(result.fromCache).toBe(false);
    expect(result.source).toBe(SourceTaux.API);
    expect(result.tauxVersFcfa.toNumber()).toBeCloseTo(65.5957, 2);
  });

  it('CNY — API HTTP non-OK : propage erreur vers fallback', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as any);
    db.tauxChange.findFirst.mockResolvedValue(makeDbRate('84'));

    const result = await service.getLatest(Devise.CNY);

    expect(result.fromCache).toBe(true);
    expect(result.tauxVersFcfa.toNumber()).toBe(84);
    expect(result.alerteEcart).toBeDefined();
  });

  it('CNY — API KO (réseau) : fallback sur dernier taux connu, fromCache=true', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    db.tauxChange.findFirst.mockResolvedValue(makeDbRate('84'));

    const result = await service.getLatest(Devise.CNY);

    expect(result.fromCache).toBe(true);
    expect(result.tauxVersFcfa.toNumber()).toBe(84);
    expect(result.alerteEcart).toBeDefined();
    expect(result.alerteEcart).toContain('API indisponible');
    expect(db.tauxChange.create).not.toHaveBeenCalled();
  });

  it('CNY — API KO + aucun historique : retourne taux=1 avec alerte manuelle', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    db.tauxChange.findFirst.mockResolvedValue(null);

    const result = await service.getLatest(Devise.CNY);

    expect(result.tauxVersFcfa.toNumber()).toBe(1);
    expect(result.fromCache).toBe(false);
    expect(result.alerteEcart).toBeDefined();
    expect(result.alerteEcart).toContain('manuellement');
  });

  it('CNY — stateless : deux appels successifs à taux différents restent indépendants', async () => {
    // Premier appel : API retourne EUR=0.1 → 65.5957 FCFA
    fetchSpy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { EUR: 0.1 } }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { EUR: 0.2 } }) } as any);

    db.tauxChange.create
      .mockResolvedValueOnce(makeDbRate('65.5957'))
      .mockResolvedValueOnce(makeDbRate('131.1914'));

    const r1 = await service.getLatest(Devise.CNY);
    const r2 = await service.getLatest(Devise.CNY);

    expect(r1.tauxVersFcfa.toNumber()).toBeCloseTo(65.5957, 2);
    expect(r2.tauxVersFcfa.toNumber()).toBeCloseTo(131.1914, 2);
  });
});

// ─── TauxChangeService.saveManual() ─────────────────────────────────────────

describe('TauxChangeService.saveManual()', () => {
  let service: TauxChangeService;
  let db: any;

  beforeEach(() => {
    db = {
      tauxChange: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new TauxChangeService(db);
  });

  it('sauvegarde le taux avec source=MANUEL', async () => {
    db.tauxChange.create.mockResolvedValue(makeDbRate('84', SourceTaux.MANUEL));
    db.tauxChange.findFirst.mockResolvedValue(null);

    const result = await service.saveManual(Devise.CNY, 84);

    expect(db.tauxChange.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          devise: Devise.CNY,
          source: SourceTaux.MANUEL,
        }),
      }),
    );
    expect(result.source).toBe(SourceTaux.MANUEL);
  });

  it('aucune alerte si écart < 15% par rapport au dernier taux API', async () => {
    // Écart = |84 - 82| / 82 ≈ 2.4%
    db.tauxChange.create.mockResolvedValue(makeDbRate('84', SourceTaux.MANUEL));
    db.tauxChange.findFirst.mockResolvedValue(makeDbRate('82'));

    const result = await service.saveManual(Devise.CNY, 84);

    expect(result.alerteEcart).toBeUndefined();
  });

  it('retourne alerteEcart si écart > 15% du dernier taux API', async () => {
    // Écart = |100 - 80| / 80 = 25%
    db.tauxChange.create.mockResolvedValue(makeDbRate('100', SourceTaux.MANUEL));
    db.tauxChange.findFirst.mockResolvedValue(makeDbRate('80'));

    const result = await service.saveManual(Devise.CNY, 100);

    expect(result.alerteEcart).toBeDefined();
    expect(result.alerteEcart).toMatch(/25%/);
    expect(result.alerteEcart).toContain('80');
  });

  it('aucune alerte si aucun taux API de référence disponible', async () => {
    db.tauxChange.create.mockResolvedValue(makeDbRate('100', SourceTaux.MANUEL));
    db.tauxChange.findFirst.mockResolvedValue(null);

    const result = await service.saveManual(Devise.CNY, 100);

    expect(result.alerteEcart).toBeUndefined();
  });

  it('exactement 15% : pas d\'alerte (seuil strict > 15%)', async () => {
    // Écart = |115 - 100| / 100 = 15.0% — seuil est STRICT : > 0.15, pas >=
    db.tauxChange.create.mockResolvedValue(makeDbRate('115', SourceTaux.MANUEL));
    db.tauxChange.findFirst.mockResolvedValue(makeDbRate('100'));

    const result = await service.saveManual(Devise.CNY, 115);

    expect(result.alerteEcart).toBeUndefined();
  });
});
