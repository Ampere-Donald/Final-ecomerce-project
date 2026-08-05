export type PosPaymentMethod =
  | 'ESPECES'
  | 'MTN_MOBILE_MONEY'
  | 'ORANGE_MOBILE_MONEY'
  | 'CARTE'
  | 'CREDIT'
  // Valeurs historiques toujours lisibles, mais absentes des nouveaux encaissements.
  | 'MOBILE_MONEY'
  | 'VIREMENT';
export type CommercialDocumentType = 'TICKET_CAISSE' | 'FACTURE' | 'BON_VENTE';

export interface PosCustomerIdentity {
  id: string;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
}
