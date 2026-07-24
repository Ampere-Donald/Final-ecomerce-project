import { Check, Loader2 } from 'lucide-react';
import type { CashierCheckoutFlow } from './useCashierCheckoutFlow';
import { money } from './types';
import { CustomerRequestNotice } from './CustomerRequestNotice';

const documentLabels = {
  TICKET_CAISSE: 'Ticket',
  FACTURE: 'Facture',
  BON_VENTE: 'Bon de vente',
};

const paymentLabels = {
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARTE: 'Carte',
  VIREMENT: 'Virement',
  CREDIT: 'Crédit',
};

export function CashierCheckoutSummary({ flow }: { flow: CashierCheckoutFlow }) {
  if (!flow.selected) return null;

  return (
    <aside className="border border-slate-200 bg-white p-4 lg:sticky lg:top-3 lg:self-start lg:rounded-xl">
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Résumé de la vente</p>
      <div className="mt-4 divide-y divide-slate-100">
        <div className="flex justify-between gap-3 py-3 text-sm"><span className="text-slate-500">Articles</span><strong>{flow.selected.lignes.length}</strong></div>
        <div className="flex justify-between gap-3 py-3 text-sm"><span className="text-slate-500">Document</span><strong>{documentLabels[flow.documentType]}</strong></div>
        <div className="flex justify-between gap-3 py-3 text-sm"><span className="text-slate-500">Paiement</span><strong>{paymentLabels[flow.method]}</strong></div>
        {flow.customer && <div className="py-3 text-sm"><span className="block text-slate-500">Client</span><strong className="mt-1 block truncate">{flow.customer.nom} {flow.customer.prenom || ''}</strong></div>}
      </div>
      <CustomerRequestNotice request={flow.selected.noteCaissier} compact />
      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex items-end justify-between gap-3"><span className="font-bold text-slate-700">Total</span><strong className="text-2xl text-primary">{money(flow.total)}</strong></div>
        {flow.method === 'ESPECES' && flow.change > 0 && <div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Monnaie</span><strong className="text-emerald-700">{money(flow.change)}</strong></div>}
      </div>
      {flow.step === 'PAYMENT' && (
        <button type="button" onClick={() => void flow.checkout()} disabled={!flow.canPay} className="mt-5 hidden min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 font-extrabold text-white disabled:opacity-40 md:flex">
          {flow.submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          Valider le paiement
        </button>
      )}
      <p className="mt-4 text-center text-[11px] text-slate-400">Seul le caissier peut rattacher un client et encaisser.</p>
    </aside>
  );
}
