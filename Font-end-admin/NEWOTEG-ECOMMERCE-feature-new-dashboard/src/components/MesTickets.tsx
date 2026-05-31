import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { ticketApi } from '../services/api';

interface LigneTicket {
  id: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: string | number;
  sousTotal: string | number;
}

interface Ticket {
  id: string;
  numeroTicket: string;
  nomClient?: string | null;
  telephoneClient?: string | null;
  montantTotal: string | number;
  statut: 'EN_ATTENTE' | 'ENCAISSE' | 'EXPIRE' | 'ANNULE';
  createdAt: string;
  expiresAt: string;
  encaisseAt?: string | null;
  annuleAt?: string | null;
  lignes: LigneTicket[];
}

const fmtFCFA = (n: number | string): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(v || 0)
    .replace(/ |\s/g, ' ') + ' FCFA';
};

const statutMeta = (statut: Ticket['statut']) => {
  switch (statut) {
    case 'EN_ATTENTE':
      return { label: 'En attente', color: 'bg-amber-100 text-amber-800', icon: Clock };
    case 'ENCAISSE':
      return { label: 'Encaissé', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 };
    case 'EXPIRE':
      return { label: 'Expiré', color: 'bg-slate-100 text-slate-600', icon: XCircle };
    case 'ANNULE':
      return { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: X };
  }
};

/** Compte à rebours mm:ss jusqu'à expiresAt. Devient rouge sous 3 min. */
const useCountdown = (expiresAt: string, actif: boolean) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!actif) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [actif]);
  if (!actif) return null;
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return { label: 'Expiré', urgent: true };
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return {
    label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    urgent: diff < 3 * 60 * 1000,
  };
};

const TicketCard = ({
  ticket,
  onAnnuler,
}: {
  ticket: Ticket;
  onAnnuler: (id: string) => void;
}) => {
  const meta = statutMeta(ticket.statut);
  const Icon = meta.icon;
  const countdown = useCountdown(ticket.expiresAt, ticket.statut === 'EN_ATTENTE');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-mono text-sm font-bold text-slate-900">
            {ticket.numeroTicket}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(ticket.createdAt).toLocaleString('fr-FR')}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}
        >
          <Icon size={12} />
          {meta.label}
        </span>
      </div>

      {ticket.nomClient && (
        <p className="text-sm text-slate-700 mb-2">
          Client : <span className="font-medium">{ticket.nomClient}</span>
          {ticket.telephoneClient ? ` — ${ticket.telephoneClient}` : ''}
        </p>
      )}

      <ul className="text-sm space-y-1 mb-3">
        {ticket.lignes.map((l) => (
          <li key={l.id} className="flex justify-between text-slate-600">
            <span className="truncate pr-2">
              {l.quantite}× {l.nomProduit}
            </span>
            <span className="text-slate-900 font-medium whitespace-nowrap">
              {fmtFCFA(l.sousTotal)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-sm text-slate-500">Total</span>
        <span className="text-lg font-bold text-primary">
          {fmtFCFA(ticket.montantTotal)}
        </span>
      </div>

      {ticket.statut === 'EN_ATTENTE' && countdown && (
        <div
          className={`mt-3 flex items-center justify-between text-xs font-semibold ${
            countdown.urgent ? 'text-red-600' : 'text-amber-600'
          }`}
        >
          <span className="flex items-center gap-1">
            <Clock size={14} />
            Expire dans {countdown.label}
          </span>
          <button
            onClick={() => onAnnuler(ticket.id)}
            className="text-red-500 hover:text-red-700 underline underline-offset-4"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
};

export const MesTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const charger = async () => {
    setError(null);
    try {
      const data = await ticketApi.mesTickets();
      setTickets(data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
    const id = setInterval(charger, 15000);
    return () => clearInterval(id);
  }, []);

  const handleAnnuler = async (id: string) => {
    if (!confirm('Annuler ce ticket ?')) return;
    try {
      await ticketApi.annuler(id);
      await charger();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Impossible d\'annuler');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mes tickets</h2>
          <p className="text-slate-500 text-sm">
            Tickets que vous avez créés (50 plus récents).
          </p>
        </div>
        <button
          onClick={charger}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary border border-slate-200 rounded-lg"
        >
          <RefreshCw size={14} />
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-12">Chargement…</div>
      ) : tickets.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <Receipt size={40} className="mx-auto mb-3 opacity-40" />
          <p>Aucun ticket pour l'instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} onAnnuler={handleAnnuler} />
          ))}
        </div>
      )}
    </motion.div>
  );
};
