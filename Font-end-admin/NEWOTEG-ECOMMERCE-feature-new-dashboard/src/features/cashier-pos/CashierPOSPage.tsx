import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Banknote, Building2, Check, ChevronRight, CircleHelp, Clock3, CreditCard, HandCoins, ListChecks, Loader2, Printer, Search, Smartphone, UserRound, Wallet, X } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { ReceiptGenerator } from '../../components/ReceiptGenerator';
import { useCashierCheckoutFlow } from './useCashierCheckoutFlow';
import { money, type CashierTicket, type DocumentType, type PaymentMethod } from './types';

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'ESPECES', label: 'Espèces', icon: Banknote },
  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { id: 'CARTE', label: 'Carte', icon: CreditCard },
  { id: 'VIREMENT', label: 'Virement', icon: Building2 },
  { id: 'CREDIT', label: 'Crédit', icon: HandCoins },
];

const documents: { id: DocumentType; label: string }[] = [
  { id: 'TICKET_CAISSE', label: 'Ticket' },
  { id: 'FACTURE', label: 'Facture' },
  { id: 'BON_VENTE', label: 'Bon de vente' },
];

function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, new Date(date).getTime() - now);
  const urgent = remaining < 180000;
  const label = remaining === 0 ? 'Expiré' : `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${urgent ? 'text-red-600' : 'text-amber-700'}`}><Clock3 size={13} />{label}</span>;
}

