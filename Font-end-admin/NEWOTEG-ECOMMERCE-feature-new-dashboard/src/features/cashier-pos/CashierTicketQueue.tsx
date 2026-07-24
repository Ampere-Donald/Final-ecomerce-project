import { ChevronRight, ListChecks, Loader2, ReceiptText } from 'lucide-react';
import type { CashierCheckoutFlow } from './useCashierCheckoutFlow';
import { CashierCountdown } from './CashierCountdown';
import { cashierSellerName, money, type CashierTicket } from './types';
import { CustomerRequestNotice } from './CustomerRequestNotice';

interface QueueCardProps {
  ticket: CashierTicket;
  active: boolean;
  onClick: () => void;
}

function QueueCard({ ticket, active, onClick }: QueueCardProps) {
  const units = ticket.lignes.reduce((sum, line) => sum + line.quantite, 0);
  const seller = cashierSellerName(ticket);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full border bg-white p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:rounded-xl ${active ? 'border-primary shadow-[0_5px_18px_rgba(28,25,163,.1)]' : 'border-slate-200 hover:border-slate-300'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-primary">
          <ReceiptText size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-base font-extrabold text-slate-950">{ticket.numeroTicket}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{seller} · {units} article{units > 1 ? 's' : ''}</p>
        </div>
        <CashierCountdown date={ticket.expiresAt} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <strong className="text-lg text-primary">{money(ticket.montantTotal)}</strong>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">Encaisser <ChevronRight size={16} /></span>
      </div>
      <CustomerRequestNotice request={ticket.noteCaissier} compact />
    </button>
  );
}

export function CashierTicketQueue({ flow }: { flow: CashierCheckoutFlow }) {
  return (
    <section aria-label="Tickets à encaisser">
      <div className="mb-3 flex items-end justify-between px-3 md:px-0">
        <div>
          <h2 className="font-bold text-slate-950">Tickets à encaisser</h2>
          <p className="text-xs text-slate-500">{flow.tickets.length} en attente</p>
        </div>
        <span className="text-xs font-bold text-slate-600">{money(flow.queueTotal)}</span>
      </div>
      <div className="space-y-3 md:max-h-[calc(100vh-11rem)] md:overflow-y-auto md:pr-1">
        {flow.loading ? (
          <div className="flex justify-center py-14 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : flow.tickets.length === 0 ? (
          <div className="border border-slate-200 bg-white px-5 py-12 text-center md:rounded-xl">
            <ListChecks className="mx-auto text-emerald-600" size={34} />
            <p className="mt-3 font-semibold text-slate-800">File terminée</p>
            <p className="mt-1 text-xs text-slate-500">Les nouveaux tickets apparaîtront ici.</p>
          </div>
        ) : flow.tickets.map(ticket => (
          <QueueCard key={ticket.id} ticket={ticket} active={flow.selected?.id === ticket.id} onClick={() => flow.selectTicket(ticket)} />
        ))}
      </div>
    </section>
  );
}
