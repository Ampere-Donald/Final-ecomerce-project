export type PosPaymentMethod = 'ESPECES' | 'MOBILE_MONEY' | 'CARTE' | 'VIREMENT' | 'CREDIT';
export type CommercialDocumentType = 'TICKET_CAISSE' | 'FACTURE' | 'BON_VENTE';

export interface PosCustomerIdentity {
  id: string;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
}