function QueueCard({ ticket, active, onClick }: { ticket: CashierTicket; active: boolean; onClick: () => void }) {
  const units = ticket.lignes.reduce((sum, line) => sum + line.quantite, 0);
  return (
    <button onClick={onClick} className={`group w-full rounded-2xl bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active ? 'ring-2 ring-primary/25 shadow-md' : 'ring-1 ring-slate-200 hover:shadow-md'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="font-mono text-sm font-bold text-slate-900">{ticket.numeroTicket}</p><p className="mt-1 truncate text-xs text-slate-500">{ticket.client ? `${ticket.client.nom} ${ticket.client.prenom || ''}`.trim() : ticket.nomClient || 'Client à identifier'} · {units} article{units > 1 ? 's' : ''}</p></div>
        <Countdown date={ticket.expiresAt} />
      </div>
      <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3"><strong className="text-lg text-slate-950">{money(ticket.montantTotal)}</strong><ChevronRight size={18} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary" /></div>
    </button>
  );
}

export function CashierPOSView({ flow }: { flow: any }) {
  const toast = useToast();
  const [printOpen, setPrintOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => localStorage.getItem('newoteg_pos_shortcuts_enabled') !== 'false');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const isSuccess = flow.step === 'SUCCESS';

  useEffect(() => {
    if (isSuccess) toast.success('Paiement enregistré. Le document est prêt.');
  }, [isSuccess, toast]);

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
      if (!shortcutsEnabled || editing || !flow.selected || isSuccess) return;
      if (!['F2', 'F3', 'F4', 'F8'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'F2') flow.setMethod('ESPECES');
      if (event.key === 'F3') flow.setMethod('MOBILE_MONEY');
      if (event.key === 'F4') flow.setMethod('CARTE');
      if (event.key === 'F8' && flow.canPay) void flow.checkout();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [flow.selected, flow.canPay, flow.checkout, flow.setMethod, isSuccess, shortcutsEnabled]);

  const nextTicket = () => {
    const next = flow.tickets[0];
    if (next) flow.selectTicket(next); else flow.closeTicket();
  };

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto min-h-[calc(100vh-8rem)] max-w-[1680px] pb-24 lg:pb-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Poste de caisse</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">Encaissement</h1></div>
        <div className="flex items-center gap-2"><button onClick={() => setHelpOpen(true)} title="Aide et raccourcis (?)" aria-label="Aide et raccourcis" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-primary"><CircleHelp size={20} /></button>{flow.caisse && <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200"><Wallet size={19} className="text-primary" /><div><p className="text-[11px] text-slate-500">Caisse {flow.caisse.statut === 'OUVERTE' ? 'ouverte' : 'fermée'}</p><p className="font-bold text-slate-900">{money(flow.caisse.solde)}</p></div></div>}</div>
      </header>

      {flow.error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200"><AlertCircle className="mt-0.5 shrink-0" size={17} /><span>{flow.error}</span></div>}

      <div className="grid gap-5 md:grid-cols-[minmax(250px,34%)_1fr] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <section className={`${flow.selected ? 'hidden md:block' : 'block'} md:sticky md:top-4 md:self-start`} aria-label="File des ventes">
          <div className="mb-3 flex items-end justify-between"><div><h2 className="font-bold text-slate-900">File active</h2><p className="text-xs text-slate-500">{flow.tickets.length} en attente</p></div><span className="text-sm font-bold text-slate-700">{money(flow.queueTotal)}</span></div>
          <div className="max-h-[calc(100vh-16rem)] space-y-3 overflow-y-auto pr-1">
            {flow.loading ? <div className="flex justify-center py-14 text-slate-400"><Loader2 className="animate-spin" /></div> : flow.tickets.length === 0 ? <div className="rounded-2xl bg-white px-5 py-12 text-center ring-1 ring-slate-200"><ListChecks className="mx-auto text-emerald-500" size={34} /><p className="mt-3 font-semibold text-slate-800">File terminée</p><p className="mt-1 text-xs text-slate-500">Les nouveaux bons apparaîtront ici.</p></div> : flow.tickets.map(ticket => <QueueCard key={ticket.id} ticket={ticket} active={flow.selected?.id === ticket.id} onClick={() => flow.selectTicket(ticket)} />)}
          </div>
        </section>

        <section className={`${flow.selected ? 'block' : 'hidden md:flex'} min-h-[520px] flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200`}>
          {!flow.selected ? <div className="m-auto max-w-sm p-8 text-center"><ListChecks className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 text-lg font-bold text-slate-800">Sélectionnez une vente</h2><p className="mt-2 text-sm text-slate-500">Les articles, l’identité client et le paiement resteront réunis dans cet espace.</p></div> : isSuccess ? (
            <div className="m-auto w-full max-w-lg p-6 text-center md:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={32} strokeWidth={3} /></div><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Transaction terminée</p><h2 className="mt-2 text-2xl font-extrabold text-slate-950">{money(flow.total)} encaissés</h2><p className="mt-2 text-sm text-slate-500">{flow.result?.facture?.numero || 'Le document commercial est prêt.'}</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={() => setPrintOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white"><Printer size={18} />Imprimer</button><button onClick={nextTicket} className="min-h-12 rounded-xl bg-primary px-4 font-bold text-white">Ticket suivant</button></div><button onClick={flow.closeTicket} className="mt-4 text-sm font-semibold text-slate-500 hover:text-slate-800">Retour à la file</button></div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 md:px-6"><button onClick={flow.closeTicket} aria-label="Retour à la file" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"><ArrowLeft size={20} /></button><div className="min-w-0 flex-1"><p className="font-mono text-sm font-bold text-slate-900">{flow.selected.numeroTicket}</p><p className="truncate text-xs text-slate-500">Créé à {new Date(flow.selected.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p></div><Countdown date={flow.selected.expiresAt} /></div>
              <ol aria-label="Progression de l'encaissement" className="grid grid-cols-4 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-center text-[11px] font-bold text-slate-500 md:px-6"><li className="text-emerald-700">Ticket ✓</li><li className={flow.customer ? 'text-emerald-700' : 'text-slate-900'}>Client</li><li className="text-slate-900">Paiement</li><li>Document</li></ol>
              <div className="grid flex-1 gap-6 overflow-y-auto p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,42%)]">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Articles</h3>{flow.selected.noteCaissier && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200"><strong>Note vendeur :</strong> {flow.selected.noteCaissier}</div>}<div className="mt-3 divide-y divide-slate-100">{flow.selected.lignes.map(line => <div key={line.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{line.nomProduit}</p><p className="text-xs text-slate-500">{line.quantite} × {money(line.prixUnitaire)}</p></div><p className="shrink-0 text-sm font-bold text-slate-900">{money(line.sousTotal)}</p></div>)}</div>
                </div>
                <div className="space-y-5">
                  <div><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">1. Client et document</h3><span className="text-xs text-slate-400">Téléphone facultatif hors crédit</span></div>{flow.customer ? <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200"><div className="flex min-w-0 items-center gap-2"><UserRound size={17} className="text-emerald-700" /><div className="truncate text-sm font-semibold text-slate-800">{flow.customer.nom} {flow.customer.prenom || ''}<p className="text-xs font-normal text-slate-500">{flow.customer.telephone}</p></div></div><button onClick={() => flow.setCustomer(null)} className="text-xs font-bold text-emerald-800">Changer</button></div> : <><div className="relative mt-3"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input inputMode="tel" value={flow.customerQuery} onChange={event => flow.setCustomerQuery(event.target.value)} placeholder="Nom ou numéro du client" className="min-h-11 w-full rounded-xl bg-slate-50 pl-10 pr-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary/30" />{flow.customerResults.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">{flow.customerResults.map(client => <button key={client.id} onClick={() => flow.setCustomer(client)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm hover:bg-slate-50"><span className="font-semibold">{client.nom} {client.prenom || ''}</span><span className="text-xs text-slate-500">{client.telephone}</span></button>)}</div>}</div><button onClick={() => { setQuickCreateOpen(value => !value); setQuickCustomerPhone(/^\+?[\d\s-]+$/.test(flow.customerQuery) ? flow.customerQuery : ''); }} className="mt-2 min-h-10 text-xs font-bold text-primary">+ Créer rapidement un client</button>{quickCreateOpen && <div className="grid gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"><input value={quickCustomerName} onChange={event => setQuickCustomerName(event.target.value)} placeholder="Nom du client" className="min-h-11 rounded-lg bg-white px-3 text-sm outline-none ring-1 ring-slate-200" /><input inputMode="tel" value={quickCustomerPhone} onChange={event => setQuickCustomerPhone(event.target.value)} placeholder="Téléphone" className="min-h-11 rounded-lg bg-white px-3 text-sm outline-none ring-1 ring-slate-200" /><button disabled={!quickCustomerName.trim() || !quickCustomerPhone.trim() || flow.creatingCustomer} onClick={() => void flow.createCustomer(quickCustomerName, quickCustomerPhone).then(created => { if (created) setQuickCreateOpen(false); }).catch(() => toast.error('Le client n’a pas pu être créé.'))} className="min-h-11 rounded-lg bg-slate-900 text-sm font-bold text-white disabled:opacity-40">{flow.creatingCustomer ? 'Création…' : 'Créer et sélectionner'}</button></div>}</>}<div className="mt-3 grid grid-cols-3 gap-2">{documents.map(item => <button key={item.id} onClick={() => flow.setDocumentType(item.id)} className={`min-h-10 rounded-xl px-2 text-xs font-bold transition ${flow.documentType === item.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}>{item.label}</button>)}</div></div>
                  <div><h3 className="text-sm font-bold text-slate-800">2. Paiement</h3><div className="mt-3 grid grid-cols-2 gap-2">{paymentMethods.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => flow.setMethod(item.id)} className={`flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${flow.method === item.id ? 'bg-primary/10 text-primary ring-2 ring-primary/25' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}><Icon size={17} />{item.label}</button>; })}</div></div>
                  {flow.method === 'ESPECES' && <label className="block text-sm font-semibold text-slate-700">Montant reçu<input autoFocus inputMode="numeric" value={flow.cashReceived} onChange={event => flow.setCashReceived(event.target.value)} placeholder={String(flow.total)} className="mt-2 min-h-12 w-full rounded-xl bg-slate-50 px-3 text-lg font-bold outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary/30" /></label>}
                  {['MOBILE_MONEY', 'CARTE', 'VIREMENT'].includes(flow.method) && <label className="block text-sm font-semibold text-slate-700">Référence de paiement<input value={flow.reference} onChange={event => flow.setReference(event.target.value)} placeholder="Facultatif" className="mt-2 min-h-11 w-full rounded-xl bg-slate-50 px-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary/30" /></label>}
                  {flow.method === 'CREDIT' && <div className="grid gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200"><p className="text-xs font-semibold text-amber-800">Un client enregistré et une échéance sont obligatoires.</p><label className="text-sm font-semibold text-slate-700">Acompte<input inputMode="numeric" value={flow.deposit} onChange={event => flow.setDeposit(event.target.value)} placeholder="0" className="mt-1 min-h-11 w-full rounded-xl bg-white px-3 outline-none ring-1 ring-slate-200" /></label><label className="text-sm font-semibold text-slate-700">Échéance<input type="date" min={new Date().toISOString().slice(0, 10)} value={flow.dueDate} onChange={event => flow.setDueDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl bg-white px-3 outline-none ring-1 ring-slate-200" /></label>{flow.creditPreview && <div className={`rounded-xl p-3 text-xs font-semibold ${flow.creditPreview.autorise ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}><div className="flex justify-between"><span>Encours actuel</span><span>{money(flow.creditPreview.encoursActuel)}</span></div><div className="mt-1 flex justify-between"><span>Après cette vente</span><span>{money(flow.creditPreview.nouveauSoldeDu)} / {money(flow.creditPreview.limiteCredit)}</span></div>{!flow.creditPreview.autorise && <p className="mt-2">La limite de crédit serait dépassée.</p>}</div>}</div>}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="hidden xl:block xl:sticky xl:top-4 xl:self-start"><div className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">À encaisser</p><p className="mt-2 text-3xl font-black tracking-tight">{money(flow.total)}</p><div className="my-5 h-px bg-white/10" /><div className="space-y-3 text-sm"><div className="flex justify-between text-slate-300"><span>Document</span><strong className="text-white">{documents.find(item => item.id === flow.documentType)?.label}</strong></div><div className="flex justify-between text-slate-300"><span>Paiement</span><strong className="text-white">{paymentMethods.find(item => item.id === flow.method)?.label}</strong></div>{flow.method === 'ESPECES' && <div className="flex justify-between text-slate-300"><span>Monnaie</span><strong className="text-emerald-300">{money(flow.change)}</strong></div>}</div><button onClick={flow.checkout} disabled={!flow.canPay} className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-extrabold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40">{flow.submitting ? <Loader2 className="animate-spin" size={19} /> : <Check size={19} />}Encaisser</button></div></aside>
      </div>

      {flow.selected && !isSuccess && <div className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur xl:hidden"><div className="mx-auto flex max-w-4xl items-center gap-3"><div className="min-w-0 flex-1"><p className="text-[11px] text-slate-500">Total{flow.method === 'ESPECES' && flow.change > 0 ? ` · monnaie ${money(flow.change)}` : ''}</p><p className="truncate text-lg font-black text-slate-950">{money(flow.total)}</p></div><button onClick={flow.checkout} disabled={!flow.canPay} className="flex min-h-12 min-w-36 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-extrabold text-white disabled:opacity-40">{flow.submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}Encaisser</button></div></div>}
      {printOpen && flow.result?.facture && <ReceiptGenerator documentId={flow.result.facture.id} printCount={flow.result.facture.printCount || 0} type={flow.documentType === 'FACTURE' ? 'facture' : flow.documentType === 'BON_VENTE' ? 'bonVente' : 'ticket'} numero={flow.result.facture.numero} dateVente={flow.result.facture.dateEmission} methodePaiement={flow.method} montantTotal={flow.total} client={flow.result.facture.client ? { nom: `${flow.result.facture.client.nom} ${flow.result.facture.client.prenom || ''}`.trim(), telephone: flow.result.facture.client.telephone } : undefined} lignes={(flow.result.facture.lignes || []).map((line: any) => ({ nomProduit: line.nomProduit, quantite: line.quantite, prixUnitaire: Number(line.prixUnitaireTTC), sousTotal: Number(line.sousTotalTTC) }))} onClose={() => setPrintOpen(false)} />}
      {helpOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setHelpOpen(false)}><div role="dialog" aria-modal="true" aria-label="Aide caisse" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Aide du poste de caisse</h2><button onClick={() => setHelpOpen(false)} aria-label="Fermer l'aide" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><label className="mt-5 flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"><span>Activer les raccourcis clavier</span><input type="checkbox" checked={shortcutsEnabled} onChange={event => setShortcutsEnabled(event.target.checked)} className="h-5 w-5 accent-primary" /></label><dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm"><dt className="font-mono font-bold">F2</dt><dd>Espèces</dd><dt className="font-mono font-bold">F3</dt><dd>Mobile Money</dd><dt className="font-mono font-bold">F4</dt><dd>Carte</dd><dt className="font-mono font-bold">F8</dt><dd>Encaisser si le paiement est valide</dd><dt className="font-mono font-bold">?</dt><dd>Ouvrir cette aide</dd></dl><div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><p className="font-bold text-slate-800">Imprimante</p><p className="mt-1">Le statut détaillé et le test matériel restent accessibles dans Paramètres → Imprimante tickets.</p></div></div></div>}
    </motion.main>
  );
}

export function CashierPOSPage() {
  const flow = useCashierCheckoutFlow();
  return <CashierPOSView flow={flow} />;
}
