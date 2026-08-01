// -----------------------------------------------------------------------------
// Pont QZ Tray — envoie des commandes brutes (ESC/POS) à l'imprimante locale.
//
// QZ Tray est un petit logiciel installé sur le PC de la boutique. Le navigateur
// lui parle en WebSocket local (wss://localhost) ; lui parle à l'Epson en USB.
// On contourne ainsi totalement le rendu d'impression de Chrome (source des prix
// coupés). Aucune implication du backend.
// -----------------------------------------------------------------------------

import qz from 'qz-tray';
import {
  evaluatePrinterStatus,
  type PrinterReadiness,
  type PrinterStatusEvent,
} from './printerStatus';
import { isUsablePrinterQueueName, type UsbDeviceInfo } from './printerSetup';
import { requestQzSignature } from './qzSigning';

const PRINTER_CACHE_KEY = 'newoteg_printer_name';
const PRINTER_HOST_KEY = 'newoteg_printer_host';
const QZ_TRUST_VERSION = '20260731';

export const QZ_TRAY_DOWNLOAD_URL = 'https://qz.io/download/';

let securityConfigured = false;
let connecting: Promise<void> | null = null;

export type PrinterErrorCode =
  | 'QZ_UNAVAILABLE'
  | 'QZ_PERMISSION_DENIED'
  | 'PRINTER_NOT_FOUND'
  | 'PAPER_OUT'
  | 'QUEUE_BLOCKED'
  | 'PRINT_FAILED';

export function classifyPrinterError(error: unknown): { code: PrinterErrorCode; message: string } {
  const raw = error instanceof Error ? error.message : String(error || '');
  if (/paper|media\s*(?:empty|out)|out of paper/i.test(raw)) {
    return { code: 'PAPER_OUT', message: 'L’imprimante n’a plus de papier. Rechargez le rouleau 58 mm puis réessayez.' };
  }
  if (/offline|paused|spool|queue|not accepting|job.*stuck/i.test(raw)) {
    return { code: 'QUEUE_BLOCKED', message: 'La file d’impression est arrêtée ou bloquée. Ouvrez la file Windows, relancez-la puis réessayez.' };
  }
  if (/denied|certificate|signature|security|not trusted|authorization/i.test(raw)) {
    return { code: 'QZ_PERMISSION_DENIED', message: 'QZ Tray a refusé l’autorisation. Autorisez Newoteg dans QZ Tray puis réessayez.' };
  }
  if (/printer.*(?:not found|unavailable)|no printer|cannot find printer|aucune imprimante/i.test(raw)) {
    return { code: 'PRINTER_NOT_FOUND', message: 'L’Epson TM-T20II ou son pilote Windows est introuvable. Vérifiez le câble USB, le pilote et le nom de la file.' };
  }
  if (/closed before|connect|socket|websocket|qz/i.test(raw)) {
    return { code: 'QZ_UNAVAILABLE', message: 'QZ Tray ne répond pas. Lancez-le sur le poste d’impression puis réessayez.' };
  }
  return { code: 'PRINT_FAILED', message: raw || 'L’impression a échoué pour une raison inconnue.' };
}

