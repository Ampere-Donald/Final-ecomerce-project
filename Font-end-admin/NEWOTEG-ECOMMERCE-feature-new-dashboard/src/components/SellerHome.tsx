import { ChevronRight, Package, Plus, ReceiptText, ScanBarcode, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SellerTicketSummary {
  id: string;
  numeroTicket?: string;
  createdAt?: string;
  montantTotal?: number | string;
  statut?: string;
}

interface SellerHomeProps {
  name: string;
  pendingCount: number | null;
  offlineCount: number;
  loading: boolean;
  recentTickets: SellerTicketSummary[];
}

const money = (value?: number | string) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0)).replace(/\s/g, ' ') + ' FCFA';

export function SellerHome({ name, pendingCount, offlineCount, loading, recentTickets }: SellerHomeProps) {
  return (
    <main className="mx-auto max-w-5xl space-y-5 md:space-y-6">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4 md:border-0 md:pb-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Newoteg" className="h-10 w-10 object-contain md:h-12 md:w-12" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Espace vendeur</p>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-950 md:text-2xl">Bonjour {name}</h1>
          </div>
        </div>
        <Link to="/mes-tickets" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600" aria-label="Voir mes tickets">
          <ReceiptText size={20} />
        </Link>
      </header>

      <section aria-labelledby="seller-summary-title">
        <div className="mb-3">
          <h2 id="seller-summary-title" className="text-sm font-bold text-slate-900">Résumé du jour</h2>
          <p className="text-xs text-slate-400">Votre activité boutique, en un coup d’œil.</p>
        </div>
        <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
          <Link to="/mes-tickets" className="flex min-h-24 items-center gap-4 border-b border-slate-100 px-4 py-4 md:border-b-0">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-primary"><ReceiptText size={21} /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">Tickets à encaisser</span><strong className="mt-1 block text-2xl text-primary">{loading ? '…' : pendingCount ?? 0}</strong></span>
            <ChevronRight size={18} className="text-slate-300" />
          </Link>
          <Link to="/offline-queue" className="flex min-h-20 items-center gap-4 border-b border-slate-100 px-4 py-4 md:min-h-24 md:border-b-0">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ShoppingCart size={21} /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">Ventes à synchroniser</span><strong className="mt-1 block text-xl text-slate-900">{offlineCount}</strong></span>
            <ChevronRight size={18} className="text-slate-300" />
          </Link>
          <Link to="/produits" className="hidden min-h-24 items-center gap-4 px-4 py-4 md:flex">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Package size={21} /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">Catalogue</span><strong className="mt-1 block text-base text-slate-900">Prêt à vendre</strong></span>
            <ChevronRight size={18} className="text-slate-300" />
          </Link>
        </div>
      </section>

      <Link to="/pos" className="group flex min-h-24 items-center gap-4 rounded-xl bg-primary px-5 py-5 text-white shadow-[0_12px_28px_rgba(28,25,163,0.18)] md:min-h-28 md:px-7">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-primary"><Plus size={25} strokeWidth={2.5} /></span>
        <span className="min-w-0 flex-1"><strong className="block text-lg">Commencer une vente</strong><span className="mt-0.5 block text-sm text-white/75">Rechercher, scanner et ajouter des produits</span></span>
        <ChevronRight size={22} className="text-white/70 transition-transform group-hover:translate-x-1" />
      </Link>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5" aria-labelledby="recent-tickets-title">
          <div className="flex items-center justify-between">
            <h2 id="recent-tickets-title" className="text-sm font-bold text-slate-900">Tickets récents</h2>
            <Link to="/mes-tickets" className="text-xs font-bold text-primary">Voir tout</Link>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {recentTickets.length === 0 ? <p className="py-6 text-center text-xs text-slate-400">Aucun ticket récent.</p> : recentTickets.slice(0, 4).map(ticket => (
              <div key={ticket.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="truncate font-mono text-xs font-bold text-slate-800">{ticket.numeroTicket || 'Ticket'}</p><p className="mt-0.5 text-[11px] text-slate-400">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Aujourd’hui'}</p></div>
                <div className="text-right"><p className="text-xs font-bold text-slate-800">{money(ticket.montantTotal)}</p><span className="text-[10px] font-semibold text-emerald-700">{ticket.statut === 'EN_ATTENTE' ? 'En attente' : 'Traité'}</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5" aria-labelledby="seller-shortcuts-title">
          <h2 id="seller-shortcuts-title" className="text-sm font-bold text-slate-900">Accès rapides</h2>
          <div className="mt-3 grid gap-2">
            <Link to="/pos" className="flex min-h-12 items-center gap-3 rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-700"><ScanBarcode size={18} className="text-primary" />Scanner un article</Link>
            <Link to="/mes-tickets" className="flex min-h-12 items-center gap-3 rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-700"><ReceiptText size={18} className="text-primary" />Mes tickets</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
