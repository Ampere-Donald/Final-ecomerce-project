import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ListChecks,
  Clock,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  X,
  Banknote,
  Smartphone,
  Building2,
  Wallet,
  HandCoins,
  Search,
  UserCheck,
} from 'lucide-react';
import { bonVenteApi, caisseJourApi, clientApi } from '../services/api';
import { subscribeAuthenticatedSse } from '../services/authenticatedSse';
import { useToast, errorMessage } from './ui/Toast';

type Methode = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'MOBILE_MONEY' | 'CREDIT';

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
  vendeurId: string;
  nomClient?: string | null;
  telephoneClient?: string | null;
  montantTotal: string | number;
  createdAt: string;
  expiresAt: string;
  lignes: LigneTicket[];
}

const fmtFCFA = (n: number | string): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(v || 0)
    .replace(/ |\s/g, ' ') + ' FCFA';
};

const methodes: { value: Methode; label: string; icon: any }[] = [
  { value: 'ESPECES', label: 'Espèces', icon: Banknote },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { value: 'CARTE', label: 'Carte bancaire', icon: CreditCard },
  { value: 'VIREMENT', label: 'Virement', icon: Building2 },
  { value: 'CREDIT', label: 'Crédit (à payer)', icon: HandCoins },
];

const useCountdown = (expiresAt: string) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return { label: 'Expiré', urgent: true };
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return {
    label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    urgent: diff < 3 * 60 * 1000,
  };
};

const TicketRow = ({
  ticket,
  onSelect,
}: {
  ticket: Ticket;
  onSelect: () => void;
}) => {
  const c = useCountdown(ticket.expiresAt);
  const totalUnits = ticket.lignes.reduce((sum, ligne) => sum + ligne.quantite, 0);
  return (
    <button
      onClick={onSelect}
      className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-sm font-bold text-slate-900">
          {ticket.numeroTicket}
        </p>
        <span
          className={`flex items-center gap-1 text-xs font-semibold ${
            c.urgent ? 'text-red-600' : 'text-amber-600'
          }`}
        >
          <Clock size={12} />
          {c.label}
        </span>
      </div>
      {ticket.nomClient && (
        <p className="text-xs text-slate-500 mb-2 truncate">
          Client : {ticket.nomClient}
        </p>
      )}
      <p className="text-xs text-slate-400 mb-2">
        {totalUnits} unite{totalUnits > 1 ? 's' : ''} · {ticket.lignes.length} reference{ticket.lignes.length > 1 ? 's' : ''}
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-500">Total</span>
        <span className="text-base font-bold text-primary">
          {fmtFCFA(ticket.montantTotal)}
        </span>
      </div>
    </button>
  );
};

