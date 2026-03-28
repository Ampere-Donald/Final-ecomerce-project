import { LucideIcon } from 'lucide-react';

export interface Order {
  id: string;
  date: string;
  items: string;
  amount: number;
  status: 'In Transit' | 'Delivered' | 'Pending' | 'Cancelled';
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

export interface User {
  name: string;
  email: string;
  role: string;
  id: string;
  joinedDate: string;
  ordersTotal: number;
  creditLimit: number;
  availableCredit: number;
  balance: number;
  nextInvoiceDue: string;
  avatar: string;
}

// ── Commande (e-commerce orders) ──────────────────────────
export type StatutCommande = 'EN_ATTENTE' | 'CONFIRMEE' | 'EN_LIVRAISON' | 'LIVREE' | 'ANNULEE';
export type ModeReception = 'LIVRAISON' | 'RETRAIT_MAGASIN';

export interface LigneCommande {
  id: string;
  produitId: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
  produit?: {
    id: string;
    nomProduit: string;
    imageUrl?: string;
  };
}

export interface Commande {
  id: string;
  numeroSuivi: string;
  nomClient: string;
  telephone: string;
  adresseLivraison: string;
  montantTotal: number;
  statut: StatutCommande;
  modeReception: ModeReception;
  dateCommande: string;
  dateLivraison?: string;
  dateConfirmation?: string;
  dateAnnulation?: string;
  lignes: LigneCommande[];
}
