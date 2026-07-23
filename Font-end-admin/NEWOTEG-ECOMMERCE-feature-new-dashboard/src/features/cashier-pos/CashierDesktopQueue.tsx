import { Filter, ListChecks, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CashierCountdown } from './CashierCountdown';
import { cashierSellerName, money, type CashierTicket } from './types';
import type { CashierCheckoutFlow } from './useCashierCheckoutFlow';

export function CashierDesktopQueue({ flow }: { flow: CashierCheckoutFlow }) {
  const [query, setQuery] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const urgentCount = useMemo(() => flow.tickets.filter(ticket => new Date(ticket.expiresAt).getTime() - Date.now() < 180_000).length, [flow.tickets]);
  const tickets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return flow.tickets.filter(ticket => {
      const urgent = new Date(ticket.expiresAt).getTime() - Date.now() < 180_000;
      if (urgentOnly && !urgent) return false;
      return !normalized || `${ticket.numeroTicket} ${cashierSellerName(ticket)} ${ticket.nomClient || ''}`.toLowerCase().includes(normalized);
    });
  }, [flow.tickets, query, urgentOnly]);

  return (
    <aside aria-label="File active" className="min-h-0 overflow-hidden border-r border-slate-200 bg-white">
      <div className="px-6 pb-4 pt-5">
        <h2 className="text-xl font-bold text-slate-950">File active</h2>
        <div className="mt-4 flex gap-3">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Rechercher un ticket</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un ticket" className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-primary" />
          </label>
          <button type="button" aria-pressed={urgentOnly} onClick={() => setUrgentOnly(value => !value)} aria-label="Filtrer les tickets urgents" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${urgentOnly ? 'border-primary bg-indigo-50 text-primary' : 'border-slate-300 text-slate-700'}`}><Filter size={20} /></button>
        </div>
        <div className="mt-4 flex gap-3 text-xs font-semibold">
          <span className="rounded-md border border-blue-200 px-3 py-2 text-primary">{flow.tickets.length} en attente</span>
          <span className="rounded-md border border-orange-200 px-3 py-2 text-orange-600">{urgentCount} urgent{urgentCount > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="h-[calc(100%-9.75rem)] overflow-y-auto px-3 pb-6">
        {flow.loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : tickets.length === 0 ? (
          <div className="px-5 py-14 text-center"><ListChecks className="mx-auto text-emerald-600" size={34} /><p className="mt-3 font-semibold text-slate-800">Aucun ticket à afficher</p></div>
        ) : tickets.map(ticket => {
          const active = flow.selected?.id === ticket.id;
          const units = ticket.lignes.reduce((sum, line) => sum + line.quantite, 0);
          return (
            <button key={ticket.id} type="button" onClick={() => flow.selectTicket(ticket)} className={`relative w-full border-b border-slate-200 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${active ? 'bg-blue-50/80' : 'bg-white'}`}>
              {active && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
              <div className="grid grid-cols-[62px_minmax(0,1fr)_auto] items-start gap-3">
                <CashierCountdown date={ticket.expiresAt} />
                <div className="min-w-0"><p className={`font-bold ${active ? 'text-primary' : 'text-slate-950'}`}>Ticket {ticket.numeroTicket}</p><p className="mt-1 truncate text-sm text-slate-600">{cashierSellerName(ticket)} · {Math.max(1, Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / 60_000))} min</p><p className="mt-2 text-sm text-slate-600">{units} article{units > 1 ? 's' : ''}</p></div>
                <strong className="self-end whitespace-nowrap text-sm text-slate-800">{money(ticket.montantTotal)}</strong>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
