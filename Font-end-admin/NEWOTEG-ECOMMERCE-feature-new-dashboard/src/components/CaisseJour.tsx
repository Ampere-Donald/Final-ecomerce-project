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
} from 'lucide-react';
import { caisseJourApi } from '../services/api';
import { FileCaissier } from './FileCaissier';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'encaisser' | 'mouvements' | 'cloture'>('encaisser');

  // Modal ajout opÃ©ration
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

  const charger = async () => {
    setError(null);
    try {
      const data = await caisseJourApi.aujourdhui();
      setCj(data);
      if (data?.id) {
        const detail = await caisseJourApi.getOne(data.id);
        setOperations(detail.operations || []);
      }
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

  if (loading) {
    return <div className="text-center text-slate-400 py-12">Chargementâ€¦</div>;
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
            {fmtDateLong(cj.date)} â€” Ouverte Ã  {fmtHeure(cj.ouvertureAt)}
            {cj.fermetureAt && ` â€” FermÃ©e Ã  ${fmtHeure(cj.fermetureAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={charger}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary border border-slate-200 rounded-lg"
          >
            <RefreshCw size={14} />
            RafraÃ®chir
          </button>
          {ouverte && (
            <>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <Plus size={14} />
                OpÃ©ration
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
            Caisse fermÃ©e. Solde de clÃ´ture transfÃ©rÃ© vers la caisse globale :{' '}
            <strong>{fmtFCFA(cj.soldeCloture ?? cj.solde)}</strong>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {([
          ['encaisser', 'À encaisser'],
          ['mouvements', 'Mouvements'],
          ['cloture', 'Clôture'],
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
            EntrÃ©es du jour
          </div>
          <p className="text-2xl font-bold text-emerald-600">+{fmtFCFA(entrees)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <ArrowDownRight size={16} className="text-red-600" />
            Sorties du jour
          </div>
          <p className="text-2xl font-bold text-red-600">âˆ’{fmtFCFA(sorties)}</p>
        </div>
      </div>

      {activeTab === 'encaisser' && (
        <FileCaissier />
      )}

      {activeTab === 'mouvements' && (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">OpÃ©rations</h3>
        </div>
        {operations.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <Clock size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune opÃ©ration aujourd'hui.</p>
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
                      <span className="ml-2 text-xs text-slate-400">(annulÃ©e)</span>
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
                  {op.typeOperation === 'ENTREE' ? '+' : 'âˆ’'}
                  {fmtFCFA(op.montant)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      )}

      {activeTab === 'cloture' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-bold text-slate-900">Clôture</h3>
          <p className="mt-2 text-sm text-slate-500">Vérifiez les mouvements du jour avant de fermer la caisse.</p>
          <button
            onClick={() => setShowFermer(true)}
            disabled={!ouverte}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Lock size={14} />
            Fermer la caisse
          </button>
        </div>
      )}

      {/* Modal Ajouter opÃ©ration */}
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
                  Nouvelle opÃ©ration
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
                        {t === 'ENTREE' ? 'EntrÃ©e' : 'Sortie'}
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
                  {addSubmitting ? 'Enregistrementâ€¦' : 'Enregistrer'}
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
                    Vous Ãªtes sur le point de fermer la caisse. Le solde de{' '}
                    <strong>{fmtFCFA(cj.solde)}</strong> sera transfÃ©rÃ© vers la
                    caisse globale et la session sera clÃ´turÃ©e.
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
                    placeholder="Ex : JournÃ©e calme, RAS"
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
                  {fermerSubmitting ? 'Fermetureâ€¦' : 'Confirmer la fermeture'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

