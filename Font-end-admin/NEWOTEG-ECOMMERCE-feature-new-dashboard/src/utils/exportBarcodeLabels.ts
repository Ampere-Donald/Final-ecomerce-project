import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

export interface BarcodeLabelProduct {
  nomProduit: string;
  marque?: string | null;
  codeFamille?: string | null;
  code?: string | null;
  prixDetail?: number | null;
}

export type BarcodeLabelFormat = 'roll80' | 'a4';

export const getProductBarcodeValue = (produit: BarcodeLabelProduct): string => {
  const famille = String(produit.codeFamille || '').trim();
  const code = String(produit.code || '').trim();
  if (!code) throw new Error(`Le produit "${produit.nomProduit}" ne possede pas encore de code.`);
  return famille ? `${famille}/${code}` : code;
};

const barcodePng = (value: string): string => {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: 'CODE128',
    displayValue: false,
    background: '#FFFFFF',
    lineColor: '#071B33',
    width: 2,
    height: 76,
    margin: 0,
  });
  return canvas.toDataURL('image/png');
};

/**
 * Genere une planche A4 de 21 etiquettes (3 x 7), facile a imprimer ou a
 * decouper. Le contenu encode est `famille/code`, format deja reconnu par le
 * scanner Newoteg et non ambigu pour les anciennes references.
 */
export const exportProductBarcodeLabels = (
  produits: BarcodeLabelProduct[],
  copies = 1,
  format: BarcodeLabelFormat = 'roll80',
): void => {
  const valides = produits.filter((p) => p.code);
  if (!valides.length) throw new Error('Aucun produit avec un code-barres a imprimer.');

  const etiquettes = valides.flatMap((produit) =>
    Array.from({ length: Math.max(1, Math.floor(copies)) }, () => produit),
  );
  if (format === 'roll80') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [40, 80], compress: true });

    etiquettes.forEach((produit, index) => {
      if (index > 0) doc.addPage([40, 80], 'landscape');
      const largeur = doc.internal.pageSize.getWidth();
      const hauteur = doc.internal.pageSize.getHeight();
      const value = getProductBarcodeValue(produit);

      doc.setDrawColor(7, 27, 51);
      doc.setLineWidth(0.3);
      doc.roundedRect(1.5, 1.5, largeur - 3, hauteur - 3, 1.2, 1.2, 'S');

      doc.setTextColor(7, 27, 51);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('NEWOTEG', 4, 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.text('X ELECTRONICS - DOUALA', 4, 9.2);

      if (produit.prixDetail != null) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${Number(produit.prixDetail).toLocaleString('fr-FR')} FCFA`, largeur - 4, 6.8, { align: 'right' });
      }

      doc.setLineWidth(0.2);
      doc.line(4, 11, largeur - 4, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.4);
      const nom = doc.splitTextToSize(produit.nomProduit, largeur - 8).slice(0, 2);
      doc.text(nom, 4, 15);

      doc.addImage(barcodePng(value), 'PNG', 5, 21, largeur - 10, 10.5);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.4);
      doc.text(value, largeur / 2, 35, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text('CODE INTERNE', largeur - 4, 37.2, { align: 'right' });
    });

    const date = new Date().toISOString().slice(0, 10);
    doc.save(`etiquettes-rouleau-80mm-${date}.pdf`);
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const largeur = 63;
  const hauteur = 38;
  const espaceX = 3;
  const espaceY = 2;
  const departX = 7;
  const departY = 7;
  const parLigne = 3;
  const parPage = 21;

  etiquettes.forEach((produit, index) => {
    if (index > 0 && index % parPage === 0) doc.addPage();
    const position = index % parPage;
    const colonne = position % parLigne;
    const ligne = Math.floor(position / parLigne);
    const x = departX + colonne * (largeur + espaceX);
    const y = departY + ligne * (hauteur + espaceY);
    const value = getProductBarcodeValue(produit);

    doc.setDrawColor(215, 221, 230);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, largeur, hauteur, 1.4, 1.4, 'S');

    // Signature Newoteg discrete : une seule ligne bleue, pas de bordure lourde.
    doc.setFillColor(31, 72, 196);
    doc.roundedRect(x + 3, y + 3, 8, 1.2, 0.6, 0.6, 'F');

    doc.setTextColor(12, 25, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    const nom = doc.splitTextToSize(produit.nomProduit, largeur - 16).slice(0, 2);
    doc.text(nom, x + 3, y + 7.3);

    if (produit.prixDetail != null) {
      doc.setFontSize(7.2);
      doc.setTextColor(31, 72, 196);
      doc.text(`${Number(produit.prixDetail).toLocaleString('fr-FR')} FCFA`, x + largeur - 3, y + 7.3, { align: 'right' });
    }

    doc.addImage(barcodePng(value), 'PNG', x + 4, y + 15.5, largeur - 8, 13);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(12, 25, 45);
    doc.text(value, x + largeur / 2, y + 31.4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(92, 105, 124);
    doc.text('NEWOTEG - X ELECTRONICS', x + largeur / 2, y + 35.2, { align: 'center' });
  });

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`etiquettes-planche-a4-${date}.pdf`);
};
