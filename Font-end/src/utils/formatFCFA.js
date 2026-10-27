/**
 * Formateur de prix en FCFA (Franc CFA - XAF)
 * Utilisé partout dans le frontend e-commerce NEWOTEG
 */
let formatter;

export const formatFCFA = (amount) => {
  if (amount == null || isNaN(amount)) return '—';
  // Price cards share a formatter; constructing one per price repeats locale
  // initialization on every provider update, especially on slower phones.
  formatter ||= new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
};

export default formatFCFA;
