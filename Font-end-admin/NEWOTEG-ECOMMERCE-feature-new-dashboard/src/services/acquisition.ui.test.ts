import { describe, expect, it, vi } from 'vitest';
vi.mock('./api', () => ({ default: { get: vi.fn() } }));
import { acquisitionChannels, parseAcquisitionReport } from './acquisition';
const period = { debut: '2026-10-01', fin: '2026-10-07' };
const fixture = () => ({ ...period, fuseau: 'Africa/Douala', observations: [], canaux: [...acquisitionChannels, null].map(canalEntree => ({ canalEntree, devisDemandes: 1, commandesEnregistrees: 2, commandesRecues: 1 })) });
describe('Closed acquisition report', () => {
  it('keeps unknown historical sources distinct and never exposes extra data', () => {
    const result = parseAcquisitionReport({ ...fixture(), privateNote: 'private' }, period);
    expect(result.canaux.at(-1)?.canalEntree).toBeNull();
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('rejects duplicates, free source names, bad counts, impossible reception totals and a stale period', () => {
    for (const change of [
      { canaux: [fixture().canaux[0], ...fixture().canaux.slice(0, 5)] },
      { canaux: [{ ...fixture().canaux[0], canalEntree: 'https://private.invalid' }, ...fixture().canaux.slice(1)] },
      { canaux: [{ ...fixture().canaux[0], commandesRecues: 3 }, ...fixture().canaux.slice(1)] },
      { canaux: [{ ...fixture().canaux[0], devisDemandes: -1 }, ...fixture().canaux.slice(1)] },
      { debut: '2026-09-01' },
    ]) expect(() => parseAcquisitionReport({ ...fixture(), ...change }, period)).toThrow();
  });
});
