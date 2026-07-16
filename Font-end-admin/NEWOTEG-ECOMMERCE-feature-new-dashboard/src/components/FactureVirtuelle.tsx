import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Ghost, Printer, Search, CheckCircle2, XCircle, Trash2, ChevronDown } from 'lucide-react';
import { factureVirtuelleApi, getApiErrorMessage } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';
import { ReceiptGenerator } from './ReceiptGenerator';

const fmtFCFA = (v: number | string) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(v) || 0).replace(/ /g, ' ') + ' FCFA';

interface FV {
  id: string;
  numero: string;
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE';
  pourcentageMajoration: string | number;
  totalTTC: string | number;
  totalReelTTC: string | number;
  margeDemarcheur: string | number;
  modeMajoration: 'GLOBAL' | 'PAR_LIGNE';
  motifRefus: string | null;
  printCount: number;
  dateCreation: string;
  vendeur: { id: string; nom: string };
  client: { id: string; nom: string } | null;
  factureReelle: { id: string; numero: string };
}

export const FactureVirtuelle: React.FC = () => {
  const { admin } = useAdminAuth();
  const role = admin?.role;

  const [factures, setFactures] = useState<FV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRefusModal, setShowRefusModal] = useState(false);
  const [selectedFv, setSelectedFv] = useState<FV | null>(null);
  const [motifRefus, setMotifRefus] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const charger = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filterStatut) params.statut = filterStatut;
      const res = await factureVirtuelleApi.getAll(params);
      setFactures(res.data || []);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Impossible de charger les factures virtuelles.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, [filterStatut]);

  const handleApprouver = async (fv: FV) => {
    setActionLoading(fv.id);
    try {
      await factureVirtuelleApi.approuver(fv.id);
      charger();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erreur approbation'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuser = async () => {
    if (!selectedFv || motifRefus.length < 3) return;
    setActionLoading(selectedFv.id);
    try {
      await factureVirtuelleApi.refuser(selectedFv.id, motifRefus);
      setShowRefusModal(false);
      setMotifRefus('');
      setSelectedFv(null);
      charger();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erreur refus'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (fv: FV) => {
    if (!confirm(`Supprimer la facture virtuelle ${fv.numero} ?`)) return;
    try {
      await factureVirtuelleApi.remove(fv.id);
      charger();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erreur suppression'));
    }
  };

  const handlePrint = async (fv: FV) => {
    setActionLoading(fv.id);
    try {
      const fullFv = await factureVirtuelleApi.getOne(fv.id);
      setReceiptData(fullFv);
      setShowReceipt(true);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Erreur impression'));
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = factures.filter((f) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      f.numero.toLowerCase().includes(s) ||
      f.vendeur.nom.toLowerCase().includes(s) ||
      (f.client?.nom || '').toLowerCase().includes(s) ||
      f.factureReelle.numero.toLowerCase().includes(s)
    );
  });

  const statutBadge = (s: string) => {
    if (s === 'EN_ATTENTE') return 'bg-amber-100 text-amber-700';
    if (s === 'APPROUVEE') return 'bg-emerald-100 text-emerald-700';
    return 'bg-red-100 text-red-700';
  };

  const statutLabel = (s: string) => {
    if (s === 'EN_ATTENTE') return 'En attente';
    if (s === 'APPROUVEE') return 'Approuvée';
    return 'Refusée';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, vendeur, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 pr-8 text-sm text-slate-700 outline-none focus:border-primary"
          >
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="APPROUVEE">Approuvées</option>
            <option value="REFUSEE">Refusées</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {/* Tableau */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          <Ghost size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune facture virtuelle</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Numéro</th>
                <th className="px-4 py-3 text-left">Facture réelle</th>
                <th className="px-4 py-3 text-left">Vendeur</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-right">Majoration</th>
                <th className="px-4 py-3 text-right">Total virtuel</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-center">Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((fv) => (
                <tr key={fv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-slate-900">{fv.numero}</p>
                    {fv.motifRefus && (
                      <p className="text-xs text-red-500 mt-0.5 truncate max-w-[150px]" title={fv.motifRefus}>
                        {fv.motifRefus}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{fv.factureReelle.numero}</td>
                  <td className="px-4 py-3 text-slate-700">{fv.vendeur.nom}</td>
                  <td className="px-4 py-3 text-slate-600">{fv.client?.nom ?? 'Comptoir'}</td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">
                    {Number(fv.pourcentageMajoration)}%
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary">
                    {fmtFCFA(fv.totalTTC)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statutBadge(fv.statut)}`}>
                      {statutLabel(fv.statut)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">
                    {new Date(fv.dateCreation).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {can.approuverFactureVirtuelle(role) && fv.statut === 'EN_ATTENTE' && (
                        <>
                          <button
                            onClick={() => handleApprouver(fv)}
                            disabled={actionLoading === fv.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            title="Approuver"
                          >
                            <CheckCircle2 size={13} /> Approuver
                          </button>
                          <button
                            onClick={() => { setSelectedFv(fv); setShowRefusModal(true); }}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                            title="Refuser"
                          >
                            <XCircle size={13} /> Refuser
                          </button>
                        </>
                      )}
                      {fv.statut === 'APPROUVEE' && (
                        <button
                          onClick={() => handlePrint(fv)}
                          disabled={actionLoading === fv.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                          title="Imprimer"
                        >
                          <Printer size={13} />
                          {actionLoading === fv.id ? '…' : 'Imprimer'}
                        </button>
                      )}
                      {(fv.statut === 'REFUSEE' || fv.statut === 'EN_ATTENTE') && (
                        <button
                          onClick={() => handleDelete(fv)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
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

      {/* Impression facture virtuelle */}
      {showReceipt && receiptData && (
        <ReceiptGenerator
          documentId={receiptData.id}
          printCount={receiptData.printCount || 0}
          type="factureVirtuelle"
          lignes={(receiptData.lignes || []).map((l: any) => ({
            nomProduit: l.nomProduit,
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaireTTC),
            sousTotal: Number(l.sousTotalTTC),
          }))}
          montantTotal={Number(receiptData.totalTTC)}
          methodePaiement={receiptData.vente?.methodePaiement || 'ESPECES'}
          numero={receiptData.numero}
          client={receiptData.client ? { nom: receiptData.client.nom } : undefined}
          dateVente={receiptData.dateCreation}
          onPrintRecorded={({ printCount }) =>
            setReceiptData((current: any) => current ? { ...current, printCount } : current)}
          onClose={() => { setShowReceipt(false); setReceiptData(null); }}
        />
      )}

      {/* Modal refus */}
      {showRefusModal && selectedFv && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowRefusModal(false); setMotifRefus(''); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 mb-1">Refuser la facture {selectedFv.numero}</h3>
            <p className="text-sm text-slate-500 mb-4">Indiquez un motif pour le vendeur.</p>
            <textarea
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              placeholder="Motif du refus..."
              className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-24 outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowRefusModal(false); setMotifRefus(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuser}
                disabled={motifRefus.length < 3 || actionLoading !== null}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
