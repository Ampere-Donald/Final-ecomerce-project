import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Lock,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  CheckCircle2,
  FileText,
  Printer,
  Search,
} from 'lucide-react';
import { caisseJourApi, factureApi, getApiErrorMessage } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { FileCaissier } from './FileCaissier';
import { ReceiptGenerator } from './ReceiptGenerator';
import { FactureVirtuelleModal } from './FactureVirtuelleModal';
import { useToast } from './ui/Toast';
import { Proformas } from './Proformas';
import { Invoices } from './Invoices';

interface Operation {
  id: string;
  dateOperation: string;
  typeOperation: 'ENTREE' | 'SORTIE';
  montant: string | number;
  motif: string;
  annulee: boolean;
}

interface CaisseJourData {
  id: string;
  date: string;
  ouvertureAt: string;
  fermetureAt?: string | null;
  statut: 'OUVERTE' | 'FERMEE';
  soldeCloture?: string | number | null;
  solde: number;
}

interface FactureJour {
  id: string;
  numero: string;
  type: 'FACTURE' | 'TICKET_CAISSE' | 'BON_VENTE';
  dateEmission: string;
  totalTTC: number | string;
  methodePaiement: string;
  printCount: number;
  vendeur?: { nom: string } | null;
  caissier?: { nom: string } | null;
  client?: { nom: string; telephone?: string } | null;
  lignes?: Array<{ nomProduit: string; quantite: number; sousTotalTTC: number | string }>;
}

const fmtFCFA = (n: number | string): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(v || 0)
    .replace(/ |\s/g, ' ') + ' FCFA';
};

const fmtDateLong = (d: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(d));

const fmtHeure = (d: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(d)).replace(':', 'h');

