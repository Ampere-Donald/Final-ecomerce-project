import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
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

const statutMeta = (_statut: Ticket['statut']) => {
  // Seul ENCAISSE est affiché ici
  return { label: 'Encaissé', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 };
};


const TicketCard = ({ ticket }: { ticket: Ticket }) => {
  const meta = statutMeta(ticket.statut);
  const Icon = meta.icon;

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

      {ticket.encaisseAt && (
        <p className="mt-3 text-xs text-slate-400">
          Encaissé le {new Date(ticket.encaisseAt).toLocaleString('fr-FR')}
        </p>
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
      // Uniquement les tickets finalisés — les EN_ATTENTE sont dans "Vente en cours"
      setTickets((data || []).filter((t: Ticket) => t.statut === 'ENCAISSE'));
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
            Vos ventes encaissées — {tickets.length} au total.
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
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </motion.div>
  );
};
