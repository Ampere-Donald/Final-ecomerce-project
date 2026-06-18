import { jsPDF } from 'jspdf';

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

export function exportInventairePDF(inv: InventaireExport, prix: PrixMap = {}) {
  const avecCout = coutsDisponibles(prix);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const marginX = 12;
  let y = 16;

  doc.setFontSize(15);
  doc.text(`Inventaire ${inv.reference}`, marginX, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`${inv.perimetre}  •  Statut : ${inv.statut}`, marginX, y);
  y += 8;
  doc.setTextColor(0);

  // En-têtes de colonnes
  const cols = avecCout
    ? [
        { t: 'Produit', x: marginX, w: 70 },
        { t: 'Sys.', x: marginX + 72 },
        { t: 'Compté', x: marginX + 90 },
        { t: 'Écart', x: marginX + 112 },
        { t: 'Val. coût', x: marginX + 134 },
      ]
    : [
        { t: 'Produit', x: marginX, w: 95 },
        { t: 'Système', x: marginX + 100 },
        { t: 'Compté', x: marginX + 130 },
        { t: 'Écart', x: marginX + 160 },
      ];

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  cols.forEach((c) => doc.text(c.t, c.x, y));
  y += 2;
  doc.setDrawColor(200);
  doc.line(marginX, y, 200, y);
  y += 4;
  doc.setFont(undefined, 'normal');

  const nouvellePage = () => {
    doc.addPage();
    y = 16;
  };

  for (const l of inv.lignes) {
    if (y > 285) nouvellePage();
    const p = prix[l.produitId] || {};
    const nom = l.nomProduit.length > 42 ? l.nomProduit.slice(0, 41) + '…' : l.nomProduit;
    doc.text(nom, cols[0].x, y);
    if (avecCout) {
      doc.text(String(l.stockSysteme), cols[1].x, y);
      doc.text(l.stockCompte != null ? String(l.stockCompte) : '—', cols[2].x, y);
      doc.text(l.ecart != null ? String(l.ecart) : '—', cols[3].x, y);
      doc.text(fmt(Math.round((Number(p.cmupActuel) || 0) * l.stockSysteme)), cols[4].x, y);
    } else {
      doc.text(String(l.stockSysteme), cols[1].x, y);
      doc.text(l.stockCompte != null ? String(l.stockCompte) : '—', cols[2].x, y);
      doc.text(l.ecart != null ? String(l.ecart) : '—', cols[3].x, y);
    }
    y += 6;
  }

  doc.save(`inventaire_${inv.reference}.pdf`);
}
