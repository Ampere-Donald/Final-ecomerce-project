import type { PosPaymentMethod } from './types';

export type CheckoutPaymentMethod = Exclude<PosPaymentMethod, 'MOBILE_MONEY' | 'VIREMENT'>;

export const CHECKOUT_PAYMENT_METHODS: Array<{
  id: CheckoutPaymentMethod;
  label: string;
  operator?: 'MTN' | 'ORANGE';
}> = [
  { id: 'ESPECES', label: 'Espèces' },
  { id: 'MTN_MOBILE_MONEY', label: 'MTN MoMo', operator: 'MTN' },
  { id: 'ORANGE_MOBILE_MONEY', label: 'Orange Money', operator: 'ORANGE' },
  { id: 'CARTE', label: 'Carte' },
  { id: 'CREDIT', label: 'Crédit' },
];

const PAYMENT_LABELS: Record<PosPaymentMethod, string> = {
  ESPECES: 'Espèces',
  MTN_MOBILE_MONEY: 'MTN Mobile Money',
  ORANGE_MOBILE_MONEY: 'Orange Money',
  CARTE: 'Carte',
  CREDIT: 'Crédit',
  MOBILE_MONEY: 'Mobile Money (ancien)',
  VIREMENT: 'Virement',
};

export const paymentMethodLabel = (method: string): string =>
  PAYMENT_LABELS[method as PosPaymentMethod] || method.replace(/_/g, ' ');

export const paymentMethodNeedsReference = (method: PosPaymentMethod): boolean =>
  ['MTN_MOBILE_MONEY', 'ORANGE_MOBILE_MONEY', 'MOBILE_MONEY', 'CARTE', 'VIREMENT'].includes(method);
