import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  MonitorCog,
  Printer,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { buildTicketEscPos } from '../services/ticketEscpos';
import {
  getPrinterName,
  getPrinterHost,
  disconnect,
  isAndroidDevice,
  isPhysicalPrinter,
  listPrinters,
  printRaw,
  QZ_TRAY_DOWNLOAD_URL,
  setPrinterName,
  setPrinterHost,
} from '../services/qzPrinter';

type DetectionState = 'checking' | 'ready' | 'bridge-missing' | 'no-printer' | 'mobile';
type Feedback = { kind: 'success' | 'error'; text: string } | null;

function friendlyConnectionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/closed before|connect|socket|websocket|qz/i.test(message)) {
    const host = getPrinterHost();
    if (host) {
      return `Impossible de joindre QZ Tray sur ${host}. Vérifiez le Wi-Fi, l’adresse du PC, le port WSS 8181 et le certificat QZ installé sur cet appareil.`;
    }
    return "QZ Tray n'est pas lancé sur cet ordinateur.";
  }
  return message || "Le service d'impression local ne répond pas.";
}

export function PrinterSettings() {
  const [state, setState] = useState<DetectionState>('checking');
  const [printers, setPrinters] = useState<string[]>([]);
  const [selected, setSelected] = useState(getPrinterName() || '');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [testing, setTesting] = useState(false);
  const [host, setHost] = useState(getPrinterHost());
  const [savingHost, setSavingHost] = useState(false);

  const detect = useCallback(async () => {
    setFeedback(null);
    if (isAndroidDevice() && !getPrinterHost()) {
      setState('mobile');
      return;
    }

    setState('checking');
    try {
      const detected = (await listPrinters()).filter(isPhysicalPrinter);
      setPrinters(detected);
      if (detected.length === 0) {
        setState('no-printer');
        return;
      }

      const saved = getPrinterName();
      const epson = detected.find((name) => /epson|tm[- ]?t20/i.test(name));
      const next = saved && detected.includes(saved) ? saved : epson || detected[0];
      setSelected(next);
      setPrinterName(next);
      setState('ready');
    } catch (error) {
      setPrinters([]);
      setState('bridge-missing');
      setFeedback({ kind: 'error', text: friendlyConnectionError(error) });
    }
  }, []);

  const saveHost = async () => {
    setSavingHost(true);
    setFeedback(null);
    try {
      setPrinterHost(host);
      await disconnect();
      setFeedback({
        kind: 'success',
        text: host.trim()
          ? 'Poste d’impression enregistré. Nouvelle détection en cours…'
          : 'Impression locale sélectionnée. Nouvelle détection en cours…',
      });
      await detect();
    } catch (error) {
      setFeedback({ kind: 'error', text: friendlyConnectionError(error) });
    } finally {
      setSavingHost(false);
    }
  };

  useEffect(() => {
    void detect();
  }, [detect]);

  const selectPrinter = (name: string) => {
    setSelected(name);
    setPrinterName(name);
    setFeedback({ kind: 'success', text: `Imprimante enregistrée : ${name}` });
  };

  const testPrinter = async () => {
    if (!selected) return;
    setTesting(true);
    setFeedback(null);
    try {
      setPrinterName(selected);
      await printRaw(buildTicketEscPos({
        lignes: [{ nomProduit: "Test d'impression", quantite: 1, prixUnitaire: 0, sousTotal: 0 }],
        montantTotal: 0,
        methodePaiement: 'TEST',
        numero: 'DIAGNOSTIC',
      }));
      setFeedback({ kind: 'success', text: 'Ticket de test envoyé à l’imprimante.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: friendlyConnectionError(error) });
    } finally {
      setTesting(false);
    }
  };

  const bridgeOk = state === 'ready' || state === 'no-printer';
  const printerOk = state === 'ready';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Printer size={21} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Impression des tickets</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Configuration dédiée à l’Epson TM-T20II — papier thermique 58 mm.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div className="surface grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Poste QZ Tray
            <input
              type="text"
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder={isAndroidDevice() ? 'Ex. 192.168.1.20' : 'Vide = cet ordinateur'}
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              className="field block"
            />
            <span className="block text-xs font-normal text-slate-500">
              Sur Android, indiquez l’adresse IP fixe du PC auquel l’Epson est branchée. Sur ce PC, laissez vide.
            </span>
          </label>
          <button type="button" onClick={() => void saveHost()} disabled={savingHost}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">
            {savingHost ? <Loader2 size={16} className="animate-spin" /> : <MonitorCog size={16} />}
            Enregistrer et tester
          </button>
        </div>

        <ol className="grid gap-3 sm:grid-cols-3" aria-label="État de la chaîne d’impression">
          {[
            { label: 'Application', detail: 'Newoteg ouvert', ok: true, icon: MonitorCog },
            { label: 'Pont local', detail: bridgeOk ? 'QZ Tray actif' : 'À installer', ok: bridgeOk, icon: RefreshCw },
            { label: 'Imprimante', detail: printerOk ? selected : 'Non détectée', ok: printerOk, icon: Printer },
          ].map((step) => (
            <li key={step.label} className={`rounded-xl border p-4 ${step.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center gap-2">
                <step.icon size={16} className={step.ok ? 'text-emerald-700' : 'text-amber-700'} />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{step.label}</span>
                {step.ok && <CheckCircle2 size={15} className="ml-auto text-emerald-600" />}
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900" title={step.detail}>{step.detail}</p>
            </li>
          ))}
        </ol>

        {state === 'checking' && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600" role="status">
            <Loader2 size={18} className="animate-spin" /> Recherche des imprimantes installées…
          </div>
        )}

        {state === 'mobile' && (
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <Smartphone size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Téléphone ou tablette détecté</p>
              <p className="mt-1 text-sky-800">Indiquez ci-dessus l’adresse IP du PC boutique qui exécute QZ Tray et auquel l’Epson TM-T20II est branchée en USB.</p>
            </div>
          </div>
        )}

        {state === 'bridge-missing' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <p className="font-bold text-amber-950">Installer le pont d’impression sur ce poste</p>
                <p className="mt-1 text-sm text-amber-900">Windows exige votre autorisation pour installer ce logiciel. Après cette installation unique, relancez la détection.</p>
              </div>
            </div>
            <a href={QZ_TRAY_DOWNLOAD_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
              <Download size={16} /> Télécharger QZ Tray
            </a>
          </div>
        )}

        {state === 'no-printer' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            <div><p className="font-bold">Aucune imprimante installée dans Windows</p><p className="mt-1">Branchez et allumez l’imprimante, installez son pilote constructeur, puis relancez la détection.</p></div>
          </div>
        )}

        {state === 'ready' && (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Imprimante utilisée pour les tickets
              <select value={selected} onChange={(event) => selectPrinter(event.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                {printers.map((printer) => <option key={printer} value={printer}>{printer}</option>)}
              </select>
            </label>
            <button type="button" onClick={testPrinter} disabled={testing || !selected} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {testing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              {testing ? 'Envoi…' : 'Imprimer un test'}
            </button>
          </div>
        )}

        {feedback && (
          <p className={`rounded-lg border px-4 py-3 text-sm font-medium ${feedback.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`} role="status">
            {feedback.text}
          </p>
        )}

        <button type="button" onClick={detect} disabled={state === 'checking'} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline disabled:opacity-50">
          <RefreshCw size={15} /> Relancer la détection
        </button>
      </div>
    </section>
  );
}
