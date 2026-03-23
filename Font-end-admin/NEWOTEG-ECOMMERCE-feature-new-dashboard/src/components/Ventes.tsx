import React, { useEffect, useState, useMemo } from 'react';
import { Search, Filter, Download, ShoppingCart, X, Eye, Package, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { venteApi } from '../services/api';

export const Ventes = () => {
  const [ventes, setVentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVente, setSelectedVente] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  useEffect(() => { fetchVentes(); }, []);

  const filtered = useMemo(() => {
    let result = ventes;
    // Date filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(v => new Date(v.dateVente) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(v => new Date(v.dateVente) <= to);
    }
    // Text search
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(v => {
        const clientName = v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'anonyme';
        const produits = (v.lignesVente || []).map((l: any) => l.produit?.nomProduit || '').join(' ');
        return clientName.toLowerCase().includes(term)
          || v.id.toLowerCase().includes(term)
          || v.methodePaiement?.toLowerCase().includes(term)
          || v.statutPaiement?.toLowerCase().includes(term)
          || produits.toLowerCase().includes(term);
      });
    }
    return result;
  }, [ventes, search, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['ID', 'Date', 'Client', 'Produits', 'Méthode Paiement', 'Montant Total', 'Statut'];
    const rows = filtered.map(v => [
      v.id.substring(0, 8),
      new Date(v.dateVente).toLocaleDateString('fr-FR'),
      `"${v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'Client Anonyme'}"`,
      `"${(v.lignesVente || []).map((l: any) => `${l.produit?.nomProduit || 'Produit'} x${l.quantite}`).join(', ')}"`,
      v.methodePaiement,
      v.montantTotal,
      v.statutPaiement,
    ]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatProduits = (lignes: any[]) => {
    if (!lignes || lignes.length === 0) return '—';
    return lignes.map((l: any) => `${l.produit?.nomProduit || 'Produit'} x${l.quantite}`).join(', ');
  };

  const formatProduitsShort = (lignes: any[]) => {
    if (!lignes || lignes.length === 0) return '—';
    const first = lignes[0];
    const txt = `${first.produit?.nomProduit || 'Produit'} x${first.quantite}`;
    if (lignes.length === 1) return txt;
    return `${txt} +${lignes.length - 1} autre${lignes.length > 2 ? 's' : ''}`;
  };

  const statutBadge = (statut: string) => {
    const cls = statut === 'PAYE' ? 'bg-emerald-100 text-emerald-800' :
      statut === 'PARTIEL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{statut}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des Ventes</h1>
          <p className="text-sm text-slate-500 mt-1">Les ventes sont créées automatiquement à la confirmation de réception des commandes.</p>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedVente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Détail Vente #{selectedVente.id.substring(0, 8)}</h2>
                <button onClick={() => setSelectedVente(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Client</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedVente.client ? `${selectedVente.client.nom} ${selectedVente.client.prenom || ''}` : 'Client Anonyme'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Date</p>
                    <p className="font-bold text-slate-900 text-sm">{new Date(selectedVente.dateVente).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Paiement</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedVente.methodePaiement}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Statut</p>
                    {statutBadge(selectedVente.statutPaiement)}
                  </div>
                </div>

                {/* Lignes de vente */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Package size={16} />
                    Produits vendus
                  </h3>
                  {(!selectedVente.lignesVente || selectedVente.lignesVente.length === 0) ? (
                    <p className="text-sm text-slate-500">Aucune ligne de vente.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <th className="px-4 py-3">Produit</th>
                            <th className="px-4 py-3 text-center">Qté</th>
                            <th className="px-4 py-3 text-right">Prix Unit.</th>
                            <th className="px-4 py-3 text-right">Sous-total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedVente.lignesVente.map((l: any, i: number) => (
                            <tr key={l.id || i}>
                              <td className="px-4 py-3 font-medium text-slate-900 text-sm">{l.produit?.nomProduit || 'Produit'}</td>
                              <td className="px-4 py-3 text-center text-sm">{l.quantite}</td>
                              <td className="px-4 py-3 text-right text-sm">{Number(l.prixUnitaire).toLocaleString()} FCFA</td>
                              <td className="px-4 py-3 text-right font-bold text-sm">{Number(l.sousTotal).toLocaleString()} FCFA</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50">
                            <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-900">Total</td>
                            <td className="px-4 py-3 text-right font-bold text-primary text-lg">{Number(selectedVente.montantTotal).toLocaleString()} FCFA</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par client, produit, statut..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <button onClick={handleExportCSV} disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              <Download size={18} /><span>Exporter CSV</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            <span className="text-sm text-slate-400">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Réinitialiser</button>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ID Vente</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Produits</th>
                <th className="px-6 py-4">Paiement</th>
                <th className="px-6 py-4">Montant Total</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center">
                  <ShoppingCart size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucune vente trouvée.</p>
                </td></tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-primary font-bold text-sm">{v.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(v.dateVente).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'Client Anonyme'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate" title={formatProduits(v.lignesVente)}>
                      {formatProduitsShort(v.lignesVente)}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold uppercase">{v.methodePaiement}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{Number(v.montantTotal).toLocaleString()} FCFA</td>
                    <td className="px-6 py-4">{statutBadge(v.statutPaiement)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelectedVente(v)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Voir détails">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingCart size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucune vente trouvée.</p>
            </div>
          ) : (
            filtered.map((v) => (
              <div key={v.id} className="p-4 space-y-2" onClick={() => setSelectedVente(v)}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary text-sm">{v.id.substring(0, 8)}</span>
                  {statutBadge(v.statutPaiement)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{v.client ? `${v.client.nom} ${v.client.prenom || ''}` : 'Client Anonyme'}</span>
                  <span className="font-bold text-slate-900">{Number(v.montantTotal).toLocaleString()} FCFA</span>
                </div>
                {/* Produits */}
                <p className="text-xs text-slate-500 truncate">
                  <Package size={12} className="inline mr-1" />
                  {formatProduitsShort(v.lignesVente)}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{new Date(v.dateVente).toLocaleDateString()}</span>
                  <span>·</span>
                  <span className="uppercase font-semibold">{v.methodePaiement}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
