import React, { useRef, useMemo } from 'react';
import { Printer, FileText, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { brand } from '../config/brand';

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
  type: 'ticket' | 'facture' | 'proforma' | 'factureVirtuelle';
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
  notes?: string;
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
    notes,
    onClose,
  } = props;

  const [activeType, setActiveType] = React.useState<'ticket' | 'facture' | 'proforma' | 'factureVirtuelle'>(initialType === 'factureVirtuelle' ? 'facture' : initialType);
  const isVirtuelle = initialType === 'factureVirtuelle';
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
      : '@page { size: A4 portrait; margin: 8mm; }';
    const printCompact = activeType !== 'ticket' ? `
      @media print {
        table td, table th { padding: 3px 6px !important; font-size: 11px !important; }
        .facture-footer { break-inside: avoid !important; page-break-inside: avoid !important; }
      }` : '';

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
    body { margin: 0; padding: ${activeType === 'ticket' ? '0' : '16px'}; background: white; }
    ${printCompact}
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

    // Ticket : html2canvas (format thermique variable, pas de pagination)
    if (activeType === 'ticket') {
      const prevOverflow = container.style.overflow;
      const prevMaxHeight = container.style.maxHeight;
      container.style.overflow = 'visible';
      container.style.maxHeight = 'none';
      try {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
          import('html2canvas-pro'),
          import('jspdf'),
        ]);
        const target = (container.firstElementChild as HTMLElement) ?? container;
        const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
        const imgData = canvas.toDataURL('image/png');
        const ticketHeight = Math.max(120, Math.ceil((canvas.height * 80) / canvas.width) + 10);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, ticketHeight] });
        const margin = 4;
        const contentWidth = pdf.internal.pageSize.getWidth() - margin * 2;
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, (canvas.height * contentWidth) / canvas.width);
        pdf.save(`${numero}.pdf`);
      } catch (err) {
        console.error('Erreur PDF ticket:', err);
        alert(`Erreur PDF: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        container.style.overflow = prevOverflow;
        container.style.maxHeight = prevMaxHeight;
      }
      return;
    }

    // Facture / Proforma : jsPDF natif — pas de coupure de ligne
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const margin = 14;
      const label = activeType === 'proforma' ? 'FACTURE PROFORMA' : 'FACTURE';

      // ---- En-tête société ----
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('NEWOTEG SARL', margin, 20);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text('Pièces Électroniques', margin, 26);
      pdf.text('NUI: P00000000000X (placeholder)', margin, 31);
      pdf.text('RCCM: RC/DLA/2024/X/00000 (placeholder)', margin, 36);
      pdf.text('Douala, Cameroun | Tél: +237 6XX XXX XXX', margin, 41);

      // ---- En-tête document (droite) ----
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(30);
      pdf.text(label, W - margin, 20, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80);
      pdf.text(`N° ${displayNumero}`, W - margin, 27, { align: 'right' });
      pdf.text(`Date : ${fmtDate(dateVente)}`, W - margin, 33, { align: 'right' });

      // ---- Bloc client ----
      let cy = 52;
      pdf.setDrawColor(200);
      pdf.setFillColor(248, 248, 248);
      pdf.roundedRect(margin, cy, W - margin * 2, client?.adresse || client?.telephone ? 28 : 20, 2, 2, 'FD');
      pdf.setFontSize(7.5);
      pdf.setTextColor(120);
      pdf.text('FACTURÉ À', margin + 4, cy + 6);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30);
      pdf.text(client?.nom || 'Client comptoir', margin + 4, cy + 13);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80);
      let clientY = cy + 19;
      if (client?.telephone) { pdf.text(`Tél : ${client.telephone}`, margin + 4, clientY); clientY += 5; }
      if (client?.adresse)   { pdf.text(client.adresse, margin + 4, clientY); clientY += 5; }
      if (client?.nui)       { pdf.text(`NUI : ${client.nui}`, margin + 4, clientY); clientY += 5; }
      if (client?.rccm)      { pdf.text(`RCCM : ${client.rccm}`, margin + 4, clientY); }

      // ---- Tableau des lignes ----
      const tableTop = cy + (client?.adresse || client?.telephone ? 34 : 26);
      autoTable(pdf, {
        startY: tableTop,
        margin: { left: margin, right: margin },
        head: [['Produit', 'Qté', 'PU HT (FCFA)', 'Total HT (FCFA)']],
        body: lignesHT.map((l) => [
          l.nomProduit,
          String(l.quantite),
          fmt(l.prixUnitaireHT),
          fmt(l.sousTotalHT),
        ]),
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: 40 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'center', cellWidth: 18 },
          2: { halign: 'right', cellWidth: 38 },
          3: { halign: 'right', cellWidth: 38 },
        },
        didDrawPage: (_data) => {
          // numéro de page en pied
          const pageCount = (pdf as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
          pdf.setFontSize(8);
          pdf.setTextColor(160);
          pdf.text(
            `Page ${pageCount}`,
            W / 2,
            pdf.internal.pageSize.getHeight() - 8,
            { align: 'center' },
          );
        },
      });

      // ---- Totaux ----
      const finalY = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      const totalsX = W - margin - 70;
      pdf.setFontSize(9);
      pdf.setTextColor(60);
      pdf.text('Total HT', totalsX, finalY);
      pdf.text(`${fmt(totalHT)} FCFA`, W - margin, finalY, { align: 'right' });
      pdf.text('TVA 19,25%', totalsX, finalY + 6);
      pdf.text(`${fmt(tva)} FCFA`, W - margin, finalY + 6, { align: 'right' });
      pdf.setDrawColor(30);
      pdf.line(totalsX, finalY + 9, W - margin, finalY + 9);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(20);
      pdf.text('Total TTC', totalsX, finalY + 15);
      pdf.text(`${fmt(totalTTC)} FCFA`, W - margin, finalY + 15, { align: 'right' });

      // ---- Paiement ----
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80);
      pdf.text(`Mode de paiement : ${methodePaiement}`, margin, finalY + 24);

      // ---- Notes proforma ----
      if (activeType === 'proforma') {
        const noteText = notes?.trim() || 'Devis valable 30 jours. Prix sous réserve de disponibilité des stocks.';
        pdf.setFontSize(8);
        pdf.setTextColor(80);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notes :', margin, finalY + 31);
        pdf.setFont('helvetica', 'normal');
        const noteLines = pdf.splitTextToSize(noteText, W - margin * 2 - 15);
        pdf.text(noteLines, margin + 15, finalY + 31);
      }

      // ---- Conditions ----
      pdf.setFontSize(8);
      pdf.setTextColor(140);
      pdf.setFont('helvetica', 'normal');
      const conditions = activeType === 'proforma'
        ? 'Document non fiscal, valable sous réserve de stock disponible.'
        : 'Paiement à réception.';
      pdf.text(conditions, margin, finalY + 38);

      // ---- Signature ----
      const sigY = finalY + 50;
      pdf.setDrawColor(180);
      pdf.line(W - margin - 48, sigY, W - margin, sigY);
      pdf.setFontSize(8);
      pdf.setTextColor(140);
      pdf.text('Signature & cachet', W - margin - 24, sigY + 5, { align: 'center' });

      pdf.save(`${numero}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert(`Erreur PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --- Derived display number ---
  const displayNumero = isVirtuelle && !numero.includes('•') ? `${numero} •` : numero;
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
        <p className="font-bold text-sm tracking-wide">{brand.legalName}</p>
        <p className="text-[10px] font-semibold">{brand.branchName}</p>
        <p className="text-[10px]">{brand.branchDescription}</p>
        <p className="text-[10px]">{brand.city}</p>
        <p className="text-[10px]">Tél: {brand.phone}</p>
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
          <h1 className="text-xl font-bold text-gray-900">{brand.legalName}</h1>
          <p className="text-sm font-semibold text-gray-700">{brand.branchName}</p>
          <p className="text-sm text-gray-600">{brand.branchDescription}</p>
          <p className="text-xs text-gray-500 mt-1">NUI: P00000000000X (placeholder)</p>
          <p className="text-xs text-gray-500">RCCM: RC/DLA/2024/X/00000 (placeholder)</p>
          <p className="text-xs text-gray-500">{brand.city}</p>
          <p className="text-xs text-gray-500">Tél: {brand.phone}</p>
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

      {/* Pied de facture — regroupé pour éviter coupure de page */}
      <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        {/* Totals */}
        <div className="flex justify-end mb-4">
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
        <p className="text-sm text-gray-600 mb-3">
          Mode de paiement : <span className="font-medium">{methodePaiement}</span>
        </p>

        {/* Notes proforma */}
        {activeType === 'proforma' && (
          <div className="border border-gray-200 rounded p-3 mb-3 bg-gray-50">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700">
              {notes?.trim() || 'Devis valable 30 jours. Prix sous réserve de disponibilité des stocks.'}
            </p>
          </div>
        )}

        {/* Conditions */}
        <div className="border-t border-gray-300 pt-3 mb-4">
          <p className="text-xs text-gray-500">
            Conditions : {activeType === 'proforma' ? 'Document non fiscal, valable sous réserve de stock disponible.' : 'Paiement à réception'}
          </p>
        </div>

        {/* Signature */}
        <div className="flex justify-end mt-4">
          <div className="text-center">
            <div className="w-48 border-b border-gray-400 mb-1" style={{ height: 40 }} />
            <p className="text-xs text-gray-500">Signature & cachet</p>
          </div>
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
