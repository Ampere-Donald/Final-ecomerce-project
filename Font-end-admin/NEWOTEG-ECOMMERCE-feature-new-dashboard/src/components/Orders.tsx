import React from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Download, ExternalLink } from 'lucide-react';
import { Order } from '../types';

const MOCK_ORDERS: Order[] = [
  { id: '#ORD-90210', date: '28 Juil 2024', items: '24x Pompes Industrielles', amount: 12400, status: 'In Transit' },
  { id: '#ORD-89422', date: '12 Juil 2024', items: '120x Kits de Filtres', amount: 3150, status: 'Delivered' },
  { id: '#ORD-87103', date: '30 Juin 2024', items: '10x Engrenages Lourds', amount: 8900, status: 'Delivered' },
  { id: '#ORD-86554', date: '15 Juin 2024', items: '5x Pistons Hydrauliques', amount: 4200, status: 'Delivered' },
  { id: '#ORD-85432', date: '22 Mai 2024', items: '50x Soupapes de Sécurité', amount: 1500, status: 'Cancelled' },
  { id: '#ORD-84211', date: '05 Mai 2024', items: '15x Panneaux de Contrôle', amount: 7800, status: 'Delivered' },
];

export const Orders = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Historique des Commandes</h2>
          <p className="text-slate-500 text-sm">Gérez et suivez toutes vos commandes en gros</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={18} />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par ID de commande ou articles..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <Filter size={16} />
              <span>Statut</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <Calendar size={16} />
              <span>Période</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ID Commande</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Articles</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_ORDERS.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-primary">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{order.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{order.items}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{order.amount.toLocaleString()} €</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'Delivered' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : order.status === 'Cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        order.status === 'Delivered' ? 'bg-emerald-600' : order.status === 'Cancelled' ? 'bg-red-600' : 'bg-blue-600'
                      }`}></span>
                      {order.status === 'Delivered' ? 'Livré' : order.status === 'Cancelled' ? 'Annulé' : 'En Transit'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-sm font-bold text-primary hover:underline underline-offset-4">Détails</button>
                      <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Affichage de 6 sur 48 commandes</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded-md text-sm disabled:opacity-50" disabled>Précédent</button>
            <button className="px-3 py-1 border border-slate-200 rounded-md text-sm hover:bg-slate-50">Suivant</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

import { Calendar } from 'lucide-react';
