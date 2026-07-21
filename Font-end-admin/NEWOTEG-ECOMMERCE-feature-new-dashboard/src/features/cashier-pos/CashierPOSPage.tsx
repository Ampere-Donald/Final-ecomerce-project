import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CircleHelp, Wallet, X } from 'lucide-react';
import { useFlowShellFocus } from '../../context/FlowShellContext';
import { CashierCheckoutPanel } from './CashierCheckoutPanel';
import { CashierCheckoutSummary } from './CashierCheckoutSummary';
import { CashierTicketQueue } from './CashierTicketQueue';
import { money } from './types';
import { useCashierCheckoutFlow, type CashierCheckoutFlow } from './useCashierCheckoutFlow';

export function CashierPOSView({ flow }: { flow: CashierCheckoutFlow }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => localStorage.getItem('newoteg_pos_shortcuts_enabled') !== 'false');

  useEffect(() => {
    localStorage.setItem('newoteg_pos_shortcuts_enabled', String(shortcutsEnabled));
  }, [shortcutsEnabled]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (event.key === '?' && !editing) {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (!shortcutsEnabled || editing || !flow.selected || flow.step !== 'PAYMENT') return;
      if (!['F2', 'F3', 'F4', 'F8'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'F2') flow.setMethod('ESPECES');
      if (event.key === 'F3') flow.setMethod('MOBILE_MONEY');
      if (event.key === 'F4') flow.setMethod('CARTE');
      if (event.key === 'F8' && flow.canPay) void flow.checkout();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [flow.canPay, flow.checkout, flow.selected, flow.setMethod, flow.step, shortcutsEnabled]);

  const nextTicket = () => {
    const next = flow.tickets.find(ticket => ticket.id !== flow.selected?.id);
    if (next) flow.selectTicket(next);
    else flow.closeTicket();
  };

  const success = flow.step === 'SUCCESS';

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen bg-slate-50 md:min-h-0 ${flow.selected && !success ? 'pb-24 md:pb-0' : ''}`}>
      <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-3 md:mb-3 md:rounded-xl md:border min-[1200px]:hidden">
        <div className="flex items-center gap-3"><img src="/logo.png" alt="Newoteg" className="h-10 w-10 object-contain" /><div><h1 className="font-extrabold text-slate-950">Tickets à encaisser</h1><p className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" />Synchronisé en temps réel</p></div></div>
        <button type="button" onClick={() => setHelpOpen(true)} aria-label="Aide de la caisse" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600"><CircleHelp size={20} /></button>
      </header>

      <header className="mb-5 hidden items-center justify-between min-[1200px]:flex">
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Poste de caisse</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">Encaissement</h1></div>
        <div className="flex items-center gap-3"><button type="button" onClick={() => setHelpOpen(true)} aria-label="Aide de la caisse" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"><CircleHelp size={20} /></button>{flow.caisse && <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><Wallet size={18} className="text-primary" /><div><p className="text-[11px] text-slate-500">Caisse {flow.caisse.statut === 'OUVERTE' ? 'ouverte' : 'fermée'}</p><strong className="text-sm">{money(flow.caisse.solde)}</strong></div></div>}</div>
      </header>

      {flow.error && <div role="alert" className="m-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:mx-0"><AlertCircle className="mt-0.5 shrink-0" size={17} />{flow.error}</div>}

      {success ? (
        <CashierCheckoutPanel flow={flow} onNextTicket={nextTicket} />
      ) : (
        <div className="grid gap-3 md:grid-cols-[minmax(190px,30%)_minmax(0,1fr)] lg:grid-cols-[minmax(180px,22%)_minmax(0,1fr)_220px] min-[1200px]:grid-cols-[300px_minmax(0,1fr)_280px] min-[1200px]:gap-5">
          <div className={`${flow.selected ? 'hidden md:block' : 'block'} md:sticky md:top-3 md:self-start`}><CashierTicketQueue flow={flow} /></div>
          <CashierCheckoutPanel flow={flow} onNextTicket={nextTicket} />
          <div className="hidden lg:block"><CashierCheckoutSummary flow={flow} /></div>
        </div>
      )}

      {helpOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={() => setHelpOpen(false)}><div role="dialog" aria-modal="true" aria-label="Aide caisse" className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-bold text-slate-950">Aide du poste de caisse</h2><button type="button" onClick={() => setHelpOpen(false)} aria-label="Fermer l’aide" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500"><X size={19} /></button></div><label className="mt-4 flex min-h-12 items-center justify-between rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-700"><span>Activer les raccourcis clavier</span><input type="checkbox" checked={shortcutsEnabled} onChange={event => setShortcutsEnabled(event.target.checked)} className="h-5 w-5 accent-primary" /></label><dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm"><dt className="font-mono font-bold">F2</dt><dd>Espèces</dd><dt className="font-mono font-bold">F3</dt><dd>Mobile Money</dd><dt className="font-mono font-bold">F4</dt><dd>Carte</dd><dt className="font-mono font-bold">F8</dt><dd>Valider le paiement</dd></dl></div></div>}
    </motion.main>
  );
}

export function CashierPOSPage() {
  const flow = useCashierCheckoutFlow();
  useFlowShellFocus(Boolean(flow.selected));
  return <CashierPOSView flow={flow} />;
}
