import React from 'react';
import { motion } from 'motion/react';
import { FileText, Download, CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const MOCK_INVOICES = [
  { id: 'INV-2024-001', date: '28 Juil 2024', dueDate: '15 Aoû 2024', amount: 12400, status: 'Pending' },
  { id: 'INV-2024-002', date: '12 Juil 2024', dueDate: '30 Juil 2024', amount: 3150, status: 'Paid' },
  { id: 'INV-2024-003', date: '30 Juin 2024', dueDate: '15 Juil 2024', amount: 8900, status: 'Paid' },
  { id: 'INV-2024-004', date: '15 Juin 2024', dueDate: '30 Juin 2024', amount: 4200, status: 'Overdue' },
];

export const Invoices = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Facturation & Paiements</h2>
          <p className="text-slate-500 text-sm">Consultez votre historique de facturation et gérez vos paiements</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm shadow-primary/20">
          <CreditCard size={18} />
          <span>Régler le solde impayé</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Impayé</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">16 600,00 FCFA</p>
          <div className="flex items-center gap-1 text-xs text-amber-600 mt-2 font-medium">
            <AlertCircle size={14} />
            <span>1 facture en retard</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Dernier Paiement</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">3 150,00 FCFA</p>
          <p className="text-xs text-slate-400 mt-2">Payé le 25 Juil 2024</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Prochaine Échéance</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">15 Aoû 2024</p>
          <p className="text-xs text-primary font-medium mt-2">Dans 10 jours</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-900">Historique de Facturation</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ID Facture</th>
                <th className="px-6 py-4">Date d'émission</th>
                <th className="px-6 py-4">Date d'échéance</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_INVOICES.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                        <FileText size={18} />
                      </div>
                      <span className="font-medium text-slate-900">{invoice.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{invoice.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{invoice.dueDate}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{invoice.amount.toLocaleString()} FCFA</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'Paid' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : invoice.status === 'Overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {invoice.status === 'Paid' ? <CheckCircle2 size={12} /> : invoice.status === 'Overdue' ? <AlertCircle size={12} /> : <Clock size={12} />}
                      {invoice.status === 'Paid' ? 'Payée' : invoice.status === 'Overdue' ? 'En retard' : 'En attente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline underline-offset-4 ml-auto">
                      <Download size={16} />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
