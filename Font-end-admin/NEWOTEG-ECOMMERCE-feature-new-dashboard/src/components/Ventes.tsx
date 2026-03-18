import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Filter, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { venteApi } from '../services/api';

export const Ventes = () => {
  const [ventes, setVentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVentes = async () => {
    try {
      const data = await venteApi.getAll();
      setVentes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentes();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des Ventes</h1>
          <p className="text-sm text-slate-500 mt-1">Consultez toutes les ventes et encaissements réalisés.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} />
          <span>Nouvelle Vente</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex gap-2">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500">
                <Filter size={18} />
            </button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500">
                <Download size={18} />
            </button>
            </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher une vente ID..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ID Vente</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Paiement</th>
                <th className="px-6 py-4">Montant Total</th>
                <th className="px-6 py-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement...</td>
                </tr>
              ) : ventes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucune vente trouvée.</td>
                </tr>
              ) : (
                ventes.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-primary font-bold">{v.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(v.dateVente).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'Client Anonyme'}</td>
                    <td className="px-6 py-4 text-xs font-semibold uppercase">{v.methodePaiement}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{v.montantTotal} €</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        v.statutPaiement === 'PAYE' ? 'bg-emerald-100 text-emerald-800' : 
                        v.statutPaiement === 'PARTIEL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {v.statutPaiement}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
