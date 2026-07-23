import { useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  CreditCard,
  HandCoins,
  Loader2,
  MessageCircle,
  Printer,
  Search,
  Smartphone,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { ReceiptGenerator } from '../../components/ReceiptGenerator';
import { useToast } from '../../components/ui/Toast';
import { CashierCountdown } from './CashierCountdown';
import type { CashierCheckoutFlow } from './useCashierCheckoutFlow';
import { cashierSellerName, money, type DocumentType, type PaymentMethod } from './types';

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'ESPECES', label: 'Espèces', icon: Banknote },
  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { id: 'CARTE', label: 'Carte', icon: CreditCard },
  { id: 'VIREMENT', label: 'Virement', icon: Building2 },
  { id: 'CREDIT', label: 'Crédit', icon: HandCoins },
];

const documents: { id: DocumentType; label: string }[] = [
  { id: 'FACTURE', label: 'Facture' },
  { id: 'BON_VENTE', label: 'Bon de vente' },
  { id: 'TICKET_CAISSE', label: 'Ticket' },
];

function Progress({ step }: { step: CashierCheckoutFlow['step'] }) {
  const active = step === 'TICKET' ? 1 : step === 'CUSTOMER' ? 2 : step === 'PAYMENT' ? 3 : 4;
  return (
    <ol aria-label="Progression de l’encaissement" className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-[10px] font-bold text-slate-400 sm:text-xs">
      {['Ticket', 'Client', 'Paiement', 'Confirmation'].map((label, index) => {
        const position = index + 1;
        return <li key={label} className={position <= active ? 'text-primary' : ''}><span className={`mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${position < active ? 'bg-emerald-600 text-white' : position === active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>{position < active ? '✓' : position}</span>{label}</li>;
      })}
    </ol>
  );
}

function TicketLines({ flow }: { flow: CashierCheckoutFlow }) {
  if (!flow.selected) return null;
  return (
    <div className="border border-slate-200 bg-white p-4 md:rounded-xl">
      <h3 className="text-sm font-bold text-slate-950">Articles ({flow.selected.lignes.length})</h3>
      {flow.selected.noteCaissier && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><strong>Note du vendeur :</strong> {flow.selected.noteCaissier}</p>}
      <div className="mt-2 divide-y divide-slate-100">
        {flow.selected.lignes.map(line => (
          <div key={line.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0"><p className="truncate font-semibold text-slate-800">{line.nomProduit}</p><p className="text-xs text-slate-500">{line.quantite} × {money(line.prixUnitaire)}</p></div>
            <strong className="shrink-0 text-slate-900">{money(line.sousTotal)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashierCheckoutPanel({ flow, onNextTicket }: { flow: CashierCheckoutFlow; onNextTicket: () => void }) {
  const toast = useToast();
  const [printOpen, setPrintOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  if (!flow.selected) {
    return <section className="hidden min-h-[520px] items-center justify-center border border-slate-200 bg-white p-8 text-center md:flex md:rounded-xl"><div><UserRound className="mx-auto text-slate-300" size={40} /><h2 className="mt-4 font-bold text-slate-800">Sélectionnez un ticket</h2><p className="mt-2 max-w-sm text-sm text-slate-500">Le client, le paiement et le document seront traités étape par étape.</p></div></section>;
  }

  const resultDocument = flow.result?.facture;
  const clientName = flow.customer ? `${flow.customer.nom} ${flow.customer.prenom || ''}`.trim() : 'Client comptoir';
  const clientPhone = flow.customer?.telephone || flow.selected.telephoneClient || '';
  const seller = cashierSellerName(flow.selected);

  if (flow.step === 'SUCCESS') {
    const shareReceipt = () => {
      const text = encodeURIComponent(`Newoteg — ${resultDocument?.numero || flow.selected?.numeroTicket}\nTotal : ${money(flow.total)}\nPaiement validé.`);
      const phone = String(clientPhone).replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
    };

    return (
      <section className="border border-slate-200 bg-white p-5 text-center md:rounded-xl md:p-8 lg:col-span-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={34} strokeWidth={3} /></div>
        <h2 className="mt-4 text-2xl font-extrabold text-emerald-700">Paiement validé</h2>
        <p className="mt-2 text-3xl font-black text-primary">{money(flow.total)}</p>
        <div className="mx-auto mt-6 max-w-md border border-slate-200 p-4 text-left shadow-sm sm:rounded-xl">
          <div className="flex justify-between gap-3"><span className="text-sm text-slate-500">Document</span><strong>{resultDocument?.numero || flow.selected.numeroTicket}</strong></div>
          <div className="mt-3 flex justify-between gap-3"><span className="text-sm text-slate-500">Vendeur</span><strong>{seller}</strong></div>
          <div className="mt-3 flex justify-between gap-3"><span className="text-sm text-slate-500">Client</span><strong>{clientName}</strong></div>
          {clientPhone && <div className="mt-3 flex justify-between gap-3"><span className="text-sm text-slate-500">Téléphone</span><strong>{clientPhone}</strong></div>}
          <div className="mt-3 flex justify-between gap-3"><span className="text-sm text-slate-500">Mode</span><strong>{paymentMethods.find(item => item.id === flow.method)?.label}</strong></div>
          {flow.method === 'ESPECES' && <><div className="mt-3 flex justify-between gap-3"><span className="text-sm text-slate-500">Montant reçu</span><strong>{money(flow.cashReceived)}</strong></div><div className="mt-3 flex justify-between gap-3"><span className="text-sm text-slate-500">Monnaie</span><strong className="text-emerald-700">{money(flow.change)}</strong></div></>}
        </div>
        <p className="mt-4 text-sm font-semibold text-emerald-700">Vente enregistrée et stock mis à jour</p>
        <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setPrintOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-primary bg-white font-bold text-primary"><Printer size={18} />Imprimer le reçu</button>
          <button type="button" onClick={shareReceipt} disabled={!clientPhone} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40"><MessageCircle size={18} />Envoyer au client</button>
        </div>
        <button type="button" onClick={onNextTicket} className="mx-auto mt-3 min-h-12 w-full max-w-md rounded-lg bg-primary px-5 font-extrabold text-white">Ticket suivant</button>
        {printOpen && resultDocument && <ReceiptGenerator documentId={resultDocument.id} printCount={resultDocument.printCount || 0} type={flow.documentType === 'FACTURE' ? 'facture' : flow.documentType === 'BON_VENTE' ? 'bonVente' : 'ticket'} numero={resultDocument.numero} dateVente={resultDocument.dateEmission} methodePaiement={flow.method} montantTotal={flow.total} vendeur={seller} client={resultDocument.client ? { nom: `${resultDocument.client.nom} ${resultDocument.client.prenom || ''}`.trim(), telephone: resultDocument.client.telephone } : undefined} lignes={(resultDocument.lignes || []).map((line: any) => ({ nomProduit: line.nomProduit, quantite: line.quantite, prixUnitaire: Number(line.prixUnitaireTTC), sousTotal: Number(line.sousTotalTTC) }))} onClose={() => setPrintOpen(false)} />}
      </section>
    );
  }

  return (
    <section className="overflow-hidden border border-slate-200 bg-white md:rounded-xl">
      <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-3 md:px-5">
        <button type="button" onClick={flow.step === 'PAYMENT' ? () => flow.setStep('CUSTOMER') : flow.step === 'CUSTOMER' ? () => flow.setStep('TICKET') : flow.closeTicket} aria-label="Retour" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ArrowLeft size={20} /></button>
        <div className="min-w-0 flex-1"><p className="font-mono text-sm font-extrabold text-slate-950">{flow.selected.numeroTicket}</p><p className="truncate text-xs text-slate-500">{flow.selected.lignes.length} articles · {money(flow.total)}</p></div>
        <CashierCountdown date={flow.selected.expiresAt} />
      </header>
      <Progress step={flow.step} />

      {flow.step === 'TICKET' ? (
        <div className="p-3 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div><h2 className="text-xl font-extrabold text-primary">Ticket {flow.selected.numeroTicket}</h2><p className="mt-1 text-sm font-semibold text-slate-700">Vendeur : {seller}</p><p className="mt-1 text-sm text-slate-500">Vérifiez les articles avant de commencer l’encaissement.</p></div>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700"><Check size={18} />Stock vérifié</span>
          </div>
          <div className="mt-4"><TicketLines flow={flow} /></div>
          <button type="button" onClick={() => flow.setStep('CUSTOMER')} className="mt-4 hidden min-h-12 w-full rounded-lg bg-primary font-extrabold text-white md:block">Identifier le client</button>
        </div>
      ) : flow.step === 'CUSTOMER' ? (
        <div className="grid gap-4 p-3 md:p-5 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(260px,38%)]">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">Client du document</h2>
              <p className="mt-1 text-sm text-slate-500">Le numéro apparaîtra sur la facture ou le bon de vente.</p>
            </div>
            {flow.customer ? (
              <div className="border border-emerald-300 bg-emerald-50 p-4 sm:rounded-xl"><p className="flex items-center gap-2 text-xs font-bold text-emerald-700"><Check size={16} />Client trouvé</p><p className="mt-3 text-lg font-bold text-slate-950">{clientName}</p><p className="text-sm text-slate-600">{clientPhone}</p><button type="button" onClick={() => flow.setCustomer(null)} className="mt-3 min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">Changer de client</button></div>
            ) : (
              <>
                <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><input inputMode="tel" value={flow.customerQuery} onChange={event => flow.setCustomerQuery(event.target.value)} placeholder="Numéro de téléphone du client" className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-primary" />{flow.customerResults.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">{flow.customerResults.map(client => <button type="button" key={client.id} onClick={() => flow.setCustomer(client)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-slate-50"><strong>{client.nom} {client.prenom || ''}</strong><span className="text-xs text-slate-500">{client.telephone}</span></button>)}</div>}</div>
                <button type="button" onClick={() => { setCreateOpen(value => !value); setCustomerPhone(flow.customerQuery); }} className="flex min-h-11 items-center gap-2 text-sm font-bold text-primary"><UserPlus size={17} />Créer une fiche client</button>
                {createOpen && <div className="grid gap-2 border border-slate-200 bg-slate-50 p-3 sm:rounded-lg"><input value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Nom du client" className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none" /><input inputMode="tel" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} placeholder="Téléphone" className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none" /><button type="button" disabled={!customerName.trim() || !customerPhone.trim() || flow.creatingCustomer} onClick={() => void flow.createCustomer(customerName, customerPhone).then(created => { if (created) setCreateOpen(false); }).catch(() => toast.error('Le client n’a pas pu être créé.'))} className="min-h-11 rounded-lg bg-slate-900 text-sm font-bold text-white disabled:opacity-40">{flow.creatingCustomer ? 'Création…' : 'Créer et sélectionner'}</button></div>}
              </>
            )}
            <div className="flex items-center gap-3 py-1 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou<span className="h-px flex-1 bg-slate-200" /></div>
            <button type="button" onClick={() => { flow.setCustomer(null); flow.setStep('PAYMENT'); }} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700">Continuer avec client comptoir</button>
            <button type="button" onClick={() => flow.setStep('PAYMENT')} className="hidden min-h-12 w-full rounded-lg bg-primary text-sm font-extrabold text-white md:block">Continuer vers le paiement</button>
          </div>
          <TicketLines flow={flow} />
        </div>
      ) : (
        <div className="grid gap-4 p-3 md:p-5 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(260px,38%)]">
          <div className="space-y-5">
            {flow.customer && <div className="border border-emerald-300 bg-emerald-50 p-3 sm:rounded-lg"><p className="flex items-center gap-2 text-xs font-bold text-emerald-700"><Check size={16} />Client vérifié</p><p className="mt-1 font-bold text-slate-900">{clientName} · {clientPhone}</p></div>}
            <div><h2 className="text-sm font-bold text-slate-900">Type de document</h2><div className="mt-2 grid grid-cols-3 gap-2">{documents.map(item => <button type="button" key={item.id} onClick={() => flow.setDocumentType(item.id)} className={`min-h-11 rounded-lg px-2 text-xs font-bold ${flow.documentType === item.id ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{item.label}</button>)}</div></div>
            <div><h2 className="text-sm font-bold text-slate-900">Mode de paiement</h2><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{paymentMethods.map(item => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => flow.setMethod(item.id)} className={`flex min-h-14 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold ${flow.method === item.id ? 'border border-primary bg-indigo-50 text-primary' : 'border border-slate-200 bg-white text-slate-600'}`}><Icon size={18} />{item.label}</button>; })}</div></div>
            {flow.method === 'ESPECES' && <label className="block text-sm font-bold text-slate-700">Montant reçu<input autoFocus inputMode="numeric" value={flow.cashReceived} onChange={event => flow.setCashReceived(event.target.value)} placeholder={String(flow.total)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-lg font-bold outline-none focus:border-primary" />{flow.change > 0 && <span className="mt-3 flex justify-between text-base"><span>Monnaie à rendre</span><strong className="text-2xl text-emerald-700">{money(flow.change)}</strong></span>}</label>}
            {['MOBILE_MONEY', 'CARTE', 'VIREMENT'].includes(flow.method) && <label className="block text-sm font-bold text-slate-700">Référence de paiement<input value={flow.reference} onChange={event => flow.setReference(event.target.value)} placeholder="Facultatif" className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-primary" /></label>}
            {flow.method === 'CREDIT' && <div className="grid gap-3 border border-amber-200 bg-amber-50 p-4 sm:rounded-lg"><p className="text-xs font-semibold text-amber-800">Un client enregistré et une échéance sont obligatoires.</p><label className="text-sm font-bold">Acompte<input inputMode="numeric" value={flow.deposit} onChange={event => flow.setDeposit(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3" /></label><label className="text-sm font-bold">Échéance<input type="date" min={new Date().toISOString().slice(0, 10)} value={flow.dueDate} onChange={event => flow.setDueDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3" /></label>{flow.creditPreview && <p className={`rounded-lg p-3 text-xs font-bold ${flow.creditPreview.autorise ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{flow.creditPreview.autorise ? 'Crédit autorisé' : 'Limite de crédit dépassée'}</p>}</div>}
          </div>
          <TicketLines flow={flow} />
        </div>
      )}

      <div className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white p-3 shadow-[0_-6px_24px_rgba(15,23,42,.1)] md:hidden">
        <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-[11px] text-slate-500">Total à payer</p><p className="truncate text-lg font-black text-primary">{money(flow.total)}</p></div>{flow.step === 'TICKET' ? <button type="button" onClick={() => flow.setStep('CUSTOMER')} className="min-h-12 rounded-lg bg-primary px-5 font-extrabold text-white">Identifier</button> : flow.step === 'CUSTOMER' ? <button type="button" onClick={() => flow.setStep('PAYMENT')} className="min-h-12 rounded-lg bg-primary px-5 font-extrabold text-white">Continuer</button> : <button type="button" onClick={() => void flow.checkout()} disabled={!flow.canPay} className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 font-extrabold text-white disabled:opacity-40">{flow.submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}Encaisser</button>}</div>
      </div>
    </section>
  );
}
