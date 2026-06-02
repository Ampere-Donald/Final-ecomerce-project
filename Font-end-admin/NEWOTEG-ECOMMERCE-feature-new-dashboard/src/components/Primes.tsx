import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Trophy,
  TrendingUp,
  CheckCircle2,
  Banknote,
  ChevronDown,
} from 'lucide-react';
import { primeApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

interface Prime {
  id: string;
  rang: number;
  periode: string;
  nombreTickets: number;
  statut: 'EN_COURS' | 'VALIDEE' | 'PAYEE';
  vendeur: { id: string; nom: string; email?: string; role?: string };
}

const statutBadge: Record<Prime['statut'], { label: string; cls: string }> = {
  EN_COURS:  { label: 'En cours',  cls: 'bg-amber-100 text-amber-800' },
  VALIDEE:   { label: 'Validée',   cls: 'bg-blue-100 text-blue-800' },
  PAYEE:     { label: 'Payée',     cls: 'bg-emerald-100 text-emerald-800' },
};

const getRangMedal = (rang: number) => {
  if (rang === 1) return '🥇';
  if (rang === 2) return '🥈';
  if (rang === 3) return '🥉';
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

  // Générer les options de mois (12 derniers mois)
  const periodes = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Primes vendeurs</h1>
          <p className="text-sm text-slate-500">Classement mensuel par tickets validés</p>
        </div>

        {/* Sélecteur de période */}
        <div className="relative">
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 pr-8 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-primary"
          >
            {periodes.map((p) => (
              <option key={p} value={p}>
                {new Date(p + '-01').toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {/* Podium top 3 */}
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
              <p className="text-4xl">{getRangMedal(prime.rang)}</p>
              <p className="mt-2 font-bold text-slate-900">{prime.vendeur.nom}</p>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-2xl font-black text-primary">
                <TrendingUp size={20} />
                {prime.nombreTickets}
              </div>
              <p className="text-xs text-slate-500">tickets</p>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${statutBadge[prime.statut].cls}`}>
                {statutBadge[prime.statut].label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tableau complet */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          <p>Chargement du classement…</p>
        </div>
      ) : classement.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          <Award size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune prime pour cette période</p>
          <p className="mt-1 text-sm">Les primes sont créées automatiquement à chaque encaissement.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Rang</th>
                <th className="px-4 py-3 text-left">Vendeur</th>
                <th className="px-4 py-3 text-center">Tickets</th>
                <th className="px-4 py-3 text-center">Statut</th>
                {isSuper && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {classement.map((prime) => (
                <tr key={prime.id} className={`hover:bg-slate-50 transition-colors ${prime.rang <= 3 ? 'font-semibold' : ''}`}>
                  <td className="px-4 py-3 text-slate-700">{getRangMedal(prime.rang)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{prime.vendeur.nom}</p>
                    {prime.vendeur.email && (
                      <p className="text-xs text-slate-400">{prime.vendeur.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-primary">
                      <Trophy size={13} />
                      {prime.nombreTickets}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statutBadge[prime.statut].cls}`}>
                      {statutBadge[prime.statut].label}
                    </span>
                  </td>
                  {isSuper && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {prime.statut === 'EN_COURS' && (
                          <button
                            onClick={() => valider(prime.id)}
                            disabled={actioning === prime.id}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            <CheckCircle2 size={13} />
                            Valider
                          </button>
                        )}
                        {prime.statut === 'VALIDEE' && (
                          <button
                            onClick={() => payer(prime.id)}
                            disabled={actioning === prime.id}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <Banknote size={13} />
                            Marquer payée
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};
