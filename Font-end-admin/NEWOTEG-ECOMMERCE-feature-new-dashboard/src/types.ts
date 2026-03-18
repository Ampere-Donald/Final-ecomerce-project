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