export const CaisseJour = () => {
  const [cj, setCj] = useState<CaisseJourData | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [facturesJour, setFacturesJour] = useState<FactureJour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'encaisser' | 'encaissements' | 'mouvements' | 'proformas' | 'factures'>('encaisser');
  const [searchFacture, setSearchFacture] = useState('');
  const [printingFacture, setPrintingFacture] = useState<string | null>(null);
  const [receiptFacture, setReceiptFacture] = useState<FactureJour | null>(null);

  // Modal ajout opération
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<'ENTREE' | 'SORTIE'>('SORTIE');
  const [addMontant, setAddMontant] = useState('');
  const [addMotif, setAddMotif] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Modal fermeture
  const [showFermer, setShowFermer] = useState(false);
  const [fermerNote, setFermerNote] = useState('');
  const [fermerSubmitting, setFermerSubmitting] = useState(false);
  const [fermerError, setFermerError] = useState<string | null>(null);

  // Modal réouverture (SUPER_ADMIN uniquement)
  const [showRouvrir, setShowRouvrir] = useState(false);
  const [rouvrirSubmitting, setRouvrirSubmitting] = useState(false);
  const [rouvrirError, setRouvrirError] = useState<string | null>(null);

  // Modal facture virtuelle
  const [showFV, setShowFV] = useState(false);
  const [fvFactureId, setFvFactureId] = useState<string | null>(null);

  const { admin } = useAdminAuth();
  const toast = useToast();

  const charger = async () => {
    setError(null);
    try {
      const data = await caisseJourApi.aujourdhui();
      setCj(data);
      if (data?.id) {
        const detail = await caisseJourApi.getOne(data.id);
        setOperations(detail.operations || []);
      }
      const factures = await factureApi.getAll();
      setFacturesJour(Array.isArray(factures) ? factures : []);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Erreur de chargement.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
    const id = setInterval(charger, 15000);
    return () => clearInterval(id);
  }, []);

  const { entrees, sorties } = useMemo(() => {
    let e = 0;
    let s = 0;
    for (const op of operations) {
      if (op.annulee) continue;
      const v = typeof op.montant === 'string' ? parseFloat(op.montant) : op.montant;
      if (op.typeOperation === 'ENTREE') e += v;
      else s += v;
    }
    return { entrees: e, sorties: s };
  }, [operations]);

  const encaissementsDuJour = useMemo(() => {
    if (!cj?.date) return [];
    const target = new Date(cj.date).toDateString();
    return facturesJour.filter((f) => new Date(f.dateEmission).toDateString() === target);
  }, [cj?.date, facturesJour]);

  const encaissementsFiltres = useMemo(() => {
    const q = searchFacture.trim().toLowerCase();
    if (!q) return encaissementsDuJour;
    return encaissementsDuJour.filter(
      (f) =>
        f.numero.toLowerCase().includes(q) ||
        f.vendeur?.nom.toLowerCase().includes(q) ||
        f.caissier?.nom.toLowerCase().includes(q) ||
        f.client?.nom.toLowerCase().includes(q),
    );
  }, [encaissementsDuJour, searchFacture]);

  const totalEncaissements = useMemo(
    () => encaissementsDuJour.reduce((sum, f) => sum + (Number(f.totalTTC) || 0), 0),
    [encaissementsDuJour],
  );

  const handlePrintFacture = (f: FactureJour) => {
    setReceiptFacture(f);
  };

  const handleAddOperation = async () => {
    if (!cj) return;
    setAddError(null);
    const montant = parseFloat(addMontant);
    if (!Number.isFinite(montant) || montant <= 0) {
      setAddError('Montant invalide.');
      return;
    }
    if (!addMotif.trim()) {
      setAddError('Le motif est obligatoire.');
      return;
    }
    setAddSubmitting(true);
    try {
      await caisseJourApi.addOperation(cj.id, {
        typeOperation: addType,
        montant,
        motif: addMotif.trim(),
      });
      setShowAdd(false);
      setAddMontant('');
      setAddMotif('');
      setAddType('SORTIE');
      await charger();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message;
      setAddError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleFermer = async () => {
    if (!cj) return;
    setFermerError(null);
    setFermerSubmitting(true);
    try {
      await caisseJourApi.fermer(cj.id, fermerNote.trim() || undefined);
      setShowFermer(false);
      setFermerNote('');
      await charger();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message;
      setFermerError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setFermerSubmitting(false);
    }
  };

  const handleRouvrir = async () => {
    if (!cj) return;
    setRouvrirError(null);
    setRouvrirSubmitting(true);
    try {
      await caisseJourApi.rouvrir(cj.id);
      setShowRouvrir(false);
      await charger();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message;
      setRouvrirError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setRouvrirSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-400 py-12">Chargement…</div>;
  }

  if (!cj) {
    return (
      <div className="text-center text-slate-400 py-12">
        Caisse du jour indisponible.
      </div>
    );
  }

  const ouverte = cj.statut === 'OUVERTE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Caisse du jour</h2>
          <p className="text-slate-500 text-sm">
            {fmtDateLong(cj.date)} — Ouverte à {fmtHeure(cj.ouvertureAt)}
            {cj.fermetureAt && ` — Fermée à ${fmtHeure(cj.fermetureAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={charger}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary border border-slate-200 rounded-lg"
          >
            <RefreshCw size={14} />
            Rafraîchir
          </button>
          {ouverte && (
            <>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <Plus size={14} />
                Opération
              </button>
              <button
                onClick={() => setShowFermer(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Lock size={14} />
                Fermer la caisse
              </button>
            </>
          )}
          {!ouverte && admin?.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => setShowRouvrir(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              <RefreshCw size={14} />
              Rouvrir la caisse
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!ouverte && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-100 text-slate-700">
          <Lock size={18} />
          <span>
            Caisse fermée. Solde de clôture transféré vers la caisse globale :{' '}
            <strong>{fmtFCFA(cj.soldeCloture ?? cj.solde)}</strong>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {([
          ['encaisser', 'À encaisser'],
          ['encaissements', 'Encaissements'],
          ['mouvements', 'Mouvements'],
          ['proformas', 'Proformas'],
          ['factures', 'Factures'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === key ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Wallet size={16} className="text-primary" />
            Solde courant
          </div>
          <p className="text-3xl font-bold text-primary">{fmtFCFA(cj.solde)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <ArrowUpRight size={16} className="text-emerald-600" />
            Entrées du jour
          </div>
          <p className="text-2xl font-bold text-emerald-600">+{fmtFCFA(entrees)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <ArrowDownRight size={16} className="text-red-600" />
            Sorties du jour
          </div>
          <p className="text-2xl font-bold text-red-600">−{fmtFCFA(sorties)}</p>
        </div>
      </div>

      {activeTab === 'encaisser' && (
        <FileCaissier />
      )}

      {activeTab === 'encaissements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Encaissements du jour</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{encaissementsDuJour.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Montant encaissé</p>
              <p className="mt-1 text-2xl font-bold text-primary">{fmtFCFA(totalEncaissements)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Tickets et factures du jour</h3>
                <p className="text-sm text-slate-500">Historique imprimable des ventes encaissées aujourd'hui.</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchFacture}
                  onChange={(e) => setSearchFacture(e.target.value)}
                  placeholder="Rechercher numero, client..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {encaissementsFiltres.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun encaissement trouve pour cette date.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Numero</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Heure</th>
                        <th className="px-4 py-3 text-left">Vendeur</th>
                        <th className="px-4 py-3 text-left">Client</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Impressions</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {encaissementsFiltres.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">{f.numero}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                              {f.type === 'TICKET_CAISSE' ? 'Ticket' : 'Facture'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{fmtHeure(f.dateEmission)}</td>
                          <td className="px-4 py-3 text-slate-700">{f.vendeur?.nom ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{f.client?.nom ?? 'Comptoir'}</td>
                          <td className="px-4 py-3 text-right font-bold text-primary">{fmtFCFA(f.totalTTC)}</td>
                          <td className="px-4 py-3 text-center text-slate-500">{f.printCount || 0}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handlePrintFacture(f)}
                                disabled={printingFacture === f.id}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                title="Imprimer"
                              >
                                <Printer size={13} />
                                {printingFacture === f.id ? '...' : 'Imprimer'}
                              </button>
                              <button
                                onClick={() => { setFvFactureId(f.id); setShowFV(true); }}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                title="Facture virtuelle"
                              >
                                <FileText size={13} />
                                FV
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Cards (mobile) ── */}
                <div className="md:hidden divide-y divide-slate-100">
                  {encaissementsFiltres.map((f) => (
                    <div key={f.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-xs font-bold text-slate-900">{f.numero}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {f.type === 'TICKET_CAISSE' ? 'Ticket' : 'Facture'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{fmtHeure(f.dateEmission)} · {f.vendeur?.nom ?? '-'}</span>
                        <span className="font-bold text-primary text-sm">{fmtFCFA(f.totalTTC)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{f.client?.nom ?? 'Comptoir'}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{f.printCount || 0} impression{(f.printCount || 0) !== 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handlePrintFacture(f)}
                            disabled={printingFacture === f.id}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            title="Imprimer"
                          >
                            <Printer size={13} />
                            {printingFacture === f.id ? '...' : 'Imprimer'}
                          </button>
                          <button
                            onClick={() => { setFvFactureId(f.id); setShowFV(true); }}
                            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-blue-50 px-3 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            title="Facture virtuelle"
                          >
                            <FileText size={13} />
                            FV
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'mouvements' && (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Opérations</h3>
        </div>
        {operations.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <Clock size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune opération aujourd'hui.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {operations.map((op) => (
              <div
                key={op.id}
                className={`flex items-center gap-3 p-4 ${op.annulee ? 'opacity-50' : ''}`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    op.typeOperation === 'ENTREE'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {op.typeOperation === 'ENTREE' ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {op.motif}
                    {op.annulee && (
                      <span className="ml-2 text-xs text-slate-400">(annulée)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fmtHeure(op.dateOperation)}
                  </p>
                </div>
                <p
                  className={`text-base font-bold whitespace-nowrap ${
                    op.typeOperation === 'ENTREE' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {op.typeOperation === 'ENTREE' ? '+' : '−'}
                  {fmtFCFA(op.montant)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      )}


      {activeTab === 'proformas' && <Proformas />}

      {activeTab === 'factures' && <Invoices />}

      {/* Modal Ajouter opération */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !addSubmitting && setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">
                  Nouvelle opération
                </h3>
                <button
                  onClick={() => !addSubmitting && setShowAdd(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ENTREE', 'SORTIE'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAddType(t)}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
                          addType === t
                            ? t === 'ENTREE'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                              : 'border-red-600 bg-red-50 text-red-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {t === 'ENTREE' ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {t === 'ENTREE' ? 'Entrée' : 'Sortie'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Montant (FCFA)
                  </label>
                  <input
                    type="number"
                    value={addMontant}
                    onChange={(e) => setAddMontant(e.target.value)}
                    min={1}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Ex : 15000"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Motif <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addMotif}
                    onChange={(e) => setAddMotif(e.target.value)}
                    maxLength={255}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Ex : Achat fournitures bureau"
                  />
                </div>
                {addError && (
                  <div className="flex items-center gap-2 p-2 rounded bg-red-50 text-red-700 text-sm border border-red-200">
                    <AlertCircle size={14} />
                    {addError}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => !addSubmitting && setShowAdd(false)}
                  disabled={addSubmitting}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddOperation}
                  disabled={addSubmitting}
                  className="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                >
                  {addSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Fermer la caisse */}
      <AnimatePresence>
        {showFermer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !fermerSubmitting && setShowFermer(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">
                  Fermer la caisse du jour
                </h3>
                <button
                  onClick={() => !fermerSubmitting && setShowFermer(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-3 bg-amber-50 rounded-lg text-amber-900 text-sm">
                  <p>
                    Vous êtes sur le point de fermer la caisse. Le solde de{' '}
                    <strong>{fmtFCFA(cj.solde)}</strong> sera transféré vers la
                    caisse globale et la session sera clôturée.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Note (optionnel)
                  </label>
                  <input
                    type="text"
                    value={fermerNote}
                    onChange={(e) => setFermerNote(e.target.value)}
                    maxLength={255}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Ex : Journée calme, RAS"
                  />
                </div>
                {fermerError && (
                  <div className="flex items-center gap-2 p-2 rounded bg-red-50 text-red-700 text-sm border border-red-200">
                    <AlertCircle size={14} />
                    {fermerError}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => !fermerSubmitting && setShowFermer(false)}
                  disabled={fermerSubmitting}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleFermer}
                  disabled={fermerSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  {fermerSubmitting ? 'Fermeture…' : 'Confirmer la fermeture'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Rouvrir la caisse — SUPER_ADMIN uniquement */}
      <AnimatePresence>
        {showRouvrir && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !rouvrirSubmitting && setShowRouvrir(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">
                  Rouvrir la caisse du jour
                </h3>
                <button
                  onClick={() => !rouvrirSubmitting && setShowRouvrir(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-sm space-y-2">
                  <p className="font-bold flex items-center gap-2">
                    <AlertCircle size={16} />
                    Action sensible — Traçabilité activée
                  </p>
                  <p>
                    Cette action réouvrira la caisse fermée du{' '}
                    <strong>{cj ? fmtDateLong(cj.date) : ''}</strong>.
                  </p>
                  <p>
                    Elle sera <strong>enregistrée dans l'audit</strong> avec votre
                    identifiant, l'heure et la date. Toute réouverture non justifiée
                    engage votre responsabilité.
                  </p>
                </div>
                {rouvrirError && (
                  <div className="flex items-center gap-2 p-2 rounded bg-red-50 text-red-700 text-sm border border-red-200">
                    <AlertCircle size={14} />
                    {rouvrirError}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => !rouvrirSubmitting && setShowRouvrir(false)}
                  disabled={rouvrirSubmitting}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRouvrir}
                  disabled={rouvrirSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  {rouvrirSubmitting ? 'Réouverture…' : 'Confirmer la réouverture'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal facture virtuelle */}
      {showFV && fvFactureId && (
        <FactureVirtuelleModal
          factureReelleId={fvFactureId}
          onClose={() => { setShowFV(false); setFvFactureId(null); }}
          onSuccess={(pending) => {
            setShowFV(false);
            setFvFactureId(null);
            toast.success(pending ? 'Demande envoyée au SUPER_ADMIN pour approbation.' : 'Facture virtuelle créée !');
          }}
        />
      )}

      {receiptFacture && (
        <ReceiptGenerator
          documentId={receiptFacture.id}
          printCount={receiptFacture.printCount || 0}
          type={receiptFacture.type === 'FACTURE' ? 'facture' : receiptFacture.type === 'BON_VENTE' ? 'bonVente' : 'ticket'}
          numero={receiptFacture.numero}
          dateVente={receiptFacture.dateEmission}
          methodePaiement={receiptFacture.methodePaiement}
          montantTotal={Number(receiptFacture.totalTTC)}
          client={receiptFacture.client ? { nom: receiptFacture.client.nom, telephone: receiptFacture.client.telephone } : undefined}
          lignes={(receiptFacture.lignes || []).map((l) => ({
            nomProduit: l.nomProduit,
            quantite: l.quantite,
            prixUnitaire: l.quantite > 0 ? Math.round(Number(l.sousTotalTTC) / l.quantite) : 0,
            sousTotal: Number(l.sousTotalTTC),
          }))}
          onPrintRecorded={({ printCount }) => {
            setFacturesJour((prev) =>
              prev.map((item) => item.id === receiptFacture.id ? { ...item, printCount } : item),
            );
            setReceiptFacture((current) => current ? { ...current, printCount } : current);
          }}
          onClose={() => setReceiptFacture(null)}
        />
      )}
    </motion.div>
  );
};

