import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Download, ExternalLink, Calendar, X, Truck, MapPin, Phone, User, Package } from 'lucide-react';
import { Commande, StatutCommande, ModeReception } from '../types';
import { commandeApi } from '../services/api';

// ── Status helpers ────────────────────────────────────────
const STATUS_CONFIG: Record<StatutCommande, { label: string; bg: string; text: string; dot: string }> = {
  EN_ATTENTE: { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-600' },
  CONFIRMEE: { label: 'Confirmée', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-600' },
  EN_LIVRAISON: { label: 'En livraison', bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-600' },
  LIVREE: { label: 'Livrée', bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  ANNULEE: { label: 'Annulée', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-600' },
};

const MODE_LABELS: Record<ModeReception, { label: string; icon: typeof Truck }> = {
  LIVRAISON: { label: 'Livraison', icon: Truck },
  RETRAIT_MAGASIN: { label: 'Retrait', icon: MapPin },
};

const ALL_STATUSES: StatutCommande[] = ['EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE'];

// Admin can only set these statuses.
const ADMIN_STATUSES: StatutCommande[] = ['EN_ATTENTE', 'EN_LIVRAISON'];

export const Orders = () => {
  const [orders, setOrders] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Commande | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchOrders = async () => {
    try {
      const data = await commandeApi.getAll();
      setOrders(data);
    } catch (err) {
      console.error('Erreur chargement commandes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // ── Status change ─────────────────────────────────────
  const handleStatusChange = async (orderId: string, newStatus: StatutCommande) => {
    setUpdatingId(orderId);
    try {
      const updated = await commandeApi.update(orderId, { statut: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
    } catch (err) {
      console.error('Erreur mise à jour statut', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Filtering ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = orders;
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      result = result.filter(o => new Date(o.dateCommande) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      result = result.filter(o => new Date(o.dateCommande) <= to);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.numeroSuivi.toLowerCase().includes(q)
        || o.nomClient.toLowerCase().includes(q)
        || o.lignes.some(l => l.nomProduit.toLowerCase().includes(q))
      );
    }
    return result;
  }, [orders, searchQuery, dateFrom, dateTo]);

  // ── Line items summary ────────────────────────────────
  const itemsSummary = (o: Commande) => {
    if (o.lignes.length === 0) return 'Aucun article';
    const first = o.lignes[0];
    const rest = o.lignes.length - 1;
    return `${first.quantite}x ${first.nomProduit}${rest > 0 ? ` +${rest}` : ''}`;
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;

    const headers = ['N° Suivi', 'Date', 'Client', 'Telephone', 'Articles', 'Montant', 'Mode', 'Statut'];
    const rows = filtered.map(o => [
      o.numeroSuivi,
      new Date(o.dateCommande).toLocaleDateString('fr-FR'),
      `"${o.nomClient}"`,
      `"${o.telephone}"`,
      `"${itemsSummary(o)}"`,
      o.montantTotal,
      MODE_LABELS[o.modeReception].label,
      STATUS_CONFIG[o.statut].label,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `commandes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Commandes E-commerce</h2>
          <p className="text-slate-500 text-sm">Gérez et suivez toutes les commandes clients</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par n° suivi, client ou article..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
            />
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

        {/* ── Table (desktop) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">N° Suivi</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Articles</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Aucune commande trouvée.</td></tr>
              ) : (
                filtered.map(order => {
                  const st = STATUS_CONFIG[order.statut];
                  const mode = MODE_LABELS[order.modeReception];
                  const ModeIcon = mode.icon;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-primary font-mono text-sm">{order.numeroSuivi}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(order.dateCommande).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{order.nomClient}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 max-w-[200px] truncate">{itemsSummary(order)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{parseFloat(String(order.montantTotal)).toLocaleString()} FCFA</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                          <ModeIcon size={14} />
                          {mode.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={order.statut}
                          onChange={e => handleStatusChange(order.id, e.target.value as StatutCommande)}
                          disabled={updatingId === order.id || order.statut === 'CONFIRMEE' || order.statut === 'ANNULEE'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${st.bg} ${st.text} outline-none ${order.statut === 'CONFIRMEE' || order.statut === 'ANNULEE' ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                          {['CONFIRMEE', 'ANNULEE'].includes(order.statut) && (
                            <option value={order.statut}>{STATUS_CONFIG[order.statut].label}</option>
                          )}
                          {!['CONFIRMEE', 'ANNULEE'].includes(order.statut) && ADMIN_STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedOrder(order)} className="text-sm font-bold text-primary hover:underline underline-offset-4">
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Cards (mobile) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="px-4 py-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-slate-500">Aucune commande trouvée.</p>
          ) : (
            filtered.map(order => {
              const st = STATUS_CONFIG[order.statut];
              const mode = MODE_LABELS[order.modeReception];
              const ModeIcon = mode.icon;
              return (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary text-sm">{order.numeroSuivi}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{order.nomClient}</span>
                    <span className="font-bold text-slate-900">{parseFloat(String(order.montantTotal)).toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {new Date(order.dateCommande).toLocaleDateString('fr-FR')} ·{' '}
                      <span className="inline-flex items-center gap-0.5"><ModeIcon size={12} /> {mode.label}</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <select
                        value={order.statut}
                        onChange={e => handleStatusChange(order.id, e.target.value as StatutCommande)}
                        disabled={updatingId === order.id || order.statut === 'CONFIRMEE' || order.statut === 'ANNULEE'}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${st.bg} ${st.text} outline-none`}
                      >
                        {['CONFIRMEE', 'ANNULEE'].includes(order.statut) && (
                          <option value={order.statut}>{STATUS_CONFIG[order.statut].label}</option>
                        )}
                        {!['CONFIRMEE', 'ANNULEE'].includes(order.statut) && ADMIN_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                      <button onClick={() => setSelectedOrder(order)} className="text-xs font-bold text-primary hover:underline">
                        Détails →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            {filtered.length} commande{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Order Detail Modal ─────────────────────────────── */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Détails de la commande</h3>
                  <p className="text-sm text-primary font-mono">{selectedOrder.numeroSuivi}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Mode */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Statut</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedOrder.statut].bg} ${STATUS_CONFIG[selectedOrder.statut].text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selectedOrder.statut].dot}`}></span>
                      {STATUS_CONFIG[selectedOrder.statut].label}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Mode de réception</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      {selectedOrder.modeReception === 'LIVRAISON' ? <Truck size={16} /> : <MapPin size={16} />}
                      {MODE_LABELS[selectedOrder.modeReception].label}
                    </span>
                  </div>
                </div>

                {/* Customer info */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <p className="text-xs text-slate-400 font-bold uppercase">Informations client</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User size={14} className="text-slate-400" />
                      <span className="font-medium">{selectedOrder.nomClient}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-slate-400" />
                      <span>{selectedOrder.telephone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm sm:col-span-2">
                      <MapPin size={14} className="text-slate-400 mt-0.5" />
                      <span>{selectedOrder.adresseLivraison}</span>
                    </div>
                  </div>
                </div>

                {/* Order date */}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar size={14} />
                  <span>Commandé le {new Date(selectedOrder.dateCommande).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>

                {/* Line items table */}
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-3">Articles commandés</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                          <th className="px-4 py-3">Produit</th>
                          <th className="px-4 py-3 text-center">Qté</th>
                          <th className="px-4 py-3 text-right">Prix Unit.</th>
                          <th className="px-4 py-3 text-right">Sous-total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.lignes.map(ligne => (
                          <tr key={ligne.id}>
                            <td className="px-4 py-3 text-sm font-medium text-slate-700">{ligne.nomProduit}</td>
                            <td className="px-4 py-3 text-sm text-center text-slate-600">{ligne.quantite}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-600">{parseFloat(String(ligne.prixUnitaire)).toLocaleString()} FCFA</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">{parseFloat(String(ligne.sousTotal)).toLocaleString()} FCFA</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-end">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-6 py-4 text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold">Montant total</p>
                    <p className="text-2xl font-bold text-primary mt-1">{parseFloat(String(selectedOrder.montantTotal)).toLocaleString()} FCFA</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
