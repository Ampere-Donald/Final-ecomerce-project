import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  HardDriveDownload,
  Loader2,
  MonitorCog,
  Printer,
  RefreshCw,
  Smartphone,
  Usb,
} from 'lucide-react';
import {
  EPSON_SUPPORT_URL,
  findSupportedEpsonUsbDevice,
  isWindowsDevice,
  NEWOTEG_PRINTER_SETUP_URL,
  PRINTER_SETUP_RETURN_PARAM,
  type SupportedEpsonDevice,
} from '../services/printerSetup';
import { buildTicketEscPos } from '../services/ticketEscpos';
import {
  classifyPrinterError,
  getPrinterName,
  getPrinterHost,
  inspectPrinterStatus,
  disconnect,
  isAndroidDevice,
  isPhysicalPrinter,
  listPrinters,
  listUsbDevices,
  printRaw,
  QZ_TRAY_DOWNLOAD_URL,
  setPrinterName,
  setPrinterHost,
} from '../services/qzPrinter';
import type { PrinterReadiness } from '../services/printerStatus';
import { getWorkstationName, setWorkstationName } from '../services/workstation';

type DetectionState = 'checking' | 'ready' | 'bridge-missing' | 'no-printer' | 'mobile';
type Feedback = { kind: 'success' | 'error'; text: string } | null;

function friendlyConnectionError(error: unknown): string {
  const diagnostic = classifyPrinterError(error);
  if (diagnostic.code === 'QZ_UNAVAILABLE') {
    const host = getPrinterHost();
    if (host) {
      return `Impossible de joindre QZ Tray sur ${host}. Vérifiez le Wi-Fi, l’adresse du PC, le port WSS 8181 et le certificat QZ installé sur cet appareil.`;
    }
    return "QZ Tray n'est pas lancé sur cet ordinateur.";
  }
  return diagnostic.message;
}