// Chaque commande QZ est signée par Newoteg après validation de la session
// caissier. Le certificat public associé est approuvé par l'assistant de caisse,
// ce qui supprime les confirmations répétées sans désactiver la sécurité QZ.
function configureSecurity() {
  if (securityConfigured) return;
  qz.security.setCertificatePromise((
    resolve: (certificate: string) => void,
    reject: (error: Error) => void,
  ) => {
    fetch(`/qz/digital-certificate.txt?v=${QZ_TRUST_VERSION}`, {
      cache: 'no-store',
      headers: { Accept: 'text/plain' },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Certificat QZ indisponible (${response.status}).`);
        return response.text();
      })
      .then(resolve)
      .catch(reject);
  });
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise((hash: string) => (
    resolve: (signature: string) => void,
    reject: (error: Error) => void,
  ) => {
    requestQzSignature(hash)
      .then(resolve)
      .catch(reject);
  });
  securityConfigured = true;
}

export function isConnected(): boolean {
  try {
    return qz.websocket.isActive();
  } catch {
    return false;
  }
}

// Connexion idempotente : ne rouvre pas une connexion déjà active et ne lance
// pas deux connexions en parallèle.
export async function connect(): Promise<void> {
  configureSecurity();
  if (isConnected()) return;
  if (!connecting) {
    const host = getPrinterHost();
    if (host && typeof qz.websocket.setUsingSurf === 'function') {
      qz.websocket.setUsingSurf(false);
    }
    connecting = qz.websocket.connect(host
      ? {
          host,
          usingSecure: true,
          port: { secure: [8181], insecure: [] },
          retries: 1,
          delay: 1,
        }
      : undefined).finally(() => {
      connecting = null;
    });
  }
  await connecting;
}

// Trouve l'imprimante ticket : valeur mémorisée, sinon une Epson / TM-T20,
// sinon l'imprimante Windows par défaut. Le résultat est mis en cache.
export async function resolvePrinter(): Promise<string> {
  const installed = (await listPrinters()).filter(isPhysicalPrinter);
  const cached = localStorage.getItem(PRINTER_CACHE_KEY);
  if (cached) {
    if (installed.includes(cached)) return cached;
    localStorage.removeItem(PRINTER_CACHE_KEY);
  }

  const thermalName = /epson|tm-t\d|pos|thermal|receipt|ticket|xprinter|rongta|gprinter|munbyn|star|bixolon/i;
  const name = installed.find((printer) => thermalName.test(printer)) || installed[0];
  if (!name) throw new Error('Aucune imprimante détectée par QZ Tray.');

  localStorage.setItem(PRINTER_CACHE_KEY, name);
  return name;
}

// Permet de forcer manuellement le nom de l'imprimante (réglages).
export function setPrinterName(name: string) {
  const normalized = name.trim();
  if (normalized) localStorage.setItem(PRINTER_CACHE_KEY, normalized);
  else localStorage.removeItem(PRINTER_CACHE_KEY);
}

export function getPrinterName(): string | null {
  return localStorage.getItem(PRINTER_CACHE_KEY);
}

export function getPrinterHost(): string {
  return localStorage.getItem(PRINTER_HOST_KEY) || '';
}

export function setPrinterHost(value: string) {
  const host = value
    .trim()
    .replace(/^wss?:\/\//i, '')
    .replace(/\/$/, '');
  if (host && !/^[A-Za-z0-9.-]+$/.test(host)) {
    throw new Error('Saisissez uniquement l’adresse IP ou le nom du poste, sans port.');
  }
  if (host) localStorage.setItem(PRINTER_HOST_KEY, host);
  else localStorage.removeItem(PRINTER_HOST_KEY);
}

export async function disconnect(): Promise<void> {
  if (isConnected()) await qz.websocket.disconnect();
}

export function getConnectionInfo(): { host: string; port: number; socket: string } | null {
  if (!isConnected()) return null;
  return qz.websocket.getConnectionInfo() || null;
}

export async function listPrinters(): Promise<string[]> {
  await connect();
  const result = await qz.printers.find();
  if (Array.isArray(result)) return result.filter((name): name is string => typeof name === 'string');
  return typeof result === 'string' && result ? [result] : [];
}

// La liste USB permet de distinguer une imprimante physiquement branchée d'une
// file Windows réellement installée. Elle sert uniquement au diagnostic : les
// tickets continuent de passer par le pilote Windows et non par un accès USB brut.
export async function listUsbDevices(): Promise<UsbDeviceInfo[]> {
  await connect();
  const result = await qz.usb.listDevices(false);
  return Array.isArray(result) ? result as UsbDeviceInfo[] : [];
}

// QZ 2.1+ traduit les statuts Winspool (papier, hors-ligne, file en pause).
// L'absence de statut n'est pas considérée comme un échec : certains pilotes
// anciens ne publient rien, et le ticket physique de diagnostic reste l'arbitre.
export async function inspectPrinterStatus(
  printerName: string,
  waitMs = 450,
): Promise<PrinterReadiness> {
  await connect();
  const events: PrinterStatusEvent[] = [];
  qz.printers.setPrinterCallbacks((event: PrinterStatusEvent) => {
    if (!event.printerName || event.printerName === printerName) events.push(event);
  });

  try {
    await qz.printers.startListening(printerName);
    await qz.printers.getStatus();
    await new Promise((resolve) => window.setTimeout(resolve, waitMs));
    return evaluatePrinterStatus(events);
  } catch {
    return evaluatePrinterStatus(events);
  } finally {
    try {
      await qz.printers.stopListening();
    } catch {
      // Le diagnostic ne doit pas empêcher une impression si le pilote ne
      // prend pas en charge l'écoute des statuts.
    }
    qz.printers.setPrinterCallbacks([]);
  }
}

export function isPhysicalPrinter(name: string): boolean {
  return isUsablePrinterQueueName(name);
}

export function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent);
}

// Uint8Array → base64, par blocs pour éviter un dépassement de pile sur de gros
// tickets (String.fromCharCode(...bytes) plante au-delà de ~100k arguments).
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Envoie les octets ESC/POS bruts à l'imprimante via QZ Tray.
export async function printRaw(bytes: Uint8Array): Promise<string> {
  await connect();
  const printer = await resolvePrinter();
  const readiness = await inspectPrinterStatus(printer);
  if (readiness.state === 'PAPER_OUT' || readiness.state === 'QUEUE_BLOCKED') {
    throw new Error(readiness.message);
  }
  const cfg = qz.configs.create(printer);
  const data = [{ type: 'raw', format: 'command', flavor: 'base64', data: uint8ToBase64(bytes) }];
  await qz.print(cfg, data);
  return printer;
}
