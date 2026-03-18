/**
 * Formateur de prix en FCFA (Franc CFA - XAF)
 * Utilisé partout dans le frontend e-commerce NEWOTEG
 */
export const formatFCFA = (amount) => {
  if (amount == null || isNaN(amount)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default formatFCFA;