export const FileCaissier = () => {
  const toast = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [methode, setMethode] = useState<Methode>('ESPECES');
  const [submitting, setSubmitting] = useState(false);
  const [caisseJour, setCaisseJour] = useState<{ id: string; statut: string; solde: number } | null>(null);

  // Crédit : sélection du client enregistré + acompte
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientEncours, setClientEncours] = useState<number | null>(null);
  const [acompte, setAcompte] = useState('');

  const charger = async () => {
    setError(null);
    try {
      const [tks, cj] = await Promise.all([
        bonVenteApi.pending(),
        caisseJourApi.aujourdhui().catch(() => null),
      ]);
      setTickets(tks || []);
      if (cj) setCaisseJour(cj);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();

    // SSE — notifications temps réel quand un vendeur envoie un bon
    return subscribeAuthenticatedSse('/bons/stream', () => { void charger(); });
  }, []);

  // Charge la liste des clients (pour les ventes à crédit)
  useEffect(() => {
    clientApi.getAll().then((data) => setClients(data || [])).catch(() => {});
  }, []);

  // Réinitialise la sélection client quand on ouvre/ferme un ticket ou change de méthode
  useEffect(() => {
    setSelectedClient(null);
    setClientEncours(null);
    setClientSearch('');
    setAcompte('');
  }, [selected, methode]);

  // Encours du client choisi (informatif)
  useEffect(() => {
    if (!selectedClient) {
      setClientEncours(null);
      return;
    }
    clientApi
      .getEncours(selectedClient.id)
      .then((e) => setClientEncours(e?.totalDu ?? 0))
      .catch(() => setClientEncours(null));
  }, [selectedClient]);

  const clientsFiltres = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients.slice(0, 6);
    return clients
      .filter(
        (c) =>
          `${c.nom} ${c.prenom || ''}`.toLowerCase().includes(q) ||
          (c.telephone || '').includes(q),
      )
      .slice(0, 6);
  }, [clients, clientSearch]);

  const handleEncaisser = async () => {
    if (!selected) return;
    const isCredit = methode === 'CREDIT';
    if (isCredit && !selectedClient) {
      toast.error('Sélectionnez un client enregistré pour une vente à crédit.');
      return;
    }
    setSubmitting(true);
    try {
      const opts = isCredit
        ? {
            clientId: selectedClient.id,
            montantPaye: acompte ? Math.max(0, parseFloat(acompte)) : 0,
            dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }
        : undefined;
      await bonVenteApi.valider(selected.id, {
        methodePaiement: methode,
        ...(isCredit ? opts : {}),
      });
      toast.success(isCredit ? 'Vente à crédit enregistrée.' : 'Encaissement réussi.');
      setSelected(null);
      setMethode('ESPECES');
      await charger();
    } catch (e: any) {
      toast.error(errorMessage(e));
      await charger(); // recharger même sur erreur pour éviter l'état désynchronisé
    } finally {
      setSubmitting(false);
    }
  };

  const total = useMemo(
    () =>
      tickets.reduce(
        (acc, t) =>
          acc +
          (typeof t.montantTotal === 'string'
            ? parseFloat(t.montantTotal)
            : t.montantTotal),
        0,
      ),
    [tickets],
  );
  const selectedTotalUnits = useMemo(
    () => selected?.lignes.reduce((sum, ligne) => sum + ligne.quantite, 0) || 0,
    [selected],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">File d'attente</h2>
          <p className="text-slate-500 text-sm">
            Bons envoyés par les vendeurs — notification en temps réel.
          </p>
        </div>
        {caisseJour && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2">
            <Wallet size={20} className="text-primary" />
            <div>
              <p className="text-xs text-slate-500">
                Caisse du jour ({caisseJour.statut === 'OUVERTE' ? 'ouverte' : 'fermée'})
              </p>
              <p className="text-lg font-bold text-slate-900">
                {fmtFCFA(caisseJour.solde)}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">En attente</p>
          <p className="text-2xl font-bold text-amber-600">{tickets.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Total à encaisser</p>
          <p className="text-2xl font-bold text-primary">{fmtFCFA(total)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Chargement…</div>
      ) : tickets.length === 0 ? (
        <div className="text-center text-slate-400 py-16">
          <ListChecks size={48} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucun ticket en attente.</p>
          <p className="text-xs mt-1">La file se met à jour en temps réel dès qu'un vendeur envoie un bon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} onSelect={() => setSelected(t)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !submitting && setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-lg text-slate-900">
                  Encaisser ticket
                </h3>
                <button
                  onClick={() => !submitting && setSelected(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <p className="font-mono text-sm font-bold">{selected.numeroTicket}</p>
                  {selected.nomClient && (
                    <p className="text-sm text-slate-600 mt-1">
                      Client : {selected.nomClient}
                      {selected.telephoneClient ? ` — ${selected.telephoneClient}` : ''}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Articles</p>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto text-sm">
                    {selected.lignes.map((l) => (
                      <li key={l.id} className="flex justify-between text-slate-600">
                        <span>{l.quantite}× {l.nomProduit}</span>
                        <span className="font-medium text-slate-900">
                          {fmtFCFA(l.sousTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Total à encaisser</span>
                  <span className="text-2xl font-bold text-primary">
                    {fmtFCFA(selected.montantTotal)}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Méthode de paiement
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {methodes.map((m) => {
                      const Icon = m.icon;
                      const actif = methode === m.value;
                      return (
                        <button
                          key={m.value}
                          onClick={() => setMethode(m.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            actif
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={16} />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vente à crédit : client enregistré obligatoire + acompte */}
                {methode === 'CREDIT' && (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                    <p className="text-sm font-semibold text-amber-800">
                      Client (obligatoire pour le crédit)
                    </p>

                    {selectedClient ? (
                      <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-slate-200 p-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCheck size={16} className="text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {selectedClient.nom} {selectedClient.prenom || ''}
                            </p>
                            {clientEncours != null && clientEncours > 0 && (
                              <p className="text-xs text-red-600 font-semibold">
                                Doit déjà : {fmtFCFA(clientEncours)}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedClient(null)}
                          className="text-xs font-bold text-primary hover:underline shrink-0"
                        >
                          Changer
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            placeholder="Rechercher un client (nom, téléphone)…"
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {clientsFiltres.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2 text-center">Aucun client trouvé.</p>
                          ) : (
                            clientsFiltres.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => setSelectedClient(c)}
                                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-white rounded-lg border border-slate-200 text-left hover:border-primary/40"
                              >
                                <span className="text-sm font-medium text-slate-800 truncate">
                                  {c.nom} {c.prenom || ''}
                                </span>
                                <span className="text-xs text-slate-400 shrink-0">{c.telephone || ''}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1">
                        Acompte versé maintenant (optionnel)
                      </label>
                      <input
                        type="number"
                        value={acompte}
                        onChange={(e) => setAcompte(e.target.value)}
                        min={0}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Laissez vide si le client ne paie rien aujourd'hui.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-slate-100 bg-white shrink-0 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{selectedTotalUnits} unite{selectedTotalUnits > 1 ? 's' : ''}</span>
                  <span>{methode === 'CREDIT' ? 'Vente a credit' : methodes.find((item) => item.value === methode)?.label}</span>
                </div>
                <div className="flex gap-2">
                <button
                  onClick={() => !submitting && setSelected(null)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEncaisser}
                  disabled={submitting || (methode === 'CREDIT' && !selectedClient)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={16} />
                  {submitting
                    ? 'Traitement…'
                    : methode === 'CREDIT'
                      ? 'Valider à crédit'
                      : 'Encaisser'}
                </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
