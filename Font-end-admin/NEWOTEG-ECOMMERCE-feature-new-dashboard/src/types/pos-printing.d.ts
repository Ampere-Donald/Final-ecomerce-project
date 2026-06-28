// Déclarations de types minimales pour les libs d'impression thermique
// (ni qz-tray ni receipt-printer-encoder ne fournissent de types).

declare module 'qz-tray' {
  const qz: any;
  export default qz;
}

declare module '@point-of-sale/receipt-printer-encoder' {
  export default class ReceiptPrinterEncoder {
    constructor(options?: Record<string, unknown>);
    [key: string]: any;
  }
}
