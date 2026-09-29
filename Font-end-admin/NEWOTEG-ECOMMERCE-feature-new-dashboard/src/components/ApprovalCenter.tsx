import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, ClipboardCheck, Clock3, X, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { factureVirtuelleApi, getApiErrorMessage, inventaireApi } from '../services/api';
import { useAdminOperations } from '../context/AdminOperationsContext';

interface PendingInvoiceApproval {
  id: string;
  numero: string;
  pourcentageMajoration: number | string;
  totalTTC: number | string;
  margeDemarcheur: number | string;
  dateCreation: string;
  vendeur?: { nom?: string } | null;
  client?: { nom?: string } | null;
}

interface InventoryReview {
  id: string;
  reference: string;
  perimetre: string;
  statut: string;
  createdAt: string;
  _count?: { lignes?: number };
}

const toList = (value: any): any[] => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
const money = (value: number | string) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} FCFA`;

export const ApprovalCenter = () => {
  const operations = useAdminOperations();
  const [invoices, setInvoices] = useState<PendingInvoiceApproval[]>([]);
  const [inventories, setInventories] = useState<InventoryReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refusing, setRefusing] = useState<PendingInvoiceApproval | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [invoiceResult, inventoryResult] = await Promise.allSettled([
      factureVirtuelleApi.getAll({ statut: 'EN_ATTENTE' }),
      inventaireApi.getAll(),
    ]);
    if (invoiceResult.status === 'fulfilled') setInvoices(toList(invoiceResult.value));
    if (inventoryResult.status === 'fulfilled') {
      setInventories(toList(inventoryResult.value).filter((inventory) => inventory.statut === 'EN_COURS'));
    }
    if (invoiceResult.status === 'rejected' || inventoryResult.status === 'rejected') {
      setError('Certaines demandes n’ont pas pu être chargées. Vous pouvez réessayer sans quitter cet écran.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const approve = async (invoice: PendingInvoiceApproval) => {
    setActionId(invoice.id);
    setError(null);
    try {
      await factureVirtuelleApi.approuver(invoice.id);
      setInvoices((current) => current.filter((item) => item.id !== invoice.id));
      await operations.refresh();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Impossible d’approuver cette demande.'));
    } finally {
      setActionId(null);
    }
  };

  const reject = async () => {
    if (!refusing || reason.trim().length < 3) return;
    setActionId(refusing.id);
    setError(null);
    try {
      await factureVirtuelleApi.refuser(refusing.id, reason.trim());
      setInvoices((current) => current.filter((item) => item.id !== refusing.id));
      setRefusing(null);
      setReason('');
      await operations.refresh();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Impossible de refuser cette demande.'));
    } finally {
      setActionId(null);
    }
  };

  const total = invoices.length + inventories.length;
  const oldest = useMemo(() => {
    const dates = [
      ...invoices.map((invoice) => invoice.dateCreation),
      ...inventories.map((inventory) => inventory.createdAt),
    ].map((date) => new Date(date).getTime()).filter(Number.isFinite);
    if (!dates.length) return null;
    const hours = Math.max(0, Math.floor((Date.now() - Math.min(...dates)) / 3_600_000));
    return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} j`;
  }, [inventories, invoices]);

  return (
    <div className="space-y-6 pb-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Superadministrateur · décisions sensibles</p>
          <h1 className="font-display text-3xl font-bold tracking-[-0.035em] text-[#0B1636] sm:text-4xl">À valider</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Un centre unique pour décider sur les demandes qui engagent la marge, le stock ou la responsabilité de la boutique.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:border-primary/30 hover:text-primary disabled:opacity-60">
          <Clock3 size={16} /> Actualiser
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface rounded-2xl p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Total à examiner</p><p className="mt-2 font-mono text-3xl font-bold text-[#0B1636]">{loading ? '…' : total}</p></div>
        <div className="surface rounded-2xl p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Factures virtuelles</p><p className="mt-2 font-mono text-3xl font-bold text-amber-600">{loading ? '…' : invoices.length}</p></div>
        <div className="surface rounded-2xl p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Plus ancienne</p><p className="mt-2 font-mono text-3xl font-bold text-slate-700">{loading ? '…' : oldest || '—'}</p></div>
      </div>

      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"><span className="flex items-center gap-2"><AlertTriangle size={17} />{error}</span><button type="button" onClick={() => void load()} className="shrink-0 underline">Réessayer</button></div>}

      {loading ? (
        <div className="space-y-3" aria-label="Chargement des demandes"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div>
      ) : total === 0 ? (
        <div className="surface flex min-h-72 flex-col items-center justify-center rounded-[1.25rem] p-8 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={28} /></span>
          <h2 className="font-display text-xl font-bold text-[#0B1636]">Aucune décision en attente</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">Les demandes sensibles déjà traitées restent disponibles dans les écrans métier et leur historique.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="invoice-approval-title" className="space-y-3">
            <div className="flex items-center justify-between"><h2 id="invoice-approval-title" className="font-display text-xl font-bold text-[#0B1636]">Factures virtuelles</h2><span className="rounded-lg bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-700">{invoices.length}</span></div>
            {invoices.length === 0 ? <p className="surface rounded-2xl p-5 text-sm text-slate-500">Aucune facture virtuelle à décider.</p> : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <article key={invoice.id} className="surface relative overflow-hidden rounded-[1.15rem] p-4 sm:p-5">
                    <span className="absolute inset-y-0 left-0 w-1 bg-amber-400" />
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><BadgeCheck size={20} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-display font-bold text-slate-900">{invoice.numero}</h3><span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-700">+{Number(invoice.pourcentageMajoration) || 0}%</span></div>
                        <p className="mt-1 text-sm text-slate-500">Demandée par {invoice.vendeur?.nom || 'un vendeur'} · Client {invoice.client?.nom || 'comptoir'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center">
                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total proposé</p><p className="mt-1 font-mono text-sm font-bold text-[#0B1636]">{money(invoice.totalTTC)}</p></div>
                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Marge</p><p className="mt-1 font-mono text-sm font-bold text-amber-700">{money(invoice.margeDemarcheur)}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void approve(invoice)} disabled={actionId === invoice.id} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={16} /> Approuver</button>
                        <button type="button" onClick={() => setRefusing(invoice)} disabled={actionId === invoice.id} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><XCircle size={16} /> Refuser</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="inventory-review-title" className="space-y-3">
            <div className="flex items-center justify-between"><h2 id="inventory-review-title" className="font-display text-xl font-bold text-[#0B1636]">Inventaires en cours</h2><span className="rounded-lg bg-cyan-50 px-2.5 py-1 font-mono text-xs font-bold text-cyan-800">{inventories.length}</span></div>
            {inventories.length === 0 ? <p className="surface rounded-2xl p-5 text-sm text-slate-500">Aucun inventaire en cours à examiner.</p> : (
              <div className="surface overflow-hidden rounded-[1.15rem] divide-y divide-slate-100">
                {inventories.map((inventory) => (
                  <Link key={inventory.id} to="/stock-achats?tab=inventaires" className="group flex items-center gap-4 p-4 hover:bg-slate-50 sm:p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><ClipboardCheck size={20} /></span>
                    <span className="min-w-0 flex-1"><span className="block font-display font-bold text-slate-900">{inventory.reference}</span><span className="mt-1 block text-sm text-slate-500">{inventory.perimetre} · {inventory._count?.lignes ?? 0} ligne(s)</span></span>
                    <span className="hidden rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 sm:inline">Contrôler avant validation</span>
                    <ArrowRight size={17} className="text-slate-300 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {refusing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title" onMouseDown={(event) => event.target === event.currentTarget && setRefusing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-red-600">Décision motivée</p><h2 id="reject-title" className="mt-1 font-display text-xl font-bold text-slate-900">Refuser {refusing.numero}</h2></div><button type="button" onClick={() => setRefusing(null)} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div>
            <p className="mt-3 text-sm leading-6 text-slate-500">Le motif sera visible par le demandeur et conservé dans l’historique.</p>
            <label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="rejection-reason">Motif du refus</label>
            <textarea id="rejection-reason" autoFocus rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className="field mt-2 py-3" placeholder="Expliquez la correction attendue…" />
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRefusing(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700">Annuler</button><button type="button" onClick={() => void reject()} disabled={reason.trim().length < 3 || actionId === refusing.id} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">Confirmer le refus</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
