import { useEffect, useState, type ReactNode } from 'react';
import { CircleHelp, Printer, UserRound } from 'lucide-react';
import { caisseJourApi } from '../../services/api';

type CashierStatus = 'OUVERTE' | 'FERMEE' | string | null | undefined;

export function CashierDesktopTopBar({
  caisseStatus,
  onHelp,
}: {
  caisseStatus: CashierStatus;
  onHelp?: () => void;
}) {
  const [printer, setPrinter] = useState({ connected: false, name: 'Imprimante à vérifier' });
  const [fetchedCaisseStatus, setFetchedCaisseStatus] = useState<CashierStatus>(null);
  const resolvedCaisseStatus = caisseStatus ?? fetchedCaisseStatus;

  useEffect(() => {
    if (caisseStatus) return;
    let mounted = true;
    const refreshCaisse = () => {
      void caisseJourApi.aujourdhui()
        .then(day => { if (mounted) setFetchedCaisseStatus(day?.statut); })
        .catch(() => { if (mounted) setFetchedCaisseStatus(null); });
    };
    refreshCaisse();
    const interval = window.setInterval(refreshCaisse, 15_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [caisseStatus]);

  useEffect(() => {
    let mounted = true;
    let interval: number | undefined;
    const refreshPrinter = () => {
      void import('../../services/qzPrinter').then(module => {
        if (!mounted) return;
        setPrinter({ connected: module.isConnected(), name: module.getPrinterName() || 'Imprimante non configurée' });
      }).catch(() => {
        if (mounted) setPrinter({ connected: false, name: 'Imprimante non disponible' });
      });
    };
    refreshPrinter();
    interval = window.setInterval(refreshPrinter, 5_000);
    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  const open = resolvedCaisseStatus === 'OUVERTE';
  const name = (() => {
    try {
      const admin = JSON.parse(localStorage.getItem('newoteg_admin_user') || 'null');
      return admin?.nom || admin?.username || 'Caissier';
    } catch {
      return 'Caissier';
    }
  })();

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-7" data-cashier-topbar>
      <strong className="text-lg text-slate-950">Caisse {open ? 'ouverte' : 'à vérifier'}</strong>
      <span className={`ml-6 h-3 w-3 rounded-full ${open ? 'bg-emerald-600' : 'bg-amber-500'}`} aria-hidden="true" />
      <span className="ml-3 text-base text-slate-700">{open ? 'À jour' : resolvedCaisseStatus === 'FERMEE' ? 'Fermée' : 'Statut indisponible'}</span>
      <span className="mx-7 h-7 w-px bg-slate-200" aria-hidden="true" />
      <Printer size={23} className={printer.connected ? 'text-emerald-700' : 'text-slate-600'} />
      <span className="ml-3 text-base text-slate-700">{printer.connected ? `${printer.name} connectée` : printer.name}</span>
      <div className="ml-auto flex items-center gap-3 text-slate-800">
        <UserRound size={23} />
        <span className="font-medium">{name}</span>
        {onHelp && (
          <button type="button" onClick={onHelp} aria-label="Aide de la caisse" className="ml-6 flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <CircleHelp size={25} />
          </button>
        )}
      </div>
    </header>
  );
}

export function CashierDesktopShell({
  caisseStatus,
  onHelp,
  progress,
  alert,
  children,
}: {
  caisseStatus: CashierStatus;
  onHelp?: () => void;
  progress?: ReactNode;
  alert?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="hidden h-screen min-[1200px]:flex min-[1200px]:flex-col" data-cashier-desktop>
      <CashierDesktopTopBar caisseStatus={caisseStatus} onHelp={onHelp} />
      {progress}
      {alert}
      {children}
    </section>
  );
}
