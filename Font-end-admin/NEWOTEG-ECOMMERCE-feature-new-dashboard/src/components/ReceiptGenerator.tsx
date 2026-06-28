import React, { useRef } from 'react';
import { Printer, FileText, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { brand } from '../config/brand';
import { printRaw } from '../services/qzPrinter';
import { buildTicketEscPos } from '../services/ticketEscpos';

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
      ? '@page { size: 58mm auto; margin: 0; }'
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
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: ${activeType === 'ticket' ? '3mm' : '16px'};
      background: white;
    }
    ${activeType === 'ticket' ? `
      body > div {
        width: 100% !important;
        max-width: 100% !important;
      }
      table {
        width: 100% !important;
        table-layout: fixed;
      }
      td:last-child {
        text-align: right !important;
        white-space: nowrap;
      }
    ` : ''}
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

  // Repli : ancienne impression via le navigateur (iframe 58 mm). Utilisée
  // uniquement si QZ Tray n'est pas lancé, pour ne jamais bloquer la caisse.
  const printTicketBrowserFallback = () => {
    const zone = document.getElementById('receipt-print-zone');
    if (!zone) return;
    const ticketDiv = zone.firstElementChild as HTMLElement | null;
    if (!ticketDiv) return;

    // Clone ticket and strip the hardcoded 220px width so it fills the paper
    const clone = ticketDiv.cloneNode(true) as HTMLElement;
    clone.style.width = '';
    clone.style.margin = '0';

    // Iframe isolé : son propre document = @page 58mm appliqué sans conflit
    // avec la page React (pas de modal position:fixed, pas de A4 par défaut)
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:58mm;height:1px;border:0;');
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) { iframe.remove(); return; }

    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>'
      + '@page{size:58mm auto;margin:0}'
      + 'body{margin:0;padding:3mm;background:#fff;box-sizing:border-box}'
      + '</style></head><body></body></html>');
    doc.close();
    doc.body.appendChild(clone);

    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 150);
  };

  const handlePrint = async () => {
    // Factures / proformas A4 : impression PDF navigateur inchangée.
    if (activeType !== 'ticket') { openPrintWindow(false); return; }

    // Ticket 58 mm : impression directe ESC/POS via QZ Tray (fiable, sans Chrome).
    try {
      await printRaw(
        buildTicketEscPos({
          lignes,
          montantTotal,
          methodePaiement,
          numero: displayNumero,
          client: client ? { nom: client.nom, telephone: client.telephone } : null,
          dateVente,
        }),
      );
    } catch (e) {
      // QZ Tray éteint / non autorisé → repli automatique sur l'impression navigateur.
      console.warn('QZ Tray indisponible — repli sur impression navigateur.', e);
      printTicketBrowserFallback();
    }
  };

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
        const ticketHeight = Math.max(120, Math.ceil((canvas.height * 58) / canvas.width) + 10);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, ticketHeight] });
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
      pdf.text(`${brand.city} | Tél: ${brand.phone}`, margin, 41);

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
        head: [['Produit', 'Qté', 'PU (FCFA)', 'Total (FCFA)']],
        body: lignes.map((l) => [
          l.nomProduit,
          String(l.quantite),
          fmt(l.prixUnitaire),
          fmt(l.sousTotal),
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
      pdf.setDrawColor(30);
      pdf.line(totalsX, finalY + 2, W - margin, finalY + 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(20);
      pdf.text('TOTAL', totalsX, finalY + 8);
      pdf.text(`${fmt(montantTotal)} FCFA`, W - margin, finalY + 8, { align: 'right' });

      // ---- Paiement ----
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80);
      pdf.text(`Mode de paiement : ${methodePaiement}`, margin, finalY + 18);

      // ---- Notes proforma ----
      if (activeType === 'proforma') {
        const noteText = notes?.trim() || 'Devis valable 30 jours. Prix sous réserve de disponibilité des stocks.';
        pdf.setFontSize(8);
        pdf.setTextColor(80);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notes :', margin, finalY + 25);
        pdf.setFont('helvetica', 'normal');
        const noteLines = pdf.splitTextToSize(noteText, W - margin * 2 - 15);
        pdf.text(noteLines, margin + 15, finalY + 25);
      }

      // ---- Conditions ----
      pdf.setFontSize(8);
      pdf.setTextColor(140);
      pdf.setFont('helvetica', 'normal');
      const conditions = activeType === 'proforma'
        ? 'Document non fiscal, valable sous réserve de stock disponible.'
        : 'Paiement à réception.';
      pdf.text(conditions, margin, finalY + 32);

      // ---- Signature ----
      const sigY = finalY + 44;
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
  // Ticket Compact — 58mm paper, 48mm printable zone
  // All styles are inline to be 100% reliable in @media print context.
  // -----------------------------------------------------------------------
  const S = {
    root: {
      width: 220,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 9,
      color: '#000',
      background: '#fff',
      margin: '0 auto',
      padding: '4px 0',
    } as React.CSSProperties,
    center: { textAlign: 'center' as const },
    dashedBorder: { borderTop: '1px dashed #666' },
    sep: { borderTop: '1px dashed #666', margin: '4px 0' } as React.CSSProperties,
    row: { display: 'flex', justifyContent: 'space-between' } as React.CSSProperties,
    bold: { fontWeight: 'bold' } as React.CSSProperties,
    mb2: { marginBottom: 4 } as React.CSSProperties,
    mt2: { marginTop: 4 } as React.CSSProperties,
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      tableLayout: 'fixed' as const,
      fontSize: 9,
      lineHeight: 1.5,
    } as React.CSSProperties,
    tdLeft: { textAlign: 'left' as const, wordBreak: 'break-word' as const, paddingBottom: 2, paddingRight: 3 },
    tdRight: { textAlign: 'right' as const, paddingBottom: 2 },
  };

  const TicketCompact = () => (
    <div style={S.root}>

      {/* ── En-tête ── */}
      <div style={{ ...S.center, borderBottom: '1px dashed #666', paddingBottom: 5, marginBottom: 5 }}>
        <p style={{ ...S.bold, fontSize: 13, letterSpacing: 1 }}>{brand.legalName}</p>
        <p style={{ ...S.bold, fontSize: 9 }}>{brand.branchName}</p>
        <p style={{ fontSize: 9 }}>{brand.branchDescription}</p>
        <p style={{ fontSize: 9 }}>{brand.city}</p>
        <p style={{ fontSize: 9 }}>Tél: {brand.phone}</p>
      </div>

      {/* ── Date + N° ticket ── */}
      <div style={{ ...S.row, ...S.mb2, fontSize: 9 }}>
        <span>{fmtDateTime(dateVente)}</span>
        <span>{displayNumero}</span>
      </div>

      {/* ── Client (optionnel) ── */}
      {client && (
        <div style={{ fontSize: 9, borderBottom: '1px dashed #666', paddingBottom: 3, marginBottom: 4 }}>
          <p>Client: {client.nom}</p>
          {client.telephone && <p>Tél: {client.telephone}</p>}
        </div>
      )}

      {/* ── Séparateur ── */}
      <div style={S.sep} />

      {/* ── Lignes de vente ──
           col1 = 58% (~112px) : nom produit (word-wrap autorisé)
           col2 = 42% (~81px)  : montant (max "1 000 000 FCFA" = 14 chars ≈ 76px)
      */}
      <table style={{ ...S.table, marginBottom: 4 }}>
        <colgroup>
          <col style={{ width: '58%' }} />
          <col style={{ width: '42%' }} />
        </colgroup>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i}>
              <td style={S.tdLeft}>{l.nomProduit} x{l.quantite}</td>
              <td style={S.tdRight}>{fmt(l.sousTotal)} FCFA</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Séparateur ── */}
      <div style={S.sep} />

      {/* ── Totaux ──
           col1 = 50% (~90px) : libellé
           col2 = 50% (~90px) : montant
      */}
      <table style={S.table}>
        <colgroup>
          <col style={{ width: '50%' }} />
          <col style={{ width: '50%' }} />
        </colgroup>
        <tbody>
          <tr style={{ ...S.bold, fontSize: 10 }}>
            <td style={{ paddingTop: 2 }}>TOTAL</td>
            <td style={{ textAlign: 'right', paddingTop: 2 }}>{fmt(montantTotal)} FCFA</td>
          </tr>
        </tbody>
      </table>

      {/* ── Paiement ── */}
      <div style={{ fontSize: 9, marginTop: 5, borderTop: '1px dashed #666', paddingTop: 3 }}>
        <p>Paiement: {methodePaiement}</p>
      </div>

      {/* ── Pied de ticket ── */}
      <div style={{ ...S.center, fontSize: 9, marginTop: 6, borderTop: '1px dashed #666', paddingTop: 5 }}>
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
            <th className="text-right py-2 px-3 border border-gray-300 font-semibold w-28">PU (FCFA)</th>
            <th className="text-right py-2 px-3 border border-gray-300 font-semibold w-28">Total (FCFA)</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="py-2 px-3 border border-gray-300">{l.nomProduit}</td>
              <td className="py-2 px-3 border border-gray-300 text-center">{l.quantite}</td>
              <td className="py-2 px-3 border border-gray-300 text-right">
                {fmt(l.prixUnitaire)} FCFA
              </td>
              <td className="py-2 px-3 border border-gray-300 text-right">
                {fmt(l.sousTotal)} FCFA
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
            <div className="flex justify-between py-2 text-base font-bold border-t-2 border-gray-800 mt-1">
              <span>TOTAL</span>
              <span>{fmt(montantTotal)} FCFA</span>
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
