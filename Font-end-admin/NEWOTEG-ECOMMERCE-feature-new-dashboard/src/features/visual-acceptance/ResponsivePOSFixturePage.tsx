import { useMemo, useState } from 'react';
import { POSVendeur, type POSVendeurPreview } from '../../components/POSVendeur';
import { SellerHome } from '../../components/SellerHome';
import { CashierPOSView } from '../cashier-pos/CashierPOSPage';
import type { CashierClient, CashierTicket, CheckoutStep, DocumentType, PaymentMethod } from '../cashier-pos/types';

const products: POSVendeurPreview['products'] = [
  { id: 'p1', nomProduit: 'Résistance 10KΩ 1/4W', marque: '220Ω ±5%', prixDetail: 50, quantiteStock: 120, categorieNom: 'Résistances' },
  { id: 'p2', nomProduit: 'Condensateur 100µF 25V', marque: 'Composant radial', prixDetail: 200, quantiteStock: 85, categorieNom: 'Condensateurs' },
  { id: 'p3', nomProduit: 'Circuit intégré NE555', marque: 'DIP-8', prixDetail: 450, quantiteStock: 40, categorieNom: 'Circuits' },
  { id: 'p4', nomProduit: 'LED Rouge 5mm', marque: 'Haute luminosité', prixDetail: 100, quantiteStock: 200, categorieNom: 'LED' },
  { id: 'p5', nomProduit: 'Diode 1N4007', marque: 'Redressement', prixDetail: 50, quantiteStock: 150, categorieNom: 'Diodes' },
  { id: 'p6', nomProduit: 'Régulateur 7805', marque: 'TO-220', prixDetail: 250, quantiteStock: 60, categorieNom: 'Circuits' },
];

const sellerItems: POSVendeurPreview['items'] = [
  { produitId: 'p1', nomProduit: products[0].nomProduit, prix: 50, quantite: 2, stockDispo: 120 },
  { produitId: 'p2', nomProduit: products[1].nomProduit, prix: 200, quantite: 4, stockDispo: 85 },
  { produitId: 'p3', nomProduit: products[2].nomProduit, prix: 450, quantite: 1, stockDispo: 40 },
];

const ticket: CashierTicket = {
  id: 'ticket-1048',
  numeroTicket: '#1048',
  vendeurId: 'donald',
  nomClient: 'Martine NDOUMBE',
  telephoneClient: '+237 6 99 12 34 56',
  montantTotal: 12_500,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  lignes: [
    { id: 'l1', nomProduit: 'Riz parfumé 5kg', quantite: 1, prixUnitaire: 5_500, sousTotal: 5_500 },
    { id: 'l2', nomProduit: 'Huile végétale 1L', quantite: 1, prixUnitaire: 2_500, sousTotal: 2_500 },
    { id: 'l3', nomProduit: 'Sucre blanc 1kg', quantite: 1, prixUnitaire: 4_500, sousTotal: 4_500 },
  ],
};

function CashierFixture({ initialStep }: { initialStep: CheckoutStep }) {
  const [selected, setSelected] = useState<CashierTicket | null>(initialStep === 'QUEUE' ? null : ticket);
  const [step, setStep] = useState<CheckoutStep>(initialStep);
  const [method, setMethod] = useState<PaymentMethod>('ESPECES');
  const [documentType, setDocumentType] = useState<DocumentType>('FACTURE');
  const [customer, setCustomer] = useState<CashierClient | null>(['CUSTOMER', 'PAYMENT', 'SUCCESS'].includes(initialStep) ? { id: 'c1', nom: 'Martine', prenom: 'NDOUMBE', telephone: '+237 6 99 12 34 56' } : null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [cashReceived, setCashReceived] = useState(initialStep === 'PAYMENT' || initialStep === 'SUCCESS' ? '15000' : '');
  const [reference, setReference] = useState('');
  const [deposit, setDeposit] = useState('');
  const [dueDate, setDueDate] = useState('');

  const flow = useMemo(() => ({
    tickets: [ticket], selected, step, loading: false, submitting: false, error: null, caisse: { statut: 'OUVERTE', solde: 84_500 },
    method, documentType, customerQuery, customerResults: [], customer, cashReceived, reference, deposit, dueDate,
    result: step === 'SUCCESS' ? { facture: { id: 'f1', numero: 'FAC-2026-1048', dateEmission: new Date().toISOString(), lignes: [], client: customer } } : null,
    creditPreview: null, creatingCustomer: false, total: 12_500, change: method === 'ESPECES' ? Math.max(0, Number(cashReceived) - 12_500) : 0,
    canPay: method !== 'ESPECES' || Number(cashReceived) >= 12_500, queueTotal: 12_500,
    load: async () => {},
    selectTicket: (next: CashierTicket) => { setSelected(next); setCustomerQuery(next.telephoneClient || ''); setStep('TICKET'); },
    closeTicket: () => { setSelected(null); setStep('QUEUE'); },
    checkout: async () => { setStep('SUCCESS'); },
    createCustomer: async (name: string, phone: string) => { const created = { id: 'new', nom: name, telephone: phone }; setCustomer(created); return created; },
    setStep, setMethod, setDocumentType, setCustomerQuery, setCustomer, setCashReceived, setReference, setDeposit, setDueDate,
  }), [cashReceived, customer, customerQuery, deposit, documentType, dueDate, method, reference, selected, step]);

  return <CashierPOSView flow={flow as any} />;
}

export function ResponsivePOSFixturePage() {
  const screen = new URLSearchParams(window.location.search).get('screen') || 'seller-sale';

  if (screen === 'seller-home') {
    return <div className="min-h-screen bg-slate-50 p-3 md:p-6"><SellerHome name="Donald" pendingCount={3} offlineCount={0} loading={false} recentTickets={[{ id: '1', numeroTicket: 'TKT-2026-0158', montantTotal: 18_500, createdAt: new Date().toISOString(), statut: 'EN_ATTENTE' }]} /></div>;
  }
  if (screen.startsWith('cashier-')) {
    const step = screen.replace('cashier-', '').toUpperCase() as CheckoutStep;
    return <div className="min-h-screen bg-slate-50"><CashierFixture initialStep={step} /></div>;
  }

  return <div className="min-h-screen bg-slate-50"><POSVendeur preview={{ sellerName: 'Donald', products, items: sellerItems, scannerOpen: screen === 'seller-scanner' }} /></div>;
}
