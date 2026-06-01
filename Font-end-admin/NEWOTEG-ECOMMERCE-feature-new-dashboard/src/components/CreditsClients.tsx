import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Wallet, X, Eye, Phone, AlertCircle } from 'lucide-react';
import { clientApi } from '../services/api';
import { ClientCreditPanel } from './ClientCreditPanel';
import { useToast, errorMessage } from './ui/Toast';

const fmtFCFA = (n: number | string): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return (
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
      .format(v || 0)
      .replace(/\s/g, ' ') + ' FCFA'
  );
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const CreditsClients = () => {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const charger = async () => {
    try {
      const data = await clientApi.getCredits();
      setRows(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const c = r.client || {};
      return (
        `${c.nom || ''} ${c.prenom || ''}`.toLowerCase().includes(q) ||
        (c.telephone || '').includes(q)
      );
    });
  }, [rows, search]);

  const totalGlobal = useMemo(
    () => rows.reduce((acc, r) => acc + (r.totalDu || 0), 0),
    [rows],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Crédits clients</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Chargement…' : `${rows.length} client${rows.length !== 1 ? 's' : ''} avec un encours`}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2">
          <Wallet size={20} className="text-primary" />
          <div>
            <p className="text-xs text-slate-500">Total dû</p>
            <p className="text-lg font-bold text-red-600">{fmtFCFA(totalGlobal)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom ou téléphone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4 text-right">Total dû</th>
                <th className="px-6 py-4 text-center">Articles</th>
                <th className="px-6 py-4">Depuis</th>
                <th className="px-6 py-4">Dernier règlement</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <Wallet size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun encours. Tout est soldé 🎉</p>
                </td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.client?.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {r.client?.nom?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{r.client?.nom} {r.client?.prenom || ''}</p>
                          {r.client?.telephone && (
                            <p className="flex items-center gap-1 text-xs text-slate-500"><Phone size={11} />{r.client.telephone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-600">{fmtFCFA(r.totalDu)}</td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">{r.nbArticles}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{fmtDate(r.depuis)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{fmtDate(r.dernierReglement)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelected(r.client)} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline underline-offset-4">
                        <Eye size={14} /> Gérer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-slate-500">Chargement…</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun encours.</p>
            </div>
          ) : (
            filtered.map((r) => (
              <button key={r.client?.id} onClick={() => setSelected(r.client)} className="w-full text-left p-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {r.client?.nom?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{r.client?.nom} {r.client?.prenom || ''}</p>
                  <p className="text-xs text-slate-400">{r.nbArticles} article{r.nbArticles !== 1 ? 's' : ''} · depuis {fmtDate(r.depuis)}</p>
                </div>
                <span className="font-bold text-red-600 text-sm shrink-0">{fmtFCFA(r.totalDu)}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-400">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <span>Les règlements s’enregistrent depuis la fiche d’un client (caisse du jour ouverte requise).</span>
      </div>

      {/* Drawer crédit client */}
      <AnimatePresence>
        {selected && (
          <>
            <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.aside
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.nom} {selected.prenom || ''}</h2>
                  {selected.telephone && <p className="text-sm text-slate-500">{selected.telephone}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <ClientCreditPanel clientId={selected.id} onChanged={charger} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
