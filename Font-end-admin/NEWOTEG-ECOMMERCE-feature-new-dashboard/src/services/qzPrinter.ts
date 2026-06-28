// -----------------------------------------------------------------------------
// Pont QZ Tray — envoie des commandes brutes (ESC/POS) à l'imprimante locale.
//
// QZ Tray est un petit logiciel installé sur le PC de la boutique. Le navigateur
// lui parle en WebSocket local (wss://localhost) ; lui parle à l'Epson en USB.
// On contourne ainsi totalement le rendu d'impression de Chrome (source des prix
// coupés). Aucune implication du backend.
// -----------------------------------------------------------------------------

import qz from 'qz-tray';

const PRINTER_CACHE_KEY = 'newoteg_printer_name';

let securityConfigured = false;
let connecting: Promise<void> | null = null;

// Déploiement mono-poste, non signé : on ne fournit ni certificat ni signature.
// QZ Tray affiche alors UNE fenêtre « Autoriser ce site à imprimer ? » au premier
// usage — cocher « Se souvenir » la supprime définitivement.
function configureSecurity() {
  if (securityConfigured) return;
  qz.security.setCertificatePromise((resolve: (v?: unknown) => void) => resolve());
  qz.security.setSignaturePromise(() => (resolve: (v?: unknown) => void) => resolve());
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
    connecting = qz.websocket.connect().finally(() => {
      connecting = null;
    });
  }
  await connecting;
}

// Trouve l'imprimante ticket : valeur mémorisée, sinon une Epson / TM-T20,
// sinon l'imprimante Windows par défaut. Le résultat est mis en cache.
export async function resolvePrinter(): Promise<string> {
  const cached = localStorage.getItem(PRINTER_CACHE_KEY);
  if (cached) return cached;

  let name: string | undefined;
  for (const query of ['EPSON', 'TM-T20']) {
    if (name) break;
    try {
      name = await qz.printers.find(query);
    } catch {
      /* pas trouvé pour cette recherche — on continue */
    }
  }
  if (!name) {
    name = await qz.printers.getDefault();
  }
  if (!name) throw new Error('Aucune imprimante détectée par QZ Tray.');

  localStorage.setItem(PRINTER_CACHE_KEY, name);
  return name;
}

// Permet de forcer manuellement le nom de l'imprimante (réglages).
export function setPrinterName(name: string) {
  localStorage.setItem(PRINTER_CACHE_KEY, name);
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
export async function printRaw(bytes: Uint8Array): Promise<void> {
  await connect();
  const printer = await resolvePrinter();
  const cfg = qz.configs.create(printer);
  const data = [{ type: 'raw', format: 'command', flavor: 'base64', data: uint8ToBase64(bytes) }];
  await qz.print(cfg, data);
}
