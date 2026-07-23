import { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  FileDown,
  FileText,
  HandCoins,
  Loader2,
  MessageCircle,
  Package,
  Printer,
  ReceiptText,
  Search,
  Smartphone,
  UserPlus,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { ReceiptGenerator } from '../../components/ReceiptGenerator';
import { cashierSellerName, money, type DocumentType, type PaymentMethod } from './types';
import type { CashierCheckoutFlow } from './useCashierCheckoutFlow';

const documents: { id: DocumentType; label: string }[] = [
  { id: 'TICKET_CAISSE', label: 'Ticket' },
  { id: 'FACTURE', label: 'Facture' },
  { id: 'BON_VENTE', label: 'Bon de vente' },
];

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'ESPECES', label: 'Espèces', icon: Banknote },
  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { id: 'CARTE', label: 'Carte', icon: CreditCard },
  { id: 'VIREMENT', label: 'Virement', icon: Building2 },
  { id: 'CREDIT', label: 'Crédit', icon: HandCoins },
];

const documentLabel = (type: DocumentType) => documents.find(item => item.id === type)?.label || 'Ticket';
const paymentLabel = (method: PaymentMethod) => paymentMethods.find(item => item.id === method)?.label || method;

function TicketStep({ flow }: { flow: CashierCheckoutFlow }) {
  const ticket = flow.selected!;
  const seller = cashierSellerName(ticket);
  return (
    <section className="min-h-0 overflow-y-auto px-8 py-6">
      <div className="flex items-start justify-between border-b border-slate-200 pb-5">
        <div><h1 className="text-3xl font-bold tracking-tight text-primary">Ticket {ticket.numeroTicket}</h1><p className="mt-5 flex items-center gap-3 text-slate-700"><UserRound size={20} />Vendeur <strong>{seller}</strong></p>{ticket.noteCaissier && <p className="mt-3 flex items-center gap-3 text-sm text-slate-700"><ReceiptText size={18} />Note <span>{ticket.noteCaissier}</span></p>}</div>
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={20} />Stock vérifié</span>
      </div>
      <table className="mt-5 w-full table-fixed text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-700"><tr><th className="w-2/5 py-4 font-semibold">Produit</th><th className="py-4 text-center font-semibold">Qté</th><th className="py-4 text-right font-semibold">Prix unitaire</th><th className="py-4 text-right font-semibold">Total</th></tr></thead>
        <tbody className="divide-y divide-slate-200">{ticket.lignes.map(line => <tr key={line.id}><td className="py-5 pr-3 text-slate-700">{line.nomProduit}</td><td className="py-5 text-center">{line.quantite}</td><td className="py-5 text-right">{money(line.prixUnitaire)}</td><td className="py-5 text-right font-medium">{money(line.sousTotal)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function CustomerStep({ flow }: { flow: CashierCheckoutFlow }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const clientName = flow.customer ? `${flow.customer.nom} ${flow.customer.prenom || ''}`.trim() : '';
  const clientPhone = flow.customer?.telephone || '';

  return (
    <section className="min-h-0 overflow-y-auto px-8 py-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Identifier le client</h1>
      <p className="mt-3 text-sm text-slate-600">Recherchez le numéro qui figurera sur la facture ou le bon de vente.</p>
      <form className="relative mt-6 flex" onSubmit={event => { event.preventDefault(); void flow.searchCustomers(); }}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={22} />
        <input inputMode="search" value={flow.customerQuery} onChange={event => flow.setCustomerQuery(event.target.value)} placeholder="Nom ou téléphone du client" aria-describedby="customer-search-feedback" className="h-16 min-w-0 flex-1 rounded-l-md border border-slate-300 bg-white pl-12 pr-4 text-xl font-medium outline-none focus:border-primary" />
        <button type="submit" disabled={flow.customerSearching || flow.customerQuery.trim().length < 2} className="flex h-16 min-w-40 items-center justify-center gap-2 rounded-r-md border border-l-0 border-primary px-8 font-bold text-primary disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">{flow.customerSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}Rechercher</button>
        {flow.customerResults.length > 0 && <div className="absolute inset-x-0 top-[4.15rem] z-20 border border-slate-200 bg-white shadow-xl">{flow.customerResults.map(client => <button key={client.id} type="button" onClick={() => flow.setCustomer(client)} className="flex min-h-14 w-full items-center justify-between px-4 text-left hover:bg-slate-50"><strong>{client.nom} {client.prenom || ''}</strong><span className="text-sm text-slate-500">{client.telephone}</span></button>)}</div>}
      </form>
      <div id="customer-search-feedback" aria-live="polite">
        {flow.customerSearchError && <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-red-700"><AlertCircle size={18} />{flow.customerSearchError}</p>}
        {!flow.customer && !flow.customerSearching && !flow.customerSearchError && flow.customerSearchAttempted && flow.customerQuery.trim().length >= 2 && flow.customerResults.length === 0 && <p className="mt-3 text-sm text-slate-600">Aucun client trouvé. Vous pouvez créer une nouvelle fiche.</p>}
      </div>
      {flow.customer && <div className="mt-5 flex min-h-16 items-center gap-5 bg-emerald-50 px-5 text-emerald-700"><CheckCircle2 size={28} /><strong className="text-lg">{clientName}</strong><span className="ml-auto text-slate-600">{clientPhone}</span><button type="button" onClick={() => flow.setCustomer(null)} className="font-semibold text-primary">Changer</button></div>}
      <div className="mt-6 grid grid-cols-2 divide-x border-b border-slate-200 pb-6">
        <button type="button" onClick={() => { setCreateOpen(value => !value); setPhone(flow.customerQuery); }} className="flex min-h-12 items-center justify-center gap-3 font-semibold text-primary"><UserPlus size={21} />Créer une fiche client</button>
        <button type="button" onClick={() => flow.setCustomer(null)} className="flex min-h-12 items-center justify-center gap-3 font-semibold text-primary"><UserRound size={21} />Utiliser Client comptoir</button>
      </div>
      {createOpen && <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-3 bg-slate-50 p-4"><input value={name} onChange={event => setName(event.target.value)} placeholder="Nom du client" className="h-11 border border-slate-300 px-3 outline-none focus:border-primary" /><input value={phone} onChange={event => setPhone(event.target.value)} placeholder="Téléphone" className="h-11 border border-slate-300 px-3 outline-none focus:border-primary" /><button type="button" disabled={!name.trim() || !phone.trim() || flow.creatingCustomer} onClick={() => void flow.createCustomer(name, phone).then(created => created && setCreateOpen(false))} className="bg-slate-900 px-5 font-bold text-white disabled:opacity-40">Créer</button></div>}
      <h2 className="mt-8 text-xl font-bold text-slate-950">Document à remettre</h2>
      <div className="mt-4 grid grid-cols-3 border-b border-slate-200">{documents.map(item => <button type="button" key={item.id} onClick={() => flow.setDocumentType(item.id)} className={`min-h-16 border-b-4 text-base font-medium ${flow.documentType === item.id ? 'border-primary bg-indigo-50/60 text-primary' : 'border-transparent text-slate-700'}`}>{item.label}</button>)}</div>
      <p className="flex items-center gap-3 border-b border-slate-200 py-5 text-sm text-slate-600"><FileText size={21} />{documentLabel(flow.documentType)} pour <strong>{clientName || 'Client comptoir'}</strong>{clientPhone && <> · {clientPhone}</>}</p>
    </section>
  );
}

function PaymentStep({ flow }: { flow: CashierCheckoutFlow }) {
  const clientName = flow.customer ? `${flow.customer.nom} ${flow.customer.prenom || ''}`.trim() : 'Client comptoir';
  return (
    <section className="min-h-0 overflow-y-auto px-8 py-5">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Encaisser <span className="ml-3 text-4xl text-primary">{money(flow.total)}</span></h1>
      <p className="mt-3 flex items-center gap-3 text-lg text-slate-700"><UserRound size={21} />{clientName}<span>·</span><FileText size={20} />{documentLabel(flow.documentType)}<button type="button" onClick={() => flow.setStep('CUSTOMER')} className="ml-2 text-sm font-semibold text-primary">Modifier</button></p>
      <h2 className="mt-7 font-bold text-slate-900">Méthode de paiement</h2>
      <div className="mt-3 grid grid-cols-5 border-b border-slate-200">{paymentMethods.map(item => { const Icon = item.icon; const active = flow.method === item.id; return <button key={item.id} type="button" onClick={() => flow.setMethod(item.id)} className={`flex min-h-20 flex-col items-center justify-center gap-2 border-b-4 text-sm font-medium ${active ? 'border-primary bg-indigo-50 text-slate-950' : 'border-transparent text-slate-600'}`}><Icon size={28} />{item.label}</button>; })}</div>
      {flow.method === 'ESPECES' ? <>
        <label className="mt-6 block font-semibold text-slate-800">Montant reçu<input autoFocus inputMode="numeric" value={flow.cashReceived} onChange={event => flow.setCashReceived(event.target.value)} placeholder={String(flow.total)} className="mt-3 h-16 w-full rounded-md border border-slate-300 px-4 text-4xl font-medium tracking-wide outline-none focus:border-primary" /></label>
        <div className="mt-3 flex gap-2"><button type="button" onClick={() => flow.setCashReceived(String(flow.total))} className="h-12 rounded-md border border-slate-300 px-6 text-sm">Montant exact</button>{[15000, 20000].map(value => <button key={value} type="button" onClick={() => flow.setCashReceived(String(value))} className="h-12 min-w-28 rounded-md border border-slate-300 px-6 text-sm">{value.toLocaleString('fr-FR')}</button>)}</div>
        <div className="mt-6 flex min-h-40 items-center justify-between bg-emerald-50 px-10 text-emerald-700"><div><p className="text-xl font-medium">Monnaie à rendre</p><strong className="mt-3 block text-6xl tracking-wide">{money(flow.change)}</strong></div><WalletCards size={64} strokeWidth={1.5} /></div>
      </> : flow.method === 'CREDIT' ? <div className="mt-6 grid grid-cols-2 gap-4 bg-amber-50 p-5"><label className="text-sm font-bold">Acompte<input value={flow.deposit} onChange={event => flow.setDeposit(event.target.value)} className="mt-2 h-12 w-full border border-slate-300 px-3" /></label><label className="text-sm font-bold">Échéance<input type="date" value={flow.dueDate} onChange={event => flow.setDueDate(event.target.value)} className="mt-2 h-12 w-full border border-slate-300 px-3" /></label></div> : <label className="mt-6 block font-semibold">Référence de paiement<input value={flow.reference} onChange={event => flow.setReference(event.target.value)} placeholder="Facultatif" className="mt-3 h-14 w-full rounded-md border border-slate-300 px-4 outline-none focus:border-primary" /></label>}
      <p className="mt-5 flex items-center gap-3 text-sm text-slate-600"><CheckCircle2 className="text-emerald-600" size={24} />Client, document et montant vérifiés</p>
    </section>
  );
}

function SummaryPanel({ flow, onCheckoutAndPrint }: { flow: CashierCheckoutFlow; onCheckoutAndPrint: () => Promise<void> }) {
  const ticket = flow.selected!;
  const clientName = flow.customer ? `${flow.customer.nom} ${flow.customer.prenom || ''}`.trim() : 'Client comptoir';
  const seller = cashierSellerName(ticket);
  if (flow.step === 'TICKET') return <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white px-7 py-9 text-center"><h2 className="text-xl font-bold text-slate-950">À encaisser</h2><p className="mt-10 text-6xl font-bold tracking-wide text-primary">{Number(flow.total).toLocaleString('fr-FR')}</p><p className="mt-4 text-3xl">FCFA</p><div className="mt-10 border-t border-slate-200 pt-7 text-left"><p className="flex items-center gap-3 text-slate-700"><Package size={22} />{ticket.lignes.length} articles</p><p className="mt-6 flex items-center gap-3 text-slate-700"><UserRound size={22} />Vendeur {seller}</p></div><button type="button" onClick={() => flow.setStep('CUSTOMER')} className="mt-10 flex min-h-16 w-full items-center justify-center gap-3 rounded-md bg-primary px-5 text-lg font-bold text-white"><UserRound />Identifier le client</button><button type="button" onClick={flow.closeTicket} className="mt-5 text-sm font-medium text-primary">Mettre ce ticket en attente</button></aside>;
  if (flow.step === 'CUSTOMER') return <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white px-6 py-9 text-center"><h2 className="text-xl font-bold">Résumé</h2><p className="mt-10 text-6xl font-bold tracking-wide text-primary">{Number(flow.total).toLocaleString('fr-FR')}</p><p className="mt-4 text-3xl">FCFA</p><div className="mt-8 space-y-5 border-t border-slate-200 pt-7 text-left text-slate-700"><p className="flex gap-3"><Package size={21} />{ticket.lignes.length} articles</p><p className="flex gap-3"><UserRound size={21} /><span>{clientName}{flow.customer?.telephone && <small className="mt-1 block">{flow.customer.telephone}</small>}</span></p><p className="flex gap-3"><FileText size={21} />{documentLabel(flow.documentType)}</p></div><button type="button" onClick={() => flow.setStep('PAYMENT')} className="mt-9 min-h-16 w-full rounded-md bg-primary px-5 text-lg font-bold text-white">Continuer vers le paiement</button><button type="button" onClick={() => flow.setStep('TICKET')} className="mt-5 text-sm font-medium text-primary">Revenir au ticket</button></aside>;
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white px-6 py-7">
      <h2 className="text-xl font-bold">Finaliser</h2>
      <div className="mt-8 space-y-6 text-slate-700">
        <p className="flex gap-3"><ReceiptText size={21} />Ticket {ticket.numeroTicket}</p>
        <p className="flex gap-3"><UserRound size={21} />{clientName}</p>
        <p className="flex gap-3"><FileText size={21} />{documentLabel(flow.documentType)}</p>
        <p className="flex gap-3"><Banknote size={21} />{paymentLabel(flow.method)}</p>
      </div>
      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-7">
        <span className="text-lg">Total</span>
        <strong className="text-2xl">{money(flow.total)}</strong>
      </div>
      <button
        type="button"
        data-checkout-and-print
        disabled={!flow.canPay}
        aria-describedby={!flow.canPay ? 'checkout-block-reason' : undefined}
        onClick={() => void onCheckoutAndPrint()}
        className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-md bg-primary px-5 text-lg font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {flow.submitting ? <Loader2 className="animate-spin" /> : <Printer />}
        {flow.submitting ? 'Validation en cours…' : 'Valider et imprimer'}
      </button>
      {!flow.canPay && flow.paymentBlockReason && !flow.submitting && (
        <p id="checkout-block-reason" className="mt-3 text-sm text-slate-600">{flow.paymentBlockReason}</p>
      )}
      <div aria-live="polite" className="sr-only">
        {flow.checkoutStatus === 'VALIDATING' ? 'Validation du paiement en cours' : ''}
      </div>
      {flow.error && <p role="alert" className="mt-4 flex items-start gap-2 bg-red-50 p-3 text-sm font-medium text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={18} />{flow.error}</p>}
      <button type="button" disabled={flow.submitting} onClick={() => flow.setStep('TICKET')} className="mt-5 w-full text-sm font-medium text-primary disabled:opacity-40">Mettre en attente</button>
    </aside>
  );
}

function SuccessStep({ flow, onNextTicket, onPrint, onOpenDocument }: { flow: CashierCheckoutFlow; onNextTicket: () => void; onPrint: () => void; onOpenDocument: () => void }) {
  const document = flow.result?.facture;
  const documentReady = Boolean(document?.id);
  const clientName = flow.customer ? `${flow.customer.nom} ${flow.customer.prenom || ''}`.trim() : 'Client comptoir';
  const seller = cashierSellerName(flow.selected!);
  const share = () => { const phone = String(flow.customer?.telephone || flow.selected?.telephoneClient || '').replace(/\D/g, ''); const text = encodeURIComponent(`NEWOTEG — ${document?.numero || flow.selected?.numeroTicket}\nTotal : ${money(flow.total)}`); window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer'); };
  return <>
    <section className="min-h-0 overflow-y-auto px-8 py-6 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={48} /><h1 className="mt-3 text-4xl font-bold">Paiement validé</h1><p className="mt-3 text-5xl font-bold tracking-wide text-primary">{money(flow.total)}</p><div className="mx-auto mt-6 max-w-xl border border-slate-300 text-left"><dl className="grid grid-cols-2 divide-x divide-y divide-slate-200 text-sm"><dt className="p-3 text-slate-600">Ticket</dt><dd className="p-3 font-medium">{flow.selected?.numeroTicket}</dd><dt className="p-3 text-slate-600">Vendeur</dt><dd className="p-3 font-medium">{seller}</dd><dt className="p-3 text-slate-600">Client</dt><dd className="p-3 font-medium">{clientName}</dd><dt className="p-3 text-slate-600">Document</dt><dd className="p-3 font-medium">{documentLabel(flow.documentType)} {document?.numero || 'en préparation'}</dd><dt className="p-3 text-slate-600">Méthode de paiement</dt><dd className="p-3 font-medium">{paymentLabel(flow.method)}</dd>{flow.method === 'ESPECES' && <><dt className="p-3 text-slate-600">Monnaie rendue</dt><dd className="p-3 font-medium">{money(flow.change)}</dd></>}</dl></div><p className="mx-auto mt-4 max-w-xl bg-emerald-50 py-3 text-sm font-medium text-emerald-700"><Check size={18} className="mr-2 inline" />Vente enregistrée · stock mis à jour</p>{!documentReady && <p role="status" className="mx-auto mt-3 max-w-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">Le paiement est conservé. Le document n’est pas encore disponible : retrouvez-le dans « Session de caisse ».</p>}<button type="button" onClick={onNextTicket} className="mx-auto mt-4 min-h-14 w-full max-w-xl rounded-md bg-primary text-lg font-bold text-white">Traiter le ticket suivant</button><div className="mx-auto mt-3 grid max-w-xl grid-cols-3 gap-3"><button type="button" disabled={!documentReady} onClick={onPrint} className="flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"><Printer size={18} />Imprimer</button><button type="button" onClick={share} className="flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300"><MessageCircle size={18} />WhatsApp</button><button type="button" disabled={!documentReady} onClick={onOpenDocument} className="flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"><FileDown size={18} />PDF</button></div></section>
    <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white px-7 py-6"><h2 className="text-xl font-bold">Document prêt</h2><div className="mt-5 border border-slate-300 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><img src="/logo.png" alt="Newoteg" className="h-16 w-16 object-contain" /><strong className="text-xl">NEWOTEG</strong></div><div className="mt-5 flex justify-between"><strong>{documentLabel(flow.documentType).toUpperCase()}</strong><span>{document?.numero || flow.selected?.numeroTicket}</span></div><p className="mt-6 text-sm">Client</p><p className="mt-1 font-medium">{clientName}</p><p className="mt-3 text-sm text-slate-500">Vendeur</p><p className="mt-1 font-medium">{seller}</p><div className="mt-6 divide-y divide-slate-200 border-y border-slate-300">{flow.selected?.lignes.map(line => <div key={line.id} className="grid grid-cols-[1fr_auto] gap-3 py-3 text-xs"><span>{line.nomProduit} × {line.quantite}</span><span>{money(line.sousTotal)}</span></div>)}</div><div className="mt-4 flex justify-between text-xl"><strong>TOTAL</strong><strong>{money(flow.total)}</strong></div></div><p className="mt-5 flex items-center gap-3 text-sm text-slate-700"><CheckCircle2 className="text-emerald-600" />ORIGINAL · document généré</p><p className="mt-4 flex items-center gap-3 text-sm text-slate-700"><Printer />Imprimante prête</p></aside>
  </>;
}

export function CashierDesktopWorkArea({ flow, onNextTicket }: { flow: CashierCheckoutFlow; onNextTicket: () => void }) {
  const [printOpen, setPrintOpen] = useState(false);
  const [autoPrintRequested, setAutoPrintRequested] = useState(false);
  if (!flow.selected) return <><section className="flex min-h-0 items-center justify-center bg-white text-center"><div><ReceiptText className="mx-auto text-slate-300" size={52} /><h1 className="mt-5 text-2xl font-bold">Sélectionnez un ticket</h1><p className="mt-2 text-sm text-slate-500">Le détail s’affichera ici avant l’encaissement.</p></div></section><aside className="border-l border-slate-200 bg-white" /></>;
  const document = flow.result?.facture;
  const checkoutAndPrint = async () => {
    const response = await flow.checkout();
    if (response?.facture) {
      setAutoPrintRequested(true);
      setPrintOpen(true);
    }
  };
  const openReceipt = (autoPrint: boolean) => {
    setAutoPrintRequested(autoPrint);
    setPrintOpen(true);
  };
  const printableLines = document?.lignes?.length
    ? document.lignes.map((line: any) => ({ nomProduit: line.nomProduit, quantite: line.quantite, prixUnitaire: Number(line.prixUnitaireTTC), sousTotal: Number(line.sousTotalTTC) }))
    : flow.selected.lignes.map(line => ({ nomProduit: line.nomProduit, quantite: line.quantite, prixUnitaire: Number(line.prixUnitaire), sousTotal: Number(line.sousTotal) }));
  return <>
    {flow.step === 'SUCCESS' ? <SuccessStep flow={flow} onNextTicket={onNextTicket} onPrint={() => openReceipt(true)} onOpenDocument={() => openReceipt(false)} /> : <>{flow.step === 'TICKET' && <TicketStep flow={flow} />}{flow.step === 'CUSTOMER' && <CustomerStep flow={flow} />}{flow.step === 'PAYMENT' && <PaymentStep flow={flow} />}<SummaryPanel flow={flow} onCheckoutAndPrint={checkoutAndPrint} /></>}
    {printOpen && document && <ReceiptGenerator autoPrint={autoPrintRequested} documentId={document.id} printCount={document.printCount || 0} type={flow.documentType === 'FACTURE' ? 'facture' : flow.documentType === 'BON_VENTE' ? 'bonVente' : 'ticket'} numero={document.numero} dateVente={document.dateEmission} methodePaiement={flow.method} montantTotal={flow.total} vendeur={cashierSellerName(flow.selected)} client={document.client ? { nom: `${document.client.nom} ${document.client.prenom || ''}`.trim(), telephone: document.client.telephone } : undefined} lignes={printableLines} onClose={() => setPrintOpen(false)} />}
  </>;
}
