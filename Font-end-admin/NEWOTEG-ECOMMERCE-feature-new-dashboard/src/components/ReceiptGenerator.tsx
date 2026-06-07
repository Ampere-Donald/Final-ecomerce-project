import React, { useRef, useMemo } from 'react';
import { Printer, FileText, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LigneVente {
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface ReceiptProps {
  type: 'ticket' | 'facture' | 'proforma';
  lignes: LigneVente[];
  montantTotal: number;
  methodePaiement: string;
  numero: string;
  client?: {
    nom: string;
    telephone?: string;
    typeClient?: string;
    adresse?: string;
    nui?: string;
    rccm?: string;
  };
  dateVente?: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Receipt number helpers (localStorage counter per year)
// ---------------------------------------------------------------------------

export function generateReceiptNumber(type: 'ticket' | 'facture' | 'proforma'): string {
  const year = new Date().getFullYear();
  const prefix = type === 'ticket' ? 'TIC' : type === 'proforma' ? 'FP' : 'FAC';
  const key =
    type === 'ticket'
      ? `newoteg_ticket_counter_${year}`
      : type === 'proforma'
      ? `newoteg_proforma_counter_${year}`
      : `newoteg_invoice_counter_${year}`;

  const current = parseInt(localStorage.getItem(key) || '0', 10);
  const next = current + 1;
  localStorage.setItem(key, String(next));

  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CM', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const fmtDate = (iso?: string) => {
  if (!iso) return new Date().toLocaleDateString('fr-CM');
  return new Date(iso).toLocaleDateString('fr-CM');
};

const fmtDateTime = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString('fr-CM', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

// ---------------------------------------------------------------------------
// Print CSS injected once via <style> inside the component
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ReceiptGenerator: React.FC<ReceiptProps> = (props) => {
  const {
    type: initialType,
    lignes,
    montantTotal,
    methodePaiement,
    numero,
    client,
    dateVente,
    onClose,
  } = props;

  const [activeType, setActiveType] = React.useState<'ticket' | 'facture' | 'proforma'>(initialType);
  const printRef = useRef<HTMLDivElement>(null);

  // --- TVA calculation (prices are TTC) ---
  const { totalHT, tva, totalTTC } = useMemo(() => {
    const ttc = montantTotal;
    const ht = ttc / 1.1925;
    const t = ttc - ht;
    return { totalHT: ht, tva: t, totalTTC: ttc };
  }, [montantTotal]);

  // Per-line HT values
  const lignesHT = useMemo(
    () =>
      lignes.map((l) => ({
        ...l,
        prixUnitaireHT: l.prixUnitaire / 1.1925,
        sousTotalHT: l.sousTotal / 1.1925,
      })),
    [lignes],
  );

  // --- Actions ---
  const openPrintWindow = (saveAsPdf = false) => {
    const content = printRef.current;
    if (!content) return;

    // Collect all CSS from the current page (Tailwind + custom styles)
    const css = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
        } catch {
          return sheet.href ? `@import url("${sheet.href}");` : '';
        }
      })
      .join('\n');

    const pageSize = activeType === 'ticket'
      ? '@page { size: 80mm auto; margin: 5mm; }'
      : '@page { size: A4 portrait; margin: 10mm; }';

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('Veuillez autoriser les popups pour imprimer.');
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${saveAsPdf ? 'PDF' : 'Impression'} — ${numero}</title>
  <style>${css}</style>
  <style>
    ${pageSize}
    body { margin: 0; padding: ${activeType === 'ticket' ? '0' : '20px'}; background: white; }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const handlePrint = () => openPrintWindow(false);

  const handleExportPDF = async () => {
    const container = printRef.current;
    if (!container) return;

    // Supprime temporairement les contraintes overflow/maxHeight
    const prevOverflow = container.style.overflow;
    const prevMaxHeight = container.style.maxHeight;
    container.style.overflow = 'visible';
    container.style.maxHeight = 'none';

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);

      // Capture l'enfant direct (ticket ou facture), pas le conteneur scrollable
      const target = (container.firstElementChild as HTMLElement) ?? container;

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');

      if (activeType === 'ticket') {
        const ticketHeight = Math.max(120, Math.ceil((canvas.height * 80) / canvas.width) + 10);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, ticketHeight] });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 4;
        const contentWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);
        pdf.save(`${numero}.pdf`);
      } else {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        const printableHeight = pageHeight - margin * 2;
        let remainingHeight = imgHeight;
        let y = margin;

        pdf.addImage(imgData, 'PNG', margin, y, contentWidth, imgHeight);
        remainingHeight -= printableHeight;

        while (remainingHeight > 0) {
          pdf.addPage();
          y -= printableHeight;
          pdf.addImage(imgData, 'PNG', margin, y, contentWidth, imgHeight);
          remainingHeight -= printableHeight;
        }
        pdf.save(`${numero}.pdf`);
      }
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert(`Erreur PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      container.style.overflow = prevOverflow;
      container.style.maxHeight = prevMaxHeight;
    }
  };

  // --- Derived display number ---
  const displayNumero = numero;
  const documentLabel = activeType === 'proforma' ? 'FACTURE PROFORMA' : 'FACTURE';

  // -----------------------------------------------------------------------
  // Ticket Compact (80mm thermal — ~302px)
  // -----------------------------------------------------------------------
  const TicketCompact = () => (
    <div
      className="mx-auto bg-white text-black"
      style={{ width: 302, fontFamily: "'Courier New', Courier, monospace", fontSize: 12 }}
    >
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <p className="font-bold text-sm tracking-wide">NEWOTEG SARL</p>
        <p className="text-[10px]">Pièces Électroniques</p>
        <p className="text-[10px]">Douala, Cameroun</p>
        <p className="text-[10px]">Tél: +237 6XX XXX XXX</p>
      </div>

      {/* Date + numero */}
      <div className="flex justify-between text-[10px] mb-2">
        <span>{fmtDateTime(dateVente)}</span>
        <span>{displayNumero}</span>
      </div>

      {/* Client (optional) */}
      {client && (
        <div className="text-[10px] border-b border-dashed border-gray-400 pb-1 mb-1">
          <p>Client: {client.nom}</p>
          {client.telephone && <p>Tél: {client.telephone}</p>}
        </div>
      )}

      {/* Separator */}
      <div className="border-b border-dashed border-gray-400 mb-1" />

      {/* Lines */}
      <div className="mb-1">
        {lignes.map((l, i) => (
          <div key={i} className="flex justify-between text-[11px] leading-tight py-[1px]">
            <span className="break-words mr-1">
              {l.nomProduit} x{l.quantite}
            </span>
            <span className="whitespace-nowrap">{fmt(l.sousTotal)}</span>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div className="border-b border-dashed border-gray-400 mb-1" />

      {/* Totals */}
      <div className="text-[11px] space-y-[2px]">
        <div className="flex justify-between">
          <span>Sous-total HT</span>
          <span>{fmt(totalHT)} FCFA</span>
        </div>
        <div className="flex justify-between">
          <span>TVA 19,25%</span>
          <span>{fmt(tva)} FCFA</span>
        </div>
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-gray-400">
          <span>TOTAL TTC</span>
          <span>{fmt(totalTTC)} FCFA</span>
        </div>
      </div>

      {/* Payment */}
      <div className="text-[10px] mt-2 border-t border-dashed border-gray-400 pt-1">
        <p>Paiement: {methodePaiement}</p>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] mt-3 border-t border-dashed border-gray-400 pt-2">
        <p>Merci pour votre achat !</p>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Facture Pro (A4)
  // -----------------------------------------------------------------------
  const FacturePro = () => (
    <div
      className="mx-auto bg-white text-black p-8"
      style={{ width: 794, minHeight: 600, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13 }}
    >
      {/* Company header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">NEWOTEG SARL</h1>
          <p className="text-sm text-gray-600">Pièces Électroniques</p>
          <p className="text-xs text-gray-500 mt-1">NUI: P00000000000X (placeholder)</p>
          <p className="text-xs text-gray-500">RCCM: RC/DLA/2024/X/00000 (placeholder)</p>
          <p className="text-xs text-gray-500">Douala, Cameroun</p>
          <p className="text-xs text-gray-500">Tél: +237 6XX XXX XXX</p>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-gray-800">{documentLabel}</h2>
          <p className="text-sm text-gray-600">N° {displayNumero}</p>
          <p className="text-sm text-gray-600">Date: {fmtDate(dateVente)}</p>
        </div>
      </div>

      {/* Client block */}
      <div className="border border-gray-300 rounded p-4 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Facturé à</p>
        <p className="font-semibold">{client?.nom || 'Client comptoir'}</p>
        {client?.adresse && <p className="text-sm text-gray-600">{client.adresse}</p>}
        {client?.telephone && <p className="text-sm text-gray-600">Tél: {client.telephone}</p>}
        {client?.typeClient === 'professionnel' && client?.nui && (
          <p className="text-sm text-gray-600">NUI: {client.nui}</p>
        )}
        {client?.nui && client?.typeClient !== 'professionnel' && (
          <p className="text-sm text-gray-600">NUI: {client.nui}</p>
        )}
        {client?.rccm && <p className="text-sm text-gray-600">RCCM: {client.rccm}</p>}
      </div>

      {/* Table */}
      <table className="w-full mb-6 text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left py-2 px-3 border border-gray-300 font-semibold">Produit</th>
            <th className="text-center py-2 px-3 border border-gray-300 font-semibold w-16">Qté</th>
            <th className="text-right py-2 px-3 border border-gray-300 font-semibold w-28">PU HT</th>
            <th className="text-right py-2 px-3 border border-gray-300 font-semibold w-28">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lignesHT.map((l, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="py-2 px-3 border border-gray-300">{l.nomProduit}</td>
              <td className="py-2 px-3 border border-gray-300 text-center">{l.quantite}</td>
              <td className="py-2 px-3 border border-gray-300 text-right">
                {fmt(l.prixUnitaireHT)} FCFA
              </td>
              <td className="py-2 px-3 border border-gray-300 text-right">
                {fmt(l.sousTotalHT)} FCFA
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-1 text-sm">
            <span>Total HT</span>
            <span>{fmt(totalHT)} FCFA</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span>TVA 19,25%</span>
            <span>{fmt(tva)} FCFA</span>
          </div>
          <div className="flex justify-between py-2 text-base font-bold border-t-2 border-gray-800 mt-1">
            <span>Total TTC</span>
            <span>{fmt(totalTTC)} FCFA</span>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <p className="text-sm text-gray-600 mb-6">
        Mode de paiement : <span className="font-medium">{methodePaiement}</span>
      </p>

      {/* Conditions */}
      <div className="border-t border-gray-300 pt-4 mb-8">
        <p className="text-xs text-gray-500">
          Conditions : {activeType === 'proforma' ? 'Document non fiscal, valable sous reserve de stock disponible.' : 'Paiement à réception'}
        </p>
      </div>

      {/* Signature */}
      <div className="flex justify-end mt-12">
        <div className="text-center">
          <div className="w-48 border-b border-gray-400 mb-1" style={{ height: 60 }} />
          <p className="text-xs text-gray-500">Signature & cachet</p>
        </div>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <AnimatePresence>
      <motion.div
        key="receipt-overlay"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          key="receipt-content"
          className="my-8 relative"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Toolbar */}
          <div className="no-print flex items-center justify-between bg-gray-900 text-white rounded-t-xl px-4 py-3 gap-3">
            {/* Toggle */}
            <div className="flex bg-gray-800 rounded-lg overflow-hidden text-sm">
              <button
                onClick={() => setActiveType('ticket')}
                className={`px-3 py-1.5 transition-colors ${
                  activeType === 'ticket'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Ticket
              </button>
              <button
                onClick={() => setActiveType('facture')}
                className={`px-3 py-1.5 transition-colors ${
                  activeType === 'facture'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Facture
              </button>
              <button
                onClick={() => setActiveType('proforma')}
                className={`px-3 py-1.5 transition-colors ${
                  activeType === 'proforma'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Proforma
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                <Printer size={15} />
                Imprimer
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                title="Utilise le dialogue d'impression du navigateur — choisir « Enregistrer en PDF »"
              >
                <Download size={15} />
                PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Receipt area */}
          <div
            id="receipt-print-zone"
            ref={printRef}
            className="bg-white rounded-b-xl shadow-2xl overflow-auto"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {activeType === 'ticket' ? <TicketCompact /> : <FacturePro />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReceiptGenerator;
