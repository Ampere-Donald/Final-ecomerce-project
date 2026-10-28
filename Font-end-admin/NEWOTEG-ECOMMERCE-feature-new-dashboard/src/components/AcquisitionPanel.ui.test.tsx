import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { AcquisitionReport } from '../services/acquisition';
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('../services/acquisition', () => ({ loadAcquisition: mocks.load }));
import AcquisitionPanel from './AcquisitionPanel';
it('ignores an earlier period response, refreshes the same period and preserves the error state', async () => {
  let first: (r: AcquisitionReport) => void = () => {};
  mocks.load.mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockResolvedValueOnce({ debut: '2026-10-02', fin: '2026-10-02', fuseau: 'Africa/Douala', canaux: [{ canalEntree: 'SOCIAL', devisDemandes: 17, commandesEnregistrees: 0, commandesRecues: 0 }] });
  const view = render(<AcquisitionPanel period={{ debut: '2026-10-01', fin: '2026-10-01' }} />);
  view.rerender(<AcquisitionPanel period={{ debut: '2026-10-02', fin: '2026-10-02' }} />);
  await screen.findByText('17');
  await act(async () => first({ debut: '2026-10-01', fin: '2026-10-01', fuseau: 'Africa/Douala', canaux: [] }));
  expect(screen.getByText('17')).toBeTruthy();
  mocks.load.mockRejectedValueOnce(Error('Unavailable'));
  view.rerender(<AcquisitionPanel period={{ debut: '2026-10-02', fin: '2026-10-02' }} />);
  await screen.findByText(/Répartition indisponible/);
  expect(mocks.load).toHaveBeenCalledTimes(3);
});
