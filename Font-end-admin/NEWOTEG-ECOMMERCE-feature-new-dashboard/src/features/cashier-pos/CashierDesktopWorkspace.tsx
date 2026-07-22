import { AlertCircle } from 'lucide-react';
import { CashierDesktopShell } from './CashierDesktopShell';
import { CashierDesktopProgress } from './CashierDesktopProgress';
import { CashierDesktopQueue } from './CashierDesktopQueue';
import { CashierDesktopWorkArea } from './CashierDesktopWorkArea';
import type { CashierCheckoutFlow } from './useCashierCheckoutFlow';

export function CashierDesktopWorkspace({ flow, onHelp, onNextTicket }: { flow: CashierCheckoutFlow; onHelp: () => void; onNextTicket: () => void }) {
  const progressStep = flow.selected ? flow.step : 'TICKET';

  return (
    <CashierDesktopShell
      caisseStatus={flow.caisse?.statut}
      onHelp={onHelp}
      progress={<CashierDesktopProgress step={progressStep} />}
      alert={flow.error ? <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700"><AlertCircle size={17} />{flow.error}</div> : null}
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,25%)_minmax(0,1fr)_minmax(280px,22%)] bg-white">
        <CashierDesktopQueue flow={flow} />
        <CashierDesktopWorkArea flow={flow} onNextTicket={onNextTicket} />
      </div>
    </CashierDesktopShell>
  );
}
