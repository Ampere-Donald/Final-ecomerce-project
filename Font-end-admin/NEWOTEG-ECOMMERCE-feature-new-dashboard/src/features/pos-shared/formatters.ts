export const formatFcfa = (value: string | number): string =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value) || 0)} FCFA`;

export const formatCustomerName = (customer?: { nom?: string | null; prenom?: string | null } | null) =>
  customer ? `${customer.nom || ''} ${customer.prenom || ''}`.trim() : '';
