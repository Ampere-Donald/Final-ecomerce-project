import React, { useEffect, useState } from 'react';
import { Search, Mail, Phone, Users, X, MapPin, ShieldCheck, ShieldOff, ShoppingBag, Calendar, Eye, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clientApi } from '../services/api';
import { ClientCreditPanel } from './ClientCreditPanel';

/* ── Status badge colors ──────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  EN_ATTENTE:   { label: 'En attente',   bg: 'bg-amber-100',   text: 'text-amber-800' },
  CONFIRMEE:    { label: 'Confirmée',    bg: 'bg-blue-100',    text: 'text-blue-800' },
  EN_LIVRAISON: { label: 'En livraison', bg: 'bg-indigo-100',  text: 'text-indigo-800' },
  LIVREE:       { label: 'Livrée',       bg: 'bg-emerald-100', text: 'text-emerald-800' },
  ANNULEE:      { label: 'Annulée',      bg: 'bg-red-100',     text: 'text-red-800' },
};

export const Clients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchClients = async () => {
    try {
      const data = await clientApi.getAll();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const openDetails = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await clientApi.getOne(id);
      setSelectedClient(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = clients.filter(c =>
    `${c.nom} ${c.prenom || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.telephone || '').includes(search) ||
    (c.niu || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.rccm || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'NIU', 'RCCM', 'Type', 'Email vérifié', 'Commandes', 'Inscrit le'];
    const rows = filtered.map(c => [
      `"${c.nom || ''}"`, `"${c.prenom || ''}"`, `"${c.email || ''}"`, `"${c.telephone || ''}"`,
      `"${c.niu || ''}"`, `"${c.rccm || ''}"`,
      c.typeClient === 'PROFESSIONNEL' ? 'Pro' : 'Particulier',
      c.emailVerifie ? 'Oui' : 'Non',
      c._count?.commandes ?? 0,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR') : '',
    ]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Base Clients</h1>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? 'Chargement...' : `${clients.length} client${clients.length !== 1 ? 's' : ''} enregistré${clients.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher par nom, email ou téléphone..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <button onClick={handleExportCSV} disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
            <Download size={18} /><span>Exporter CSV</span>
          </button>
        </div>
        {/* ── Table (desktop) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Email vérifié</th>
                <th className="px-6 py-4">Commandes</th>
                <th className="px-6 py-4">Inscrit le</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center">
                  <Users size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun client trouvé.</p>
                </td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {c.nom?.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-slate-900">{c.nom} {c.prenom || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {c.telephone && <div className="flex items-center gap-1.5 text-sm text-slate-600"><Phone size={14} /> {c.telephone}</div>}
                      {c.email && <div className="flex items-center gap-1.5 text-sm text-slate-600"><Mail size={14} /> {c.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${c.typeClient === 'PROFESSIONNEL' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {c.typeClient === 'PROFESSIONNEL' ? 'Pro' : 'Particulier'}
                      </span>
                      {(c.niu || c.rccm) && (
                        <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                          {c.niu && <p>NIU: {c.niu}</p>}
                          {c.rccm && <p>RCCM: {c.rccm}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {c.emailVerifie
                        ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><ShieldCheck size={14} /> Vérifié</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500"><ShieldOff size={14} /> Non vérifié</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{c._count?.commandes ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openDetails(c.id)} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline underline-offset-4">
                        <Eye size={14} /> Voir détails
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Cards (mobile) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun client trouvé.</p>
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="p-4 flex items-start gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {c.nom?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900 text-sm">{c.nom} {c.prenom || ''}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${c.typeClient === 'PROFESSIONNEL' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {c.typeClient === 'PROFESSIONNEL' ? 'Pro' : 'Part.'}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {c.telephone && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={11} />{c.telephone}</p>}
                    {c.email && <p className="flex items-center gap-1.5 text-xs text-slate-500 truncate"><Mail size={11} />{c.email}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-2">
                      {c.emailVerifie
                        ? <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600"><ShieldCheck size={11} />Vérifié</span>
                        : <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500"><ShieldOff size={11} />Non vérifié</span>
                      }
                      <span className="text-[10px] text-slate-400">{c._count?.commandes ?? 0} commande{(c._count?.commandes ?? 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <button onClick={() => openDetails(c.id)} className="text-xs font-bold text-primary hover:underline">
                      Voir →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ Client Details Drawer ════════════════════════════════ */}
      <AnimatePresence>
        {selectedClient !== null && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedClient(null)}
            />
            <motion.aside
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
            >
              {detailLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400">Chargement...</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">Détails Client</h2>
                    <button onClick={() => setSelectedClient(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Profile */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                        {selectedClient.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">{selectedClient.nom} {selectedClient.prenom || ''}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${selectedClient.typeClient === 'PROFESSIONNEL' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {selectedClient.typeClient === 'PROFESSIONNEL' ? 'Professionnel' : 'Particulier'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedClient.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail size={16} className="text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700">{selectedClient.email}</span>
                          {selectedClient.emailVerifie
                            ? <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Vérifié</span>
                            : <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Non vérifié</span>
                          }
                        </div>
                      )}
                      {selectedClient.telephone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone size={16} className="text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700">{selectedClient.telephone}</span>
                        </div>
                      )}
                      {selectedClient.adresse && (
                        <div className="flex items-center gap-3 text-sm">
                          <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700">{selectedClient.adresse}</span>
                        </div>
                      )}
                      {selectedClient.niu && (
                        <div className="flex items-center gap-3 text-sm">
                          <ShoppingBag size={16} className="text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700">NIU: {selectedClient.niu}</span>
                        </div>
                      )}
                      {selectedClient.rccm && (
                        <div className="flex items-center gap-3 text-sm">
                          <ShoppingBag size={16} className="text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700">RCCM: {selectedClient.rccm}</span>
                        </div>
                      )}
                      {selectedClient.createdAt && (
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar size={16} className="text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700">Inscrit le {new Date(selectedClient.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-indigo-50 rounded-xl p-4 text-center">
                        <ShoppingBag size={18} className="mx-auto text-indigo-500 mb-1" />
                        <p className="text-xl font-bold text-indigo-700">{selectedClient._count?.commandes ?? 0}</p>
                        <p className="text-[11px] font-semibold text-indigo-500">Commandes</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 text-center">
                        <ShoppingBag size={18} className="mx-auto text-emerald-500 mb-1" />
                        <p className="text-xl font-bold text-emerald-700">{selectedClient._count?.ventes ?? 0}</p>
                        <p className="text-[11px] font-semibold text-emerald-500">Ventes</p>
                      </div>
                    </div>
                  </div>

                  {/* Crédit client */}
                  <div className="p-6 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Crédit</p>
                    <ClientCreditPanel clientId={selectedClient.id} />
                  </div>

                  {/* Recent Orders */}
                  <div className="p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Commandes récentes</p>
                    {(!selectedClient.commandes || selectedClient.commandes.length === 0) ? (
                      <p className="text-sm text-slate-400 italic">Aucune commande</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedClient.commandes.map((order: any) => {
                          const st = STATUS_CFG[order.statut] ?? { label: order.statut, bg: 'bg-slate-100', text: 'text-slate-600' };
                          return (
                            <div key={order.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
                              <div>
                                <p className="text-sm font-mono font-semibold text-primary">{order.numeroSuivi}</p>
                                <p className="text-[11px] text-slate-400">{new Date(order.dateCommande).toLocaleDateString('fr-FR')}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-900">{parseFloat(String(order.montantTotal)).toLocaleString()} FCFA</span>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
