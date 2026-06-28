import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { brand } from '../config/brand';

export interface LigneInv {
  produitId: string;
  nomProduit: string;
  codeFamille?: string | null;
  stockSysteme: number;
  stockCompte?: number | null;
  ecart?: number | null;
}

export interface InventaireExport {
  reference: string;
  perimetre: string;
  statut: string;
  createdAt?: string;
  lignes: LigneInv[];
}

/** Prix par produit ; `cmupActuel` n'est présent que pour le super admin (backend). */
export type PrixMap = Record<string, { prixDetail?: number | null; cmupActuel?: number | null }>;

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
const telecharger = (blob: Blob, nom: string) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nom;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/** Le coût n'est exporté que si au moins un produit porte un CMUP (donc super admin). */
const coutsDisponibles = (prix: PrixMap): boolean =>
  Object.values(prix).some((p) => p && p.cmupActuel != null);

export function exportInventaireCSV(inv: InventaireExport, prix: PrixMap = {}) {
  const avecCout = coutsDisponibles(prix);
  const headers = ['Produit', 'Famille', 'Stock système', 'Stock compté', 'Écart', 'Valeur vente'];
  if (avecCout) headers.push('Valeur coût (CMUP)');

  const rows = inv.lignes.map((l) => {
    const p = prix[l.produitId] || {};
    const valVente = (Number(p.prixDetail) || 0) * l.stockSysteme;
    const cells = [
      `"${l.nomProduit.replace(/"/g, '""')}"`,
      `"${l.codeFamille || ''}"`,
      String(l.stockSysteme),
      l.stockCompte != null ? String(l.stockCompte) : '',
      l.ecart != null ? String(l.ecart) : '',
      String(Math.round(valVente)),
    ];
    if (avecCout) cells.push(String(Math.round((Number(p.cmupActuel) || 0) * l.stockSysteme)));
    return cells.join(',');
  });

  const csv = '﻿' + [headers.join(','), ...rows].join('\n');
  telecharger(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `inventaire_${inv.reference}.csv`,
  );
}

// Palette épurée (slate)
const ENCRE: [number, number, number] = [30, 41, 59];      // slate-800
const GRIS: [number, number, number] = [100, 116, 139];     // slate-500
const LIGNE_ALT: [number, number, number] = [247, 248, 250];
const VERT: [number, number, number] = [22, 163, 74];
const ROUGE: [number, number, number] = [220, 38, 38];

export function exportInventairePDF(inv: InventaireExport, prix: PrixMap = {}) {
  const avecCout = coutsDisponibles(prix);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const dateEdition = new Date().toLocaleString('fr-FR');

  // ── Totaux ──
  let totalSys = 0, totalEcart = 0, totalValVente = 0, totalValCout = 0;
  inv.lignes.forEach((l) => {
    const p = prix[l.produitId] || {};
    totalSys += l.stockSysteme;
    if (l.ecart != null) totalEcart += l.ecart;
    totalValVente += (Number(p.prixDetail) || 0) * l.stockSysteme;
    totalValCout += (Number(p.cmupActuel) || 0) * l.stockSysteme;
  });

  // ── Corps du tableau ──
  const head = avecCout
    ? [['Produit', 'Famille', 'Stock sys.', 'Compté', 'Écart', 'Valeur coût']]
    : [['Produit', 'Famille', 'Stock système', 'Compté', 'Écart']];

  const body = inv.lignes.map((l) => {
    const p = prix[l.produitId] || {};
    const base = [
      l.nomProduit,
      l.codeFamille || '—',
      String(l.stockSysteme),
      l.stockCompte != null ? String(l.stockCompte) : '—',
      l.ecart != null ? (l.ecart > 0 ? `+${l.ecart}` : String(l.ecart)) : '—',
    ];
    if (avecCout) base.push(fmt(Math.round((Number(p.cmupActuel) || 0) * l.stockSysteme)));
    return base;
  });

  const foot = avecCout
    ? [['Total', '', String(totalSys), '', totalEcart > 0 ? `+${totalEcart}` : String(totalEcart), `${fmt(Math.round(totalValCout))} FCFA`]]
    : [['Total', '', String(totalSys), '', totalEcart > 0 ? `+${totalEcart}` : String(totalEcart)]];

  const idxEcart = 4;
  const idxNum = avecCout ? [2, 3, 4, 5] : [2, 3, 4];

  autoTable(doc, {
    head,
    body,
    foot,
    startY: 42,
    margin: { left: margin, right: margin, top: 42 },
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.4, textColor: [40, 40, 40], lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: ENCRE, textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'left' },
    footStyles: { fillColor: [241, 245, 249], textColor: ENCRE, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: LIGNE_ALT },
    columnStyles: idxNum.reduce((acc, i) => { acc[i] = { halign: 'right', cellWidth: avecCout ? 22 : 28 }; return acc; }, { 1: { textColor: GRIS } } as any),
    // Coloration de l'écart (vert/rouge)
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === idxEcart) {
        const v = data.cell.raw as string;
        if (v && v.startsWith('+')) data.cell.styles.textColor = VERT;
        else if (v && v.startsWith('-')) data.cell.styles.textColor = ROUGE;
        else data.cell.styles.textColor = GRIS;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    // En-tête + pied de page sur chaque page
    didDrawPage: (data: any) => {
      // En-tête
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...ENCRE);
      doc.text(brand.companyName, margin, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRIS);
      doc.text(brand.branchName, margin, 25);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...ENCRE);
      doc.text("Fiche d'inventaire", pageW - margin, 20, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRIS);
      doc.text(inv.reference, pageW - margin, 25, { align: 'right' });

      // Bandeau d'infos
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 30, pageW - margin, 30);
      doc.setFontSize(9);
      doc.setTextColor(...ENCRE);
      doc.text(`${inv.perimetre}`, margin, 36);
      doc.setTextColor(...GRIS);
      doc.text(`Statut : ${inv.statut.replace('_', ' ')}    Valeur stock (vente) : ${fmt(Math.round(totalValVente))} FCFA`, pageW - margin, 36, { align: 'right' });

      // Pied de page
      const pageNo = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(`Édité le ${dateEdition}`, margin, pageH - 8);
      doc.text(`Page ${data.pageNumber} / ${pageNo}`, pageW - margin, pageH - 8, { align: 'right' });
    },
  });

  doc.save(`inventaire_${inv.reference}.pdf`);
}
