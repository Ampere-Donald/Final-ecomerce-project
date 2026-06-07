import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Trophy,
  TrendingUp,
  Eye,
  FileText,
  CheckCircle2,
  Banknote,
  ChevronDown,
  X,
} from 'lucide-react';
import { primeApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

interface Prime {
  id: string;
  rang: number;
  periode: string;
  nombreTickets: number;
  montantTotal: number | string;
  champTickets?: boolean;
  champCA?: boolean;
  statut: 'EN_COURS' | 'VALIDEE' | 'PAYEE';
  vendeur: { id: string; nom: string; email?: string; role?: string };
}

interface TicketVendeur {
  id: string;
  numeroTicket?: string;
  numero?: string;
  montantTotal?: number | string;
  totalTTC?: number | string;
  encaisseAt?: string | null;
  facture?: {
    numero: string;
    dateEmission: string;
    totalTTC?: number | string;
    caissier?: { nom: string } | null;
  } | null;
}

const fmtFCFA = (n: number | string | undefined): string => {
  const v = Number(n) || 0;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} FCFA`;
};

const statutBadge: Record<Prime['statut'], { label: string; cls: string }> = {
  EN_COURS: { label: 'En cours', cls: 'bg-amber-100 text-amber-800' },
  VALIDEE: { label: 'Validee', cls: 'bg-blue-100 text-blue-800' },
  PAYEE: { label: 'Payee', cls: 'bg-emerald-100 text-emerald-800' },
};

const getRangLabel = (rang: number) => {
  if (rang === 1) return '1er';
  if (rang === 2) return '2e';
  if (rang === 3) return '3e';
  return `${rang}.`;
};

export const Primes = () => {
  const { admin } = useAdminAuth();
  const isSuper = admin?.role === 'SUPER_ADMIN';

  const now = new Date();
  const defaultPeriode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [periode, setPeriode] = useState(defaultPeriode);
  const [classement, setClassement] = useState<Prime[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailPrime, setDetailPrime] = useState<Prime | null>(null);
  const [detailTickets, setDetailTickets] = useState<TicketVendeur[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const charger = async () => {
    if (!periode) return;
    setLoading(true);
    setError(null);
    try {
      const data = await primeApi.classement(periode);
      setClassement(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger le classement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [periode]);

  const valider = async (id: string) => {
    setActioning(id);
    try {
      await primeApi.valider(id);
      await charger();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Erreur lors de la validation.');
    } finally {
      setActioning(null);
    }
  };

  const payer = async (id: string) => {
    setActioning(id);
    try {
      await primeApi.payer(id);
      await charger();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Erreur lors du paiement.');
    } finally {
      setActioning(null);
    }
  };

  const ouvrirDetail = async (prime: Prime) => {
    setDetailPrime(prime);
    setDetailTickets([]);
    setDetailLoading(true);
    try {
      const data = await primeApi.detailVendeur(prime.vendeur.id, periode);
      setDetailTickets(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger le detail vendeur.');
    } finally {
      setDetailLoading(false);
    }
  };

  const periodes = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Primes vendeurs</h1>
          <p className="text-sm text-slate-500">Classement mensuel par tickets encaisses et montant vendu</p>
        </div>
        <div className="relative">
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 pr-8 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-primary"
          >
            {periodes.map((p) => (
              <option key={p} value={p}>
                {new Date(p + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && classement.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {classement.slice(0, 3).map((prime) => (
            <div
              key={prime.id}
              className={`rounded-xl border p-5 text-center shadow-sm ${
                prime.rang === 1
                  ? 'border-yellow-300 bg-gradient-to-b from-yellow-50 to-amber-50'
                  : prime.rang === 2
                  ? 'border-slate-300 bg-gradient-to-b from-slate-50 to-white'
                  : 'border-orange-200 bg-gradient-to-b from-orange-50 to-white'
              }`}
            >
              <p className="text-2xl font-black text-slate-800">{getRangLabel(prime.rang)}</p>
              <p className="mt-2 font-bold text-slate-900">{prime.vendeur.nom}</p>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-2xl font-black text-primary">
                <TrendingUp size={20} />
                {prime.nombreTickets}
              </div>
              <p className="text-xs text-slate-500">tickets</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{fmtFCFA(prime.montantTotal)}</p>
              <div className="mt-2 flex justify-center gap-1.5">
                {prime.champTickets && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Top tickets</span>}
                {prime.champCA && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Top CA</span>}
              </div>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${statutBadge[prime.statut].cls}`}>
                {statutBadge[prime.statut].label}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">Chargement du classement...</div>
      ) : classement.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          <Award size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune prime pour cette periode</p>
          <p className="mt-1 text-sm">Les primes sont creees automatiquement a chaque encaissement.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Rang</th>
                <th className="px-4 py-3 text-left">Vendeur</th>
                <th className="px-4 py-3 text-center">Tickets</th>
                <th className="px-4 py-3 text-right">Montant vendu</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {classement.map((prime) => (
                <tr key={prime.id} className={`hover:bg-slate-50 transition-colors ${prime.rang <= 3 ? 'font-semibold' : ''}`}>
                  <td className="px-4 py-3 text-slate-700">{getRangLabel(prime.rang)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{prime.vendeur.nom}</p>
                    {prime.vendeur.email && <p className="text-xs text-slate-400">{prime.vendeur.email}</p>}
                    <div className="mt-1 flex gap-1.5">
                      {prime.champTickets && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Top tickets</span>}
                      {prime.champCA && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Top CA</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-primary">
                      <Trophy size={13} />
                      {prime.nombreTickets}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtFCFA(prime.montantTotal)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statutBadge[prime.statut].cls}`}>{statutBadge[prime.statut].label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => ouvrirDetail(prime)}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                      >
                        <Eye size={13} />
                        Detail
                      </button>
                      {isSuper && prime.statut === 'EN_COURS' && (
                        <button
                          onClick={() => valider(prime.id)}
                          disabled={actioning === prime.id}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} />
                          Valider
                        </button>
                      )}
                      {isSuper && prime.statut === 'VALIDEE' && (
                        <button
                          onClick={() => payer(prime.id)}
                          disabled={actioning === prime.id}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Banknote size={13} />
                          Marquer payee
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailPrime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{detailPrime.vendeur.nom}</h2>
                <p className="text-sm text-slate-500">{detailPrime.nombreTickets} tickets - {fmtFCFA(detailPrime.montantTotal)}</p>
              </div>
              <button onClick={() => setDetailPrime(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-5">
              {detailLoading ? (
                <p className="py-8 text-center text-sm text-slate-400">Chargement...</p>
              ) : detailTickets.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  <FileText size={28} className="mx-auto mb-2 opacity-30" />
                  Aucun encaissement pour cette periode.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 text-left">Ticket</th>
                      <th className="py-2 text-left">Date</th>
                      <th className="py-2 text-left">Caissier</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="py-2 font-mono text-xs font-bold text-slate-800">{ticket.numeroTicket || ticket.numero}</td>
                        <td className="py-2 text-slate-500">{ticket.encaisseAt ? new Date(ticket.encaisseAt).toLocaleString('fr-FR') : '-'}</td>
                        <td className="py-2 text-slate-600">{ticket.facture?.caissier?.nom ?? '-'}</td>
                        <td className="py-2 text-right font-bold text-primary">{fmtFCFA(ticket.facture?.totalTTC ?? ticket.totalTTC ?? ticket.montantTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
