import { formatFcfa } from '../pos-shared/formatters';
import type { CommercialDocumentType, PosPaymentMethod } from '../pos-shared/types';

export type PaymentMethod = PosPaymentMethod;
export type DocumentType = CommercialDocumentType;
export type CheckoutStep = 'QUEUE' | 'TICKET' | 'CUSTOMER' | 'PAYMENT' | 'SUCCESS';
export type CheckoutStatus = 'IDLE' | 'VALIDATING' | 'PAID' | 'FAILED';

export interface TicketLine {
  id: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: string | number;
  sousTotal: string | number;
}

export interface CashierTicket {
  id: string;
  numeroTicket: string;
  vendeurId: string;
  vendeur?: { nom?: string | null; prenom?: string | null } | null;
  nomClient?: string | null;
  telephoneClient?: string | null;
  noteCaissier?: string | null;
  client?: CashierClient | null;
  montantTotal: string | number;
  createdAt: string;
  expiresAt: string;
  lignes: TicketLine[];
}

export interface CashierClient {
  id: string;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  limiteCredit?: string | number;
}

export const money = formatFcfa;