export function PrinterSettings() {
  const returnedFromSetup = new URLSearchParams(window.location.search)
    .get(PRINTER_SETUP_RETURN_PARAM) === 'complete';
  const [state, setState] = useState<DetectionState>('checking');
  const [printers, setPrinters] = useState<string[]>([]);
  const [usbPrinter, setUsbPrinter] = useState<SupportedEpsonDevice | null>(null);
  const [selected, setSelected] = useState(getPrinterName() || '');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [testing, setTesting] = useState(false);
  const [host, setHost] = useState(getPrinterHost());
  const [savingHost, setSavingHost] = useState(false);
  const [workstationName, setWorkstationNameValue] = useState(getWorkstationName());
  const [readiness, setReadiness] = useState<PrinterReadiness | null>(null);
  const [installerStarted, setInstallerStarted] = useState(returnedFromSetup);
  const pollingStartedAt = useRef(Date.now());

  const detect = useCallback(async () => {
    setFeedback(null);
    setReadiness(null);
    if (isAndroidDevice() && !getPrinterHost()) {
      setState('mobile');
      return;
    }

    setState('checking');
    try {
      const detected = (await listPrinters()).filter(isPhysicalPrinter);
      setPrinters(detected);

      try {
        setUsbPrinter(findSupportedEpsonUsbDevice(await listUsbDevices()));
      } catch {
        // Une politique USB restrictive ne doit pas masquer les imprimantes
        // déjà installées dans le spouleur Windows.
        setUsbPrinter(null);
      }

      if (detected.length === 0) {
        setState('no-printer');
        return;
      }

      const saved = getPrinterName();
      const epson = detected.find((name) => /epson|tm[- ]?t20/i.test(name));
      const next = saved && detected.includes(saved) ? saved : epson || detected[0];
      setSelected(next);
      setPrinterName(next);
      setReadiness(await inspectPrinterStatus(next));
      setState('ready');
    } catch (error) {
      setPrinters([]);
      setUsbPrinter(null);
      setState('bridge-missing');
      setFeedback({ kind: 'error', text: friendlyConnectionError(error) });
    }
  }, []);

  const saveHost = async () => {
    setSavingHost(true);
    setFeedback(null);
    try {
      setPrinterHost(host);
      setWorkstationName(workstationName);
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

  useEffect(() => {
    if (!installerStarted || state === 'ready') return undefined;
    const remaining = 3 * 60 * 1000 - (Date.now() - pollingStartedAt.current);
    if (remaining <= 0) return undefined;
    const interval = window.setInterval(() => void detect(), 5000);
    const timeout = window.setTimeout(() => window.clearInterval(interval), remaining);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [detect, installerStarted, state]);

  useEffect(() => {
    if (!installerStarted || state !== 'ready') return;
    setFeedback({
      kind: 'success',
      text: `Installation confirmée : ${selected} est maintenant disponible. Imprimez le ticket de test pour terminer.`,
    });
    const url = new URL(window.location.href);
    url.searchParams.delete(PRINTER_SETUP_RETURN_PARAM);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [installerStarted, selected, state]);

  const selectPrinter = async (name: string) => {
    setSelected(name);
    setPrinterName(name);
    setReadiness(null);
    const current = await inspectPrinterStatus(name);
    setReadiness(current);
    setFeedback({
      kind: current.state === 'PAPER_OUT' || current.state === 'QUEUE_BLOCKED' ? 'error' : 'success',
      text: `${name} — ${current.message}`,
    });
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
      const current = await inspectPrinterStatus(selected);
      setReadiness(current);
      setFeedback({
        kind: current.state === 'PAPER_OUT' || current.state === 'QUEUE_BLOCKED' ? 'error' : 'success',
        text: current.state === 'PAPER_OUT' || current.state === 'QUEUE_BLOCKED'
          ? current.message
          : 'Ticket de test envoyé. Confirmez maintenant la sortie physique, la coupe et la lisibilité.',
      });
    } catch (error) {
      setFeedback({ kind: 'error', text: friendlyConnectionError(error) });
    } finally {
      setTesting(false);
    }
  };

  const bridgeOk = state === 'ready' || state === 'no-printer';
  const usbOk = Boolean(usbPrinter);
  const printerBlocked = readiness?.state === 'PAPER_OUT' || readiness?.state === 'QUEUE_BLOCKED';
  const printerOk = state === 'ready' && !printerBlocked;
  const canInstallHere = isWindowsDevice() && !getPrinterHost();

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
        <div className="surface grid gap-3 p-4 sm:grid-cols-2 sm:items-end">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Nom de ce poste
            <input
              type="text"
              value={workstationName}
              onChange={(event) => setWorkstationNameValue(event.target.value)}
              placeholder="Ex. Caisse 1"
              maxLength={50}
              className="field block"
            />
            <span className="block text-xs font-normal text-slate-500">
              Ce nom apparaît dans l’historique des impressions.
            </span>
          </label>
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
          <button
            type="button"
            onClick={() => void saveHost()}
            disabled={savingHost}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-end"
          >
            {savingHost ? <Loader2 size={16} className="animate-spin" /> : <MonitorCog size={16} />}
            Enregistrer et tester
          </button>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="État de la chaîne d’impression">
          {[
            { label: 'Newoteg', detail: 'Application ouverte', ok: true, icon: MonitorCog },
            { label: 'Pont local', detail: bridgeOk ? 'QZ Tray actif' : 'À installer', ok: bridgeOk, icon: RefreshCw },
            { label: 'Connexion USB', detail: usbOk ? 'Epson TM-T20II branchée' : 'À vérifier', ok: usbOk, icon: Usb },
            { label: 'Pilote Windows', detail: state === 'ready' ? readiness?.message || selected : 'À installer', ok: printerOk, icon: Printer },
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
            <Loader2 size={18} className="animate-spin" /> Recherche du câble USB et des imprimantes Windows…
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

        {state === 'no-printer' && usbPrinter && canInstallHere && (
          <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/70">
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-indigo-800">
                  <Usb size={18} />
                  <span className="text-xs font-extrabold uppercase tracking-[0.15em]">Connexion USB prête</span>
                </div>
                <h4 className="mt-2 text-xl font-bold text-slate-950">Epson TM-T20II reconnue, pilote absent</h4>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  L’assistant Newoteg répare d’abord automatiquement les files mal configurées. Si nécessaire, il télécharge ensuite le pilote APD 5.13 depuis Epson, l’installe et relie la vraie file TM-T20II au port USB.
                </p>
              </div>
              <a
                href={NEWOTEG_PRINTER_SETUP_URL}
                download="Newoteg-Printer-Setup.exe"
                onClick={() => {
                  pollingStartedAt.current = Date.now();
                  setInstallerStarted(true);
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-indigo-950/15 transition hover:-translate-y-0.5 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <HardDriveDownload size={18} /> Installer le pilote Epson
              </a>
            </div>
            <div className="border-t border-indigo-200 bg-white/70 px-5 py-4 sm:px-6">
              <ol className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                <li><strong className="text-slate-950">1.</strong> Ouvrez le fichier téléchargé et acceptez l’autorisation Windows.</li>
                <li><strong className="text-slate-950">2.</strong> Dans Epson, gardez TM-T20II et choisissez le port USB.</li>
                <li><strong className="text-slate-950">3.</strong> Terminez : Newoteg vérifiera automatiquement l’imprimante.</li>
              </ol>
              <p className="mt-3 text-xs text-slate-500">
                Une autorisation administrateur est obligatoire pour ajouter un pilote Windows. Newoteg ne demande et n’enregistre aucun mot de passe.
              </p>
            </div>
          </div>
        )}

        {state === 'no-printer' && (!usbPrinter || !canInstallHere) && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Aucune imprimante Epson installée dans Windows</p>
              <p className="mt-1">
                {canInstallHere
                  ? 'Allumez l’Epson TM-T20II et rebranchez son câble USB directement sur ce PC. La proposition d’installation apparaîtra dès qu’elle sera reconnue.'
                  : 'L’installation du pilote doit être lancée depuis le PC Windows auquel l’Epson est physiquement branchée.'}
              </p>
            </div>
          </div>
        )}

        {installerStarted && state !== 'ready' && state !== 'bridge-missing' && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800" role="status">
            <Loader2 size={18} className="animate-spin" /> Vérification automatique de la nouvelle imprimante Windows…
          </div>
        )}

        {state === 'ready' && (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Imprimante utilisée pour les tickets
              <select value={selected} onChange={(event) => void selectPrinter(event.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
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

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="button" onClick={() => void detect()} disabled={state === 'checking'} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline disabled:opacity-50">
            <RefreshCw size={15} /> Relancer la détection
          </button>
          <a href={EPSON_SUPPORT_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline">
            Page officielle Epson <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
