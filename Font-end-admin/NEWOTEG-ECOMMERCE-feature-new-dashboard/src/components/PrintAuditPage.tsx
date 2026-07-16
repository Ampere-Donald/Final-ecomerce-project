import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, History, RefreshCw, Search, XCircle } from 'lucide-react';
import { documentPrintApi, getApiErrorMessage } from '../services/api';

type PrintEvent = {
  id: string;
  documentType: 'TICKET' | 'FACTURE' | 'PROFORMA' | 'FACTURE_VIRTUELLE';
  documentNumber: string;
  mode: 'ORIGINAL' | 'DUPLICATA';
  status: 'SUCCESS' | 'FAILED';
  workstationId?: string | null;
  printerName?: string | null;
  errorCode?: string | null;
  createdAt: string;
  actor: { id: string; nom?: string | null; username?: string | null; role: string };
};

const documentLabels: Record<PrintEvent['documentType'], string> = {
  TICKET: 'Ticket',
  FACTURE: 'Facture',
  PROFORMA: 'Proforma',
  FACTURE_VIRTUELLE: 'Facture virtuelle',
};

function workstationLabel(value?: string | null) {
  if (!value) return 'Poste non renseigné';
  const separator = value.indexOf(':');
  return separator > 0 ? value.slice(0, separator) : value.slice(0, 16);
}

export function PrintAuditPage() {
  const [events, setEvents] = useState<PrintEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentPrintApi.list();
      setEvents(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de charger le journal des impressions.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events.filter((event) => {
      if (status !== 'ALL' && event.status !== status) return false;
      if (!normalized) return true;
      return [
        event.documentNumber,
        documentLabels[event.documentType],
        event.actor?.nom,
        event.actor?.username,
        event.printerName,
        workstationLabel(event.workstationId),
      ].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [events, query, status]);

  const successful = events.filter((event) => event.status === 'SUCCESS').length;
  const failed = events.length - successful;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-indigo-600">
            <History size={18} />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">Traçabilité</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Journal des impressions</h1>
          <p className="mt-1 text-sm text-slate-500">Chaque original, duplicata et tentative échouée, avec le poste et l’utilisateur.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Résumé des impressions">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tentatives</p><p className="mt-1 text-2xl font-bold text-slate-900">{events.length}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Réussies</p><p className="mt-1 text-2xl font-bold text-emerald-800">{successful}</p></div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-red-700">Échecs</p><p className="mt-1 text-2xl font-bold text-red-800">{failed}</p></div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher dans le journal</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Document, utilisateur, poste ou imprimante" className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </label>
        <select aria-label="Filtrer par résultat" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
          <option value="ALL">Tous les résultats</option>
          <option value="SUCCESS">Réussies</option>
          <option value="FAILED">Échouées</option>
        </select>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Chargement du journal…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Aucune impression ne correspond à ce filtre.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((event) => (
              <article key={event.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(160px,1.2fr)_minmax(130px,1fr)_minmax(130px,1fr)_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{event.documentNumber}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${event.mode === 'ORIGINAL' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{event.mode}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{documentLabels[event.documentType]} · {new Date(event.createdAt).toLocaleString('fr-FR')}</p>
                </div>
                <div><p className="text-sm font-semibold text-slate-800">{event.actor?.nom || event.actor?.username || 'Utilisateur inconnu'}</p><p className="text-xs text-slate-500">{event.actor?.role}</p></div>
                <div><p className="text-sm font-semibold text-slate-800">{workstationLabel(event.workstationId)}</p><p className="truncate text-xs text-slate-500" title={event.printerName || undefined}>{event.printerName || 'Imprimante non renseignée'}</p></div>
                <div className={`flex items-center gap-2 text-sm font-bold ${event.status === 'SUCCESS' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {event.status === 'SUCCESS' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <span>{event.status === 'SUCCESS' ? 'Réussie' : event.errorCode || 'Échec'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
