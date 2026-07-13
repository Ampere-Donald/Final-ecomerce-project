export type PrinterStatusEvent = {
  printerName?: string;
  eventType?: string;
  statusText?: string;
  statusCode?: string | number;
  severity?: string;
  message?: string;
};

export type PrinterReadinessState = 'READY' | 'PAPER_OUT' | 'QUEUE_BLOCKED' | 'UNKNOWN';

export type PrinterReadiness = {
  state: PrinterReadinessState;
  message: string;
  event?: PrinterStatusEvent;
};

const normalize = (event: PrinterStatusEvent) => [
  event.statusText,
  event.statusCode,
  event.message,
].filter((value) => value !== undefined && value !== null)
  .join(' ')
  .toUpperCase()
  .replace(/[\s-]+/g, '_');

/**
 * Convertit les statuts Winspool remontés par QZ Tray en états compréhensibles
 * par la caisse. Les événements les plus graves gagnent sur un ancien statut OK.
 */
export function evaluatePrinterStatus(events: PrinterStatusEvent[]): PrinterReadiness {
  const paperEvent = events.find((event) => /PAPER_?OUT|PAPER_?PROBLEM|MEDIA_?EMPTY/.test(normalize(event)));
  if (paperEvent) {
    return {
      state: 'PAPER_OUT',
      message: 'L’imprimante n’a plus de papier. Rechargez le rouleau 58 mm puis réessayez.',
      event: paperEvent,
    };
  }

  const blockedEvent = events.find((event) => {
    const value = normalize(event);
    return /OFFLINE|NOT_?AVAILABLE|PAUSED|PAPER_?JAM|DOOR_?OPEN|USER_?INTERVENTION|SERVER_?UNKNOWN|PENDING_?DELETION/.test(value)
      || (event.eventType?.toUpperCase() === 'PRINTER' && /ERROR|FATAL/.test(event.severity?.toUpperCase() || ''));
  });
  if (blockedEvent) {
    const offline = /OFFLINE|NOT_?AVAILABLE/.test(normalize(blockedEvent));
    return {
      state: 'QUEUE_BLOCKED',
      message: offline
        ? 'L’imprimante est hors ligne. Vérifiez son alimentation, le câble USB et la file Windows.'
        : 'La file d’impression est arrêtée ou requiert une intervention. Corrigez-la dans Windows puis réessayez.',
      event: blockedEvent,
    };
  }

  const readyEvent = events.find((event) => {
    const value = normalize(event);
    return event.eventType?.toUpperCase() === 'PRINTER'
      && /(^|_)OK($|_)|IDLE|READY|WAITING|PROCESSING|PRINTING|INITIALIZING|POWER_?SAVE/.test(value)
      && !/ERROR|FATAL/.test(event.severity?.toUpperCase() || '');
  });
  if (readyEvent) {
    return {
      state: 'READY',
      message: 'Imprimante prête selon Windows et QZ Tray.',
      event: readyEvent,
    };
  }

  return {
    state: 'UNKNOWN',
    message: events.length === 0
      ? 'Statut matériel non communiqué ; le ticket de test reste nécessaire.'
      : 'Aucun blocage matériel explicite n’a été signalé par Windows.',
    event: events[0],
  };
}
