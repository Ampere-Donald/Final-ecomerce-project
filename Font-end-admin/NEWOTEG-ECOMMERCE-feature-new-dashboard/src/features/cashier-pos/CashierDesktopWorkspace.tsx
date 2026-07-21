import { useEffect, useState } from 'react';
import { AlertCircle, CircleHelp, Printer, UserRound } from 'lucide-react';
import { CashierDesktopProgress } from './CashierDesktopProgress';
import { CashierDesktopQueue } from './CashierDesktopQueue';
import { CashierDesktopWorkArea } from './CashierDesktopWorkArea';
import type { CashierCheckoutFlow } from './useCashierCheckoutFlow';

export function CashierDesktopWorkspace({ flow, onHelp, onNextTicket }: { flow: CashierCheckoutFlow; onHelp: () => void; onNextTicket: () => void }) {
  const [printer, setPrinter] = useState({ connected: false, name: 'Imprimante à vérifier' });

  useEffect(() => {
    let mounted = true;
    void import('../../services/qzPrinter').then(module => {
      if (!mounted) return;
      setPrinter({ connected: module.isConnected(), name: module.getPrinterName() || 'Imprimante non configurée' });
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const open = flow.caisse?.statut === 'OUVERTE';
  const name = (() => {
    try {
      const admin = JSON.parse(localStorage.getItem('newoteg_admin_user') || 'null');
      return admin?.nom || admin?.username || 'Caissier';
    } catch {
      return 'Caissier';
    }
  })();
  const progressStep = flow.selected ? flow.step : 'TICKET';

  return (
    <section className="hidden h-screen min-[1200px]:flex min-[1200px]:flex-col" data-cashier-desktop>
      <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-7">
        <strong className="text-lg">Caisse {open ? 'ouverte' : 'à vérifier'}</strong>
        <span className={`ml-6 h-3 w-3 rounded-full ${open ? 'bg-emerald-600' : 'bg-amber-500'}`} />
        <span className="ml-3 text-base">{open ? 'À jour' : 'Statut indisponible'}</span>
        <span className="mx-7 h-7 w-px bg-slate-200" />
        <Printer size={23} className={printer.connected ? 'text-emerald-700' : 'text-slate-700'} />
        <span className="ml-3 text-base">{printer.connected ? `${printer.name} connectée` : printer.name}</span>
        <div className="ml-auto flex items-center gap-3"><UserRound size={23} /><span className="font-medium">{name}</span><button type="button" onClick={onHelp} aria-label="Aide de la caisse" className="ml-6 flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"><CircleHelp size={25} /></button></div>
      </header>
      <CashierDesktopProgress step={progressStep} />
      {flow.error && <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700"><AlertCircle size={17} />{flow.error}</div>}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,25%)_minmax(0,1fr)_minmax(280px,22%)] bg-white">
        <CashierDesktopQueue flow={flow} />
        <CashierDesktopWorkArea flow={flow} onNextTicket={onNextTicket} />
      </div>
    </section>
  );
}
