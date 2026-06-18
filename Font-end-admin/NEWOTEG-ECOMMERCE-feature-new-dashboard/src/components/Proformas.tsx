import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, FileText, Plus, Printer, RefreshCw, Send, Trash2, X } from 'lucide-react';
import { produitApi, proformaApi, getApiErrorMessage } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { fmtDateCourt, fmtFCFA } from '../utils/format';
import { ReceiptGenerator } from './ReceiptGenerator';

type LigneForm = { produitId: string; quantite: number; prixUnitaire: number };

const NOTES_DEFAULT = 'Devis valable 30 jours. Prix sous réserve de disponibilité des stocks.';

const statutConfig: Record<string, { label: string; className: string }> = {
  EN_COURS:    { label: 'En cours',    className: 'bg-blue-100 text-blue-700' },
  ACCEPTEE:    { label: 'Acceptée',    className: 'bg-green-100 text-green-700' },
  TRANSFORMEE: { label: 'Transformée', className: 'bg-slate-100 text-slate-500' },
};

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const Proformas = () => {
  const { admin } = useAdminAuth();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(admin?.role || '');
  const canManage = ['SUPER_ADMIN', 'ADMIN', 'VENDEUR'].includes(admin?.role || '');
  const [proformas, setProformas] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [periode, setPeriode] = useState(currentPeriod());
  const [statut, setStatut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [clientNom, setClientNom] = useState('');
  const [clientNiu, setClientNiu] = useState('');
  const [clientRccm, setClientRccm] = useState('');
  const [notes, setNotes] = useState(NOTES_DEFAULT);
  const [lignes, setLignes] = useState<LigneForm[]>([]);
  const [searchProduit, setSearchProduit] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [printingProforma, setPrintingProforma] = useState<any | null>(null);

  const produitById = useMemo(
    () => new Map(produits.map((p) => [p.id, p])),
    [produits],
  );

  const charger = async () => {
    setLoading(true);
    setError(null);
    try {
      const [proformaData, produitData] = await Promise.all([
        proformaApi.getAll({ periode, statut: statut || undefined }),
        produitApi.getAll(),
      ]);
      setProformas(Array.isArray(proformaData) ? proformaData : []);
      setProduits(Array.isArray(produitData) ? produitData : []);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Impossible de charger les proformas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [periode, statut]);

  const produitsFiltres = useMemo(() => {
    const q = searchProduit.trim().toLowerCase();
    if (!q) return produits;
    return produits.filter((p) => p.nomProduit.toLowerCase().includes(q));
  }, [produits, searchProduit]);

  const addLine = (produit: any) => {
    setLignes((prev) => [
      ...prev,
      { produitId: produit.id, quantite: 1, prixUnitaire: Number(produit.prixDetail || 0) },
    ]);
    setSearchProduit('');
    setShowDropdown(false);
  };

  const updateLine = (index: number, patch: Partial<LigneForm>) => {
    setLignes((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        // Si le produit change, réinitialiser au prix détail
        if (patch.produitId) {
          const p = produitById.get(patch.produitId);
          next.prixUnitaire = Number(p?.prixDetail || 0);
        }
        return next;
      }),
    );
  };

  const appliquerPrixGros = (index: number) => {
    setLignes((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const p = produitById.get(line.produitId);
        return { ...line, prixUnitaire: Number(p?.prixGros || line.prixUnitaire) };
      }),
    );
  };

  const create = async () => {
    if (!canManage) return;
    if (lignes.length === 0) {
      setError('Ajoutez au moins une ligne.');
      return;
    }
    setLoading(true);
    try {
      const created = await proformaApi.create({
        clientNom: clientNom.trim() || undefined,
        clientNiu: clientNiu.trim() || undefined,
        clientRccm: clientRccm.trim() || undefined,
        notes: notes.trim() || undefined,
        lignes,
      });
      setShowCreate(false);
      setClientNom('');
      setClientNiu('');
      setClientRccm('');
      setNotes(NOTES_DEFAULT);
      setLignes([]);
      setSearchProduit('');
      setShowDropdown(false);
      setPrintingProforma(created);
      await charger();
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Création impossible.'));
    } finally {
      setLoading(false);
    }
  };

  const transformer = async (id: string) => {
    if (!canManage) return;
    setError(null);
    try {
      await proformaApi.transformer(id, { methodePaiement: 'ESPECES' });
      await charger();
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Transformation impossible.'));
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer cette proforma ?')) return;
    setError(null);
    try {
      await proformaApi.remove(id);
      await charger();
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Suppression impossible.'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proformas</h1>
          <p className="text-sm text-slate-500">Devis avant vente, imprimable avant paiement et transformable en ticket a encaisser.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            <option value="EN_COURS">En cours</option>
            <option value="ACCEPTEE">Acceptee</option>
            <option value="TRANSFORMEE">Transformee</option>
          </select>
          <button onClick={charger} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" title="Rafraichir">
            <RefreshCw size={15} />
          </button>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              <Plus size={16} />
              Creer
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Numero</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Vendeur</th>
              <th className="px-4 py-3 text-left">Expiration</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proformas.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold">{p.numero}</td>
                <td className="px-4 py-3">{p.client?.nom || p.clientNom || 'Comptoir'}</td>
                <td className="px-4 py-3">{p.vendeur?.nom || '-'}</td>
                <td className="px-4 py-3">{fmtDateCourt(p.dateExpiration)}</td>
                <td className="px-4 py-3 text-right font-bold text-primary">{fmtFCFA(p.montantTotal)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${(statutConfig[p.statut] ?? statutConfig['EN_COURS']).className}`}>
                    {(statutConfig[p.statut] ?? { label: p.statut }).label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setPrintingProforma(p)}
                      className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                      title="Imprimer la proforma"
                    >
                      <Printer size={15} />
                    </button>
                    {canManage && p.statut !== 'TRANSFORMEE' && (
                      <button
                        onClick={() => transformer(p.id)}
                        className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                        title="Transformer en ticket"
                      >
                        <Send size={15} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => remove(p.id)}
                        className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && proformas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <FileText className="mx-auto mb-2 opacity-30" />
                  Aucune proforma sur cette periode.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nouvelle proforma</h2>
              <button onClick={() => { setShowCreate(false); setSearchProduit(''); setNotes(NOTES_DEFAULT); }} className="rounded-lg p-2 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input value={clientNom} onChange={(e) => setClientNom(e.target.value)} placeholder="Client" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={clientNiu} onChange={(e) => setClientNiu(e.target.value)} placeholder="NIU client" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={clientRccm} onChange={(e) => setClientRccm(e.target.value)} placeholder="RCCM client" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            {/* Autocomplete produits */}
            <div className="relative mt-4 mb-2">
              <input
                type="text"
                value={searchProduit}
                onChange={(e) => { setSearchProduit(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Rechercher et ajouter un produit…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary focus:bg-white outline-none"
              />
              {showDropdown && produitsFiltres.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {produitsFiltres.slice(0, 30).map((prod) => {
                    const rupture = (prod.quantiteStock ?? 0) <= 0;
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onMouseDown={() => addLine(prod)}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 text-left"
                      >
                        <span className={rupture ? 'text-orange-600' : 'text-slate-800'}>
                          {prod.nomProduit}
                          {rupture && <span className="ml-1 text-xs">⚠ rupture</span>}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">{Number(prod.prixDetail || 0).toLocaleString()} FCFA</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lignes ajoutées */}
            <div className="space-y-2">
              {lignes.length > 0 && (
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-6 text-xs text-slate-400 font-medium">Produit</span>
                  <span className="col-span-2 text-xs text-slate-400 font-medium">Qté</span>
                  <span className="col-span-3 text-xs text-slate-400 font-medium">Prix unit.</span>
                  <span className="col-span-1" />
                </div>
              )}
              {lignes.map((line, index) => {
                const p = produitById.get(line.produitId);
                const enRupture = p && (p.quantiteStock ?? 0) <= 0;
                const seuil = Number(p?.quantiteGros || 0);
                const prixGros = Number(p?.prixGros || 0);
                const eligibleGros = seuil > 0 && line.quantite >= seuil && prixGros > 0;
                const grosDejaApplique = eligibleGros && line.prixUnitaire === prixGros;
                return (
                  <div key={index} className={`grid grid-cols-12 gap-2 rounded-lg p-2 ${enRupture ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'}`}>
                    <div className="col-span-6">
                      <p className="text-sm font-medium text-slate-800 truncate">{p?.nomProduit ?? '—'}</p>
                      {enRupture && (
                        <p className="flex items-center gap-1 text-xs text-orange-600">
                          <AlertTriangle size={11} />
                          Rupture — stock peut évoluer
                        </p>
                      )}
                      {grosDejaApplique && (
                        <p className="text-xs text-emerald-600 font-medium">✓ Prix de gros appliqué</p>
                      )}
                      {eligibleGros && !grosDejaApplique && (
                        <button
                          type="button"
                          onClick={() => appliquerPrixGros(index)}
                          className="text-xs text-emerald-700 underline font-medium hover:text-emerald-900"
                        >
                          Appliquer prix de gros ({prixGros.toLocaleString()} FCFA)
                        </button>
                      )}
                    </div>
                    <input
                      type="number" min={1} value={line.quantite}
                      onChange={(e) => updateLine(index, { quantite: Number(e.target.value) })}
                      className="col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number" min={0} value={line.prixUnitaire}
                      onChange={(e) => updateLine(index, { prixUnitaire: Number(e.target.value) })}
                      className="col-span-3 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => setLignes((prev) => prev.filter((_, i) => i !== index))}
                      className="col-span-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setShowCreate(false); setSearchProduit(''); setNotes(NOTES_DEFAULT); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Annuler</button>
              <button onClick={create} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {printingProforma && (
        <ReceiptGenerator
          type="proforma"
          numero={printingProforma.numero}
          dateVente={printingProforma.dateCreation}
          methodePaiement="A regler"
          montantTotal={Number(printingProforma.montantTotal)}
          client={{
            nom: printingProforma.client?.nom || printingProforma.clientNom || 'Client comptoir',
            nui: printingProforma.client?.niu || printingProforma.clientNiu || undefined,
            rccm: printingProforma.client?.rccm || printingProforma.clientRccm || undefined,
          }}
          notes={printingProforma.notes || undefined}
          lignes={(printingProforma.lignes || []).map((l: any) => ({
            nomProduit: l.nomProduit,
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaire),
            sousTotal: Number(l.sousTotal),
          }))}
          onClose={() => setPrintingProforma(null)}
        />
      )}
    </motion.div>
  );
};
