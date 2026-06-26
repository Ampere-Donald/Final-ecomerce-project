import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { brand } from '../config/brand';

export interface LigneBC {
  produitId: string;
  nomProduit: string;
  designationEn?: string | null;
  quantite: number;
  rate: number;
  prixNegocie: number;
  sousTotal: number;
}

export interface BonCommandeExport {
  reference: string;
  fournisseurNom: string;
  devise: string;
  tauxVersFcfa: number;
  totalDevise: number;
  notes?: string | null;
  createdAt?: string;
  lignes: LigneBC[];
}

const ENCRE: [number, number, number] = [30, 41, 59];
const GRIS: [number, number, number] = [100, 116, 139];
const LIGNE_ALT: [number, number, number] = [247, 248, 250];

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);

/**
 * Bon de commande fournisseur, PDF A4 en anglais.
 * @param compact  true = 2 colonnes serrées (composants), false = tableau simple (accessoires).
 */
export function exportBonCommandePDF(bc: BonCommandeExport, compact = false) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const totalQty = bc.lignes.reduce((s, l) => s + l.quantite, 0);
  const cur = bc.devise;
  const totalFcfa = bc.totalDevise * (bc.tauxVersFcfa || 1);

  // ── En-tête (anglais) ──
  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...ENCRE);
    doc.text(brand.companyName, margin, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(`${brand.branchName} — ${brand.city}`, margin, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...ENCRE);
    doc.text('PURCHASE ORDER', pageW - margin, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(`No. ${bc.reference}`, pageW - margin, 23, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 28, pageW - margin, 28);

    doc.setFontSize(10);
    doc.setTextColor(...ENCRE);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier:', margin, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(bc.fournisseurNom, margin + 22, 35);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    doc.setFontSize(9);
    const dateStr = bc.createdAt ? new Date(bc.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    doc.text(`Date: ${dateStr}`, pageW - margin, 33, { align: 'right' });
    doc.text(`Currency: ${cur}    Total Qty: ${totalQty}`, pageW - margin, 38, { align: 'right' });
  };

  const startY = 44;

  if (!compact) {
    // ── Layout simple (accessoires) : 1 tableau pleine largeur ──
    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin, top: startY },
      head: [['#', 'Designation', 'Qty', 'Rate', 'Negotiated', 'Amount']],
      body: bc.lignes.map((l, i) => [
        String(i + 1),
        l.designationEn || l.nomProduit,
        String(l.quantite),
        fmt(l.rate),
        fmt(l.prixNegocie),
        fmt(l.sousTotal),
      ]),
      foot: [['', 'TOTAL', String(totalQty), '', '', `${fmt(bc.totalDevise)} ${cur}`]],
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.4, lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: ENCRE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      footStyles: { fillColor: [241, 245, 249], textColor: ENCRE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGNE_ALT },
      columnStyles: { 0: { cellWidth: 10, halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      didDrawPage: () => { drawHeader(); drawFooter(doc, margin, pageW, pageH, totalFcfa, cur, bc.tauxVersFcfa); },
    });
  } else {
    // ── Layout 2 colonnes (composants) : on coupe les lignes en deux moitiés ──
    const half = Math.ceil(bc.lignes.length / 2);
    const gauche = bc.lignes.slice(0, half);
    const droite = bc.lignes.slice(half);
    const colW = (pageW - margin * 2 - 6) / 2;
    const head = [['#', 'Designation', 'Qty', 'Neg.', 'Amount']];
    const mkBody = (arr: LigneBC[], offset: number) =>
      arr.map((l, i) => [
        String(offset + i + 1),
        l.designationEn || l.nomProduit,
        String(l.quantite),
        fmt(l.prixNegocie),
        fmt(l.sousTotal),
      ]);

    const common: any = {
      head,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.4, lineColor: [226, 232, 240], lineWidth: 0.1, overflow: 'ellipsize' },
      headStyles: { fillColor: ENCRE, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGNE_ALT },
      columnStyles: { 0: { cellWidth: 7, halign: 'right' }, 2: { cellWidth: 9, halign: 'right' }, 3: { cellWidth: 14, halign: 'right' }, 4: { cellWidth: 16, halign: 'right' } },
      tableWidth: colW,
    };

    autoTable(doc, {
      ...common,
      startY,
      margin: { left: margin, top: startY },
      body: mkBody(gauche, 0),
      didDrawPage: () => { drawHeader(); drawFooter(doc, margin, pageW, pageH, totalFcfa, cur, bc.tauxVersFcfa); },
    });
    autoTable(doc, {
      ...common,
      startY,
      margin: { left: margin + colW + 6, top: startY },
      body: mkBody(droite, half),
    });

    // Bandeau total (sous les 2 colonnes)
    const yEnd = (doc as any).lastAutoTable?.finalY || startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ENCRE);
    doc.text(`TOTAL: ${fmt(bc.totalDevise)} ${cur}   (Qty ${totalQty})`, pageW - margin, Math.min(yEnd + 8, pageH - 20), { align: 'right' });
  }

  doc.save(`purchase_order_${bc.reference}.pdf`);
}

function drawFooter(
  doc: jsPDF, margin: number, pageW: number, pageH: number,
  totalFcfa: number, cur: string, taux: number,
) {
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  if (cur !== 'FCFA') {
    doc.text(`Approx. ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(totalFcfa)} FCFA  (rate 1 ${cur} = ${taux} FCFA)`, margin, pageH - 8);
  }
  const n = (doc as any).internal.getNumberOfPages();
  doc.text(`Page ${n}`, pageW - margin, pageH - 8, { align: 'right' });
}
