import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  PlusCircle, Search, Download, ShoppingBag, X, Pencil, Trash2, Eye,
  Package, Calendar, RefreshCw, CheckCircle, XCircle, AlertTriangle, Plus, Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { achatApi, fournisseurApi, produitApi, tauxChangeApi, cmupApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

// ─── Types locaux ────────────────────────────────────────────────────────────

type Devise = 'FCFA' | 'NGN' | 'CNY';
type StatutAchat = 'BROUILLON' | 'VALIDE' | 'ANNULE';
type MethodeRepartition = 'POIDS' | 'VOLUME';

interface LotConfig {
  fraisTransport: number;
  fraisDouane: number;
  methodeRepartition: MethodeRepartition;
  coeffDetailDefault: number;
  coeffGrosDefault: number;
}

interface LotLigne {
  ligneAchatId: string;
  produitId: string;
  nomProduit: string;
  quantite: number;
  cmup: number;
  poidsOuVolume: number | '';
  autofill: boolean;
  chargeUnitaire: number;
  coeffDetail: number;
  coeffGros: number;
  prixDetailSuggere: number;
  prixGrosSuggere: number;
  prixDetailFinal: number | '';
  prixGrosFinal: number | '';
}

interface LigneForme {
  produitId: string;
  quantite: number;
  prixUnitaireDevise: number;
}

interface FormState {
  fournisseurId: string;
  devise: Devise;
  tauxVersFcfa: number;
  tauxAlerte: string;
  sourceTaux: string;
  statutPaiement: string;
  lignes: LigneForme[];
}

interface CmupLigne {
  produitId: string;
  nomProduit: string;
  quantiteEntree: number;
  coutUnitaireDevise: number;
  coutUnitaireFcfa: number;
  stockAvant: number;
  stockApres: number;
  cmupAvant: number;
  cmupApres: number;
  valeurStockAvant: number;
  valeurStockApres: number;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const DEVISES: Devise[] = ['FCFA', 'NGN', 'CNY'];
const STATUTS_PAIEMENT = ['NON_PAYE', 'PAYE', 'EN_ATTENTE', 'PARTIEL'];
const FORM_INITIAL: FormState = {
  fournisseurId: '',
  devise: 'FCFA',
  tauxVersFcfa: 1,
  tauxAlerte: '',
  sourceTaux: 'MANUEL',
  statutPaiement: 'NON_PAYE',
  lignes: [{ produitId: '', quantite: 1, prixUnitaireDevise: 0 }],
};

const fmt = (n: number | string) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ─── Badges ──────────────────────────────────────────────────────────────────

const statutAchatBadge = (s: StatutAchat) => {
  const map: Record<StatutAchat, string> = {
    BROUILLON: 'bg-blue-100 text-blue-800',
    VALIDE:    'bg-emerald-100 text-emerald-800',
    ANNULE:    'bg-red-100 text-red-600',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s] ?? 'bg-slate-100 text-slate-600'}`}>{s}</span>;
};

const statutPaiementBadge = (s: string) => {
  const cls = s === 'PAYE' ? 'bg-emerald-100 text-emerald-700' :
    s === 'PARTIEL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{s}</span>;
};

// ─── Autocomplete produit ────────────────────────────────────────────────────

interface ProduitSearchProps {
  value: string;
  produits: any[];
  onChange: (produitId: string) => void;
}

const ProduitSearch = ({ value, produits, onChange }: ProduitSearchProps) => {
  const selected = produits.find(p => p.id === value);
  const displayName = (p: any) => [p.marque, p.nomProduit].filter(Boolean).join(' ');

  const [mode, setMode] = useState<'nom' | 'code'>('nom');
  const [query, setQuery]     = useState(() => (selected ? displayName(selected) : ''));
  const [codeFam, setCodeFam] = useState('');
  const [codeProd, setCodeProd] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = produits.find(p => p.id === value);
    setQuery(p ? displayName(p) : '');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        const p = produits.find(p => p.id === value);
        setQuery(p ? displayName(p) : '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value, produits]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(() => {
    if (mode === 'code') {
      const cf = codeFam.trim().toLowerCase();
      const cp = codeProd.trim().toLowerCase();
      if (!cf && !cp) return produits.slice(0, 8);
      return produits.filter(p => {
        const matchCf = !cf || (p.codeFamille ?? '').toLowerCase().startsWith(cf);
        const matchCp = !cp || (p.code ?? '').toLowerCase().startsWith(cp);
        return matchCf && matchCp;
      }).slice(0, 12);
    }
    const q = query.trim().toLowerCase();
    if (!q) return produits.slice(0, 8);
    return produits.filter(p =>
      p.nomProduit?.toLowerCase().includes(q) ||
      p.marque?.toLowerCase().includes(q) ||
      (p.codeFamille ?? '').toLowerCase().includes(q) ||
      (p.code ?? '').toLowerCase().includes(q),
    ).slice(0, 12);
  }, [mode, query, codeFam, codeProd, produits]);

  const pick = (p: any) => {
    onChange(p.id);
    setQuery(displayName(p));
    setCodeFam('');
    setCodeProd('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      {/* Mode tabs */}
      <div className="flex gap-1">
        <button type="button" onClick={() => { setMode('nom'); setOpen(true); }}
          className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${mode === 'nom' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
          Nom
        </button>
        <button type="button" onClick={() => { setMode('code'); setOpen(true); }}
          className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${mode === 'code' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
          Code
        </button>
      </div>

      {mode === 'nom' ? (
        <input type="text" value={query} autoComplete="off"
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(''); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un produit…"
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none" />
      ) : (
        <div className="flex gap-1">
          <input type="text" value={codeFam} autoComplete="off"
            onChange={e => { setCodeFam(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Famille (ex: 101)"
            className="w-1/2 px-2 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-300 outline-none" />
          <input type="text" value={codeProd} autoComplete="off"
            onChange={e => { setCodeProd(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Code (ex: 101001)"
            className="w-1/2 px-2 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-300 outline-none" />
        </div>
      )}

      {selected && (
        <div className="text-xs text-emerald-600 font-medium truncate flex items-center gap-1.5">
          <CheckCircle size={10} />
          <span>{displayName(selected)}</span>
          {(selected.codeFamille || selected.code) && (
            <span className="font-mono text-indigo-400">{selected.codeFamille ?? ''}{selected.code ? `/${selected.code}` : ''}</span>
          )}
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {suggestions.map(p => (
            <button key={p.id} type="button"
              onMouseDown={e => { e.preventDefault(); pick(p); }}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors
                ${p.id === value ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
              <div className="min-w-0">
                <div className="truncate">{displayName(p)}</div>
                {(p.codeFamille || p.code) && (
                  <div className="font-mono text-indigo-500">{p.codeFamille ?? ''}{p.code ? `/${p.code}` : ''}</div>
                )}
              </div>
              <span className="text-slate-400 shrink-0">×{p.quantiteStock}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────

export const Achats = () => {
  const { admin } = useAdminAuth();
  const canDelete  = can.deleteEntities(admin?.role);
  const canExport  = can.exportCsv(admin?.role);
  const canValider = can.validerAchat(admin?.role);

  // ── Données ──
  const [achats, setAchats]         = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [produits, setProduits]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // ── Modals ──
  const [isFormOpen, setIsFormOpen]       = useState(false);
  const [editingAchat, setEditingAchat]   = useState<any>(null);
  const [selectedAchat, setSelectedAchat] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'valider' | 'annuler'; achat: any } | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');

  // ── Formulaire ──
  const [form, setForm] = useState<FormState>({ ...FORM_INITIAL });
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [tauxLoading, setTauxLoading]     = useState(false);

  // ── CMUP Preview ──
  const [cmupPreview, setCmupPreview]     = useState<{ lignes: CmupLigne[]; totalDevise: number; totalFcfa: number } | null>(null);
  const [cmupLoading, setCmupLoading]     = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modal Prix de vente ──
  const [prixModal, setPrixModal]         = useState<any>(null);
  const [lotConfig, setLotConfig]         = useState<LotConfig>({
    fraisTransport: 0, fraisDouane: 0,
    methodeRepartition: 'POIDS',
    coeffDetailDefault: 1.3, coeffGrosDefault: 1.15,
  });
  const [lotLignes, setLotLignes]         = useState<LotLigne[]>([]);
  const [lotAvertissements, setLotAvertissements] = useState<string[]>([]);
  const [lotCalculating, setLotCalculating] = useState(false);
  const [lotSubmitting, setLotSubmitting]   = useState(false);
  const [lotCalculated, setLotCalculated]   = useState(false);

  // ── Filtres liste ──
  const [search, setSearch]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');

  // ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [a, f, p] = await Promise.all([
        achatApi.getAll(),
        fournisseurApi.getAll(),
        produitApi.getAll(),
      ]);
      setAchats(a);
      setFournisseurs(f);
      setProduits(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── CMUP Preview (debounced) ────────────────────────────────────
  const triggerCmupPreview = useCallback((f: FormState) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);

    const lignesValides = f.lignes.filter(
      l => l.produitId && l.quantite > 0 && l.prixUnitaireDevise > 0,
    );
    if (!lignesValides.length || !f.tauxVersFcfa) {
      setCmupPreview(null);
      return;
    }

    previewTimer.current = setTimeout(async () => {
      try {
        setCmupLoading(true);
        const result = await cmupApi.preview({
          devise: f.devise,
          tauxVersFcfa: f.tauxVersFcfa,
          lignes: lignesValides,
        });
        setCmupPreview(result);
      } catch { setCmupPreview(null); }
      finally { setCmupLoading(false); }
    }, 600);
  }, []);

  const updateForm = (patch: Partial<FormState>) => {
    setForm(prev => {
      const next = { ...prev, ...patch };
      triggerCmupPreview(next);
      return next;
    });
  };

  // ─── Taux auto ───────────────────────────────────────────────────
  const fetchTaux = async (devise: Devise) => {
    if (devise === 'FCFA') {
      updateForm({ tauxVersFcfa: 1, tauxAlerte: '', sourceTaux: 'API' });
      return;
    }
    try {
      setTauxLoading(true);
      const result = await tauxChangeApi.getLatest(devise);
      updateForm({
        tauxVersFcfa: Number(result.tauxVersFcfa),
        sourceTaux: result.source,
        tauxAlerte: result.alerteEcart ?? '',
      });
    } catch { /* silencieux — l'utilisateur saisit manuellement */ }
    finally { setTauxLoading(false); }
  };

  // ─── Ouvrir formulaire ───────────────────────────────────────────
  const openCreate = () => {
    setEditingAchat(null);
    setForm({ ...FORM_INITIAL });
    setCmupPreview(null);
    setIsFormOpen(true);
  };

  const openEdit = (achat: any) => {
    setEditingAchat(achat);
    setForm({
      fournisseurId: achat.fournisseurId,
      devise: achat.devise ?? 'FCFA',
      tauxVersFcfa: Number(achat.tauxChange ?? 1),
      tauxAlerte: '',
      sourceTaux: achat.sourceTaux ?? 'MANUEL',
      statutPaiement: achat.statutPaiement ?? 'NON_PAYE',
      lignes: achat.lignesAchat?.map((l: any) => ({
        produitId: l.produitId,
        quantite: l.quantite,
        prixUnitaireDevise: Number(l.prixUnitaireDevise ?? l.prixUnitaire ?? 0),
      })) ?? [{ produitId: '', quantite: 1, prixUnitaireDevise: 0 }],
    });
    setCmupPreview(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAchat(null);
    setCmupPreview(null);
  };

  // ─── Gestion des lignes ──────────────────────────────────────────
  const addLigne = () =>
    updateForm({ lignes: [...form.lignes, { produitId: '', quantite: 1, prixUnitaireDevise: 0 }] });

  const removeLigne = (i: number) =>
    updateForm({ lignes: form.lignes.filter((_, idx) => idx !== i) });

  const updateLigne = (i: number, patch: Partial<LigneForme>) => {
    const next = form.lignes.map((l, idx) => idx === i ? { ...l, ...patch } : l);
    // Si le produit change, on peut pré-remplir le prix avec le dernier coût connu
    if (patch.produitId) {
      const p = produits.find(p => p.id === patch.produitId);
      if (p && !next[i].prixUnitaireDevise) {
        next[i].prixUnitaireDevise = Number(p.dernierCoutAchatFcfa ?? p.prixGros ?? 0);
      }
    }
    updateForm({ lignes: next });
  };

  // ─── Soumission formulaire ───────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lignesValides = form.lignes.filter(l => l.produitId && l.quantite > 0);
    if (!lignesValides.length) {
      alert('Ajoutez au moins une ligne produit valide.');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        fournisseurId: form.fournisseurId,
        devise: form.devise,
        tauxVersFcfa: form.tauxVersFcfa,
        sourceTaux: form.sourceTaux,
        statutPaiement: form.statutPaiement,
        lignesAchat: lignesValides,
      };
      if (editingAchat) {
        await achatApi.update(editingAchat.id, { fournisseurId: payload.fournisseurId, statutPaiement: payload.statutPaiement });
      } else {
        await achatApi.create(payload);
      }
      await fetchData();
      closeForm();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert('Erreur : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Actions Valider / Annuler ───────────────────────────────────
  const handleValider = async () => {
    if (!confirmAction) return;
    try {
      setIsSubmitting(true);
      const updated = await achatApi.valider(confirmAction.achat.id);
      setAchats(prev => prev.map(a => a.id === updated.id ? updated : a));
      setConfirmAction(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert('Erreur : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    } finally { setIsSubmitting(false); }
  };

  const handleAnnuler = async () => {
    if (!confirmAction) return;
    try {
      setIsSubmitting(true);
      await achatApi.annuler(confirmAction.achat.id, motifAnnulation || undefined);
      await fetchData();
      setConfirmAction(null);
      setMotifAnnulation('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert('Erreur : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce brouillon ?')) return;
    try {
      await achatApi.delete(id);
      setAchats(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert('Erreur : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    }
  };

  // ─── Modal Prix de vente ─────────────────────────────────────────
  const openPrixModal = (achat: any) => {
    const defaultCoeffDetail = 1.3;
    const defaultCoeffGros   = 1.15;
    const lignes: LotLigne[] = (achat.lignesAchat ?? []).map((l: any) => {
      const poidsProduit  = l.produit?.poids  != null ? l.produit.poids  : '';
      const volumeProduit = l.produit?.volume != null ? l.produit.volume : '';
      return {
        ligneAchatId: l.id,
        produitId: l.produitId,
        nomProduit: l.produit?.nomProduit ?? 'Produit',
        quantite: l.quantite,
        cmup: Number(l.produit?.cmupActuel ?? 0),
        poidsOuVolume: poidsProduit !== '' ? poidsProduit : volumeProduit !== '' ? volumeProduit : '',
        autofill: poidsProduit !== '' || volumeProduit !== '',
        chargeUnitaire: 0,
        coeffDetail: l.coeffDetail ?? defaultCoeffDetail,
        coeffGros: l.coeffGros ?? defaultCoeffGros,
        prixDetailSuggere: 0,
        prixGrosSuggere: 0,
        prixDetailFinal: '',
        prixGrosFinal: '',
      };
    });
    setLotLignes(lignes);
    setLotConfig({ fraisTransport: 0, fraisDouane: 0, methodeRepartition: 'POIDS', coeffDetailDefault: defaultCoeffDetail, coeffGrosDefault: defaultCoeffGros });
    setLotAvertissements([]);
    setLotCalculated(false);
    setPrixModal(achat);
  };

  const calculerPrix = async () => {
    if (!prixModal) return;
    setLotCalculating(true);
    setLotAvertissements([]);
    try {
      const dto = {
        fraisTransport: lotConfig.fraisTransport,
        fraisDouane: lotConfig.fraisDouane,
        methodeRepartition: lotConfig.methodeRepartition,
        coeffDetailDefault: lotConfig.coeffDetailDefault,
        coeffGrosDefault: lotConfig.coeffGrosDefault,
        lignes: lotLignes.map(l => ({
          produitId: l.produitId,
          quantite: l.quantite,
          prixUnitaireDevise: (prixModal.lignesAchat ?? []).find((la: any) => la.id === l.ligneAchatId)?.prixUnitaireDevise ?? 0,
          poidsOuVolume: l.poidsOuVolume === '' ? undefined : Number(l.poidsOuVolume),
          coeffDetail: l.coeffDetail,
          coeffGros: l.coeffGros,
        })),
      };
      const res = await achatApi.calculerLot(prixModal.id, dto);
      setLotLignes(prev => prev.map(l => {
        const r = (res.resultats ?? []).find((x: any) => x.produitId === l.produitId);
        if (!r) return l;
        return {
          ...l,
          chargeUnitaire: r.chargeUnitaire ?? 0,
          prixDetailSuggere: r.prixDetailSuggere ?? 0,
          prixGrosSuggere: r.prixGrosSuggere ?? 0,
          prixDetailFinal: r.prixDetailSuggere ?? '',
          prixGrosFinal: r.prixGrosSuggere ?? '',
        };
      }));
      setLotAvertissements(res.avertissements ?? []);
      setLotCalculated(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert('Erreur calcul : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    } finally {
      setLotCalculating(false);
    }
  };

  const validerAvecPrix = async () => {
    if (!prixModal) return;
    setLotSubmitting(true);
    try {
      await achatApi.validerLot(prixModal.id, {
        lignes: lotLignes.map(l => ({
          ligneAchatId: l.ligneAchatId,
          poidsOuVolume: l.poidsOuVolume === '' ? undefined : Number(l.poidsOuVolume),
          coeffDetail: l.coeffDetail,
          coeffGros: l.coeffGros,
          prixDetailFinal: Number(l.prixDetailFinal) || 0,
          prixGrosFinal: Number(l.prixGrosFinal) || 0,
        })),
      });
      await fetchData();
      setPrixModal(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert('Erreur validation : ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    } finally {
      setLotSubmitting(false);
    }
  };

  const manquePoids = lotLignes.filter(l => l.poidsOuVolume === '').length;
  const peutValider = lotCalculated && manquePoids === 0 && lotLignes.every(l => Number(l.prixDetailFinal) > 0 && Number(l.prixGrosFinal) > 0);

  // ─── Export CSV ──────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ['ID', 'Fournisseur', 'Devise', 'Total devise', 'Total FCFA', 'Date', 'Statut achat', 'Statut paiement'];
    const rows = filtered.map(a => [
      a.id.substring(0, 8),
      `"${a.fournisseur?.nomEntreprise ?? 'N/A'}"`,
      a.devise ?? 'FCFA',
      Number(a.montantTotalDevise ?? a.montantTotal ?? 0),
      Number(a.montantTotalFcfa ?? a.montantTotal ?? 0),
      new Date(a.dateAchat).toLocaleDateString('fr-FR'),
      a.statutAchat ?? 'VALIDE',
      a.statutPaiement,
    ]);
    const csv = '﻿' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `achats_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // ─── Filtre / tri ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = achats;
    if (statutFilter) r = r.filter(a => (a.statutAchat ?? 'VALIDE') === statutFilter);
    if (dateFrom) { const d = new Date(dateFrom); d.setHours(0,0,0,0); r = r.filter(a => new Date(a.dateAchat) >= d); }
    if (dateTo)   { const d = new Date(dateTo);   d.setHours(23,59,59,999); r = r.filter(a => new Date(a.dateAchat) <= d); }
    if (search.trim()) r = r.filter(a => (a.fournisseur?.nomEntreprise ?? '').toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [achats, search, dateFrom, dateTo, statutFilter]);

  const formatProduitsShort = (lignes: any[]) => {
    if (!lignes?.length) return '—';
    const first = lignes[0];
    const txt = `${first.produit?.nomProduit ?? 'Produit'} ×${first.quantite}`;
    return lignes.length === 1 ? txt : `${txt} +${lignes.length - 1} autre${lignes.length > 2 ? 's' : ''}`;
  };

  // ─── Totaux formulaire ───────────────────────────────────────────
  const totaux = useMemo(() => {
    if (cmupPreview) {
      return { devise: cmupPreview.totalDevise, fcfa: cmupPreview.totalFcfa };
    }
    let devise = 0, fcfa = 0;
    for (const l of form.lignes) {
      const sub = (l.prixUnitaireDevise || 0) * (l.quantite || 0);
      devise += sub;
      fcfa   += form.devise === 'FCFA' ? sub : sub * form.tauxVersFcfa;
    }
    return { devise, fcfa };
  }, [form.lignes, form.tauxVersFcfa, form.devise, cmupPreview]);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Achats & Réapprovisionnements</h1>
          <p className="text-sm text-slate-500 mt-1">Multi-devises (FCFA / NGN / CNY) — BROUILLON → VALIDE</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouvel achat</span>
        </button>
      </div>

      {/* ─── Modal confirmation valider/annuler ─────────────────── */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              {confirmAction.type === 'valider' ? (
                <>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-emerald-500" size={28} />
                    <h2 className="text-lg font-bold text-slate-800">Valider l'achat ?</h2>
                  </div>
                  <p className="text-sm text-slate-600">
                    Définissez les <strong>frais, poids et coefficients</strong> pour calculer les prix de vente suggérés avant validation.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                    <button onClick={() => { setConfirmAction(null); openPrixModal(confirmAction!.achat); }}
                      className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                      Définir les prix →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <XCircle className="text-red-500" size={28} />
                    <h2 className="text-lg font-bold text-slate-800">Annuler le brouillon ?</h2>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Motif (optionnel)</label>
                    <input type="text" value={motifAnnulation} onChange={e => setMotifAnnulation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Ex : commande annulée par le fournisseur" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => { setConfirmAction(null); setMotifAnnulation(''); }}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Retour</button>
                    <button onClick={handleAnnuler} disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                      {isSubmitting ? "Annulation…" : "Confirmer l’annulation"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modal détail achat ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedAchat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Achat #{selectedAchat.id.substring(0, 8)}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {statutAchatBadge(selectedAchat.statutAchat ?? 'VALIDE')}
                    {statutPaiementBadge(selectedAchat.statutPaiement)}
                  </div>
                </div>
                <button onClick={() => setSelectedAchat(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Infos générales */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    ['Fournisseur', selectedAchat.fournisseur?.nomEntreprise ?? 'N/A'],
                    ['Date', new Date(selectedAchat.dateAchat).toLocaleDateString('fr-FR')],
                    ['Devise', selectedAchat.devise ?? 'FCFA'],
                    ['Taux', selectedAchat.devise === 'FCFA' ? '1.000000' : fmt(selectedAchat.tauxChange)],
                    ['Total devise', `${fmt(selectedAchat.montantTotalDevise ?? selectedAchat.montantTotal)} ${selectedAchat.devise ?? 'FCFA'}`],
                    ['Total FCFA', `${fmt(selectedAchat.montantTotalFcfa ?? selectedAchat.montantTotal)} FCFA`],
                    selectedAchat.validatedAt ? ['Validé le', new Date(selectedAchat.validatedAt).toLocaleDateString('fr-FR')] : null,
                    selectedAchat.annuleeAt ? ['Annulé le', new Date(selectedAchat.annuleeAt).toLocaleDateString('fr-FR')] : null,
                  ].filter(Boolean).map(([label, val], i) => (
                    <div key={i}>
                      <p className="text-xs text-slate-500 font-medium">{label}</p>
                      <p className="font-semibold text-slate-900 text-sm">{val}</p>
                    </div>
                  ))}
                </div>
                {/* Motif annulation */}
                {selectedAchat.motifAnnulation && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
                    <strong>Motif annulation :</strong> {selectedAchat.motifAnnulation}
                  </div>
                )}

                {/* ── Config lot prix de vente (VALIDE seulement) ── */}
                {(selectedAchat.statutAchat ?? 'VALIDE') === 'VALIDE' && (() => {
                  const methode: MethodeRepartition = selectedAchat.methodeRepartition ?? 'POIDS';
                  const unite = methode === 'POIDS' ? 'kg' : 'cm³';
                  const lignes: any[] = selectedAchat.lignesAchat ?? [];
                  const totalPV = lignes.reduce((acc: number, l: any) => {
                    const pv = methode === 'POIDS' ? (l.poidsUtilise ?? 0) : (l.volumeUtilise ?? 0);
                    return acc + pv * l.quantite;
                  }, 0);
                  const tauxTransport = Number(selectedAchat.fraisTransport ?? 0);
                  const tauxDouane    = Number(selectedAchat.fraisDouane    ?? 0);
                  const tauxTotal     = tauxTransport + tauxDouane;
                  const totalTransport = tauxTransport * totalPV;
                  const totalDouane    = tauxDouane    * totalPV;
                  const totalCharges   = tauxTotal     * totalPV;
                  const hasLotData = tauxTransport > 0 || tauxDouane > 0 || totalPV > 0;
                  if (!hasLotData) return null;
                  return (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-indigo-800 text-sm uppercase tracking-wide">Frais de lot</h3>
                        <span className="text-xs text-indigo-500 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">
                          Répartition par {methode} · Total lot : {totalPV.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} {unite}
                        </span>
                      </div>

                      {/* Grille taux → totaux */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* Transport */}
                        <div className="bg-white rounded-lg p-3 border border-indigo-100 space-y-1">
                          <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Transport</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-slate-800">{tauxTransport.toLocaleString('fr-FR')}</span>
                            <span className="text-xs text-slate-500">FCFA/{unite}</span>
                          </div>
                          <div className="border-t border-indigo-50 pt-1 flex items-baseline gap-1">
                            <span className="text-sm font-semibold text-indigo-700">{totalTransport.toLocaleString('fr-FR')}</span>
                            <span className="text-xs text-slate-500">FCFA total</span>
                          </div>
                          {totalPV > 0 && <p className="text-xs text-slate-400">{tauxTransport} × {totalPV.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} {unite}</p>}
                        </div>

                        {/* Douane */}
                        <div className="bg-white rounded-lg p-3 border border-indigo-100 space-y-1">
                          <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Douane</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-slate-800">{tauxDouane.toLocaleString('fr-FR')}</span>
                            <span className="text-xs text-slate-500">FCFA/{unite}</span>
                          </div>
                          <div className="border-t border-indigo-50 pt-1 flex items-baseline gap-1">
                            <span className="text-sm font-semibold text-indigo-700">{totalDouane.toLocaleString('fr-FR')}</span>
                            <span className="text-xs text-slate-500">FCFA total</span>
                          </div>
                          {totalPV > 0 && <p className="text-xs text-slate-400">{tauxDouane} × {totalPV.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} {unite}</p>}
                        </div>

                        {/* Total charges */}
                        <div className="bg-indigo-600 rounded-lg p-3 space-y-1">
                          <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wide">Total charges</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-white">{tauxTotal.toLocaleString('fr-FR')}</span>
                            <span className="text-xs text-indigo-200">FCFA/{unite}</span>
                          </div>
                          <div className="border-t border-indigo-500 pt-1 flex items-baseline gap-1">
                            <span className="text-sm font-bold text-white">{totalCharges.toLocaleString('fr-FR')}</span>
                            <span className="text-xs text-indigo-200">FCFA total</span>
                          </div>
                          {totalPV > 0 && <p className="text-xs text-indigo-300">{tauxTotal} × {totalPV.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} {unite}</p>}
                        </div>
                      </div>

                      {/* Coefficients */}
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-xs text-indigo-500 font-medium">Coeff détail (défaut) </span>
                          <span className="font-bold text-slate-800">×{Number(selectedAchat.coeffDetailDefault ?? 1.3).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-indigo-500 font-medium">Coeff gros (défaut) </span>
                          <span className="font-bold text-slate-800">×{Number(selectedAchat.coeffGrosDefault ?? 1.15).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Lignes */}
                {selectedAchat.lignesAchat?.length > 0 && (() => {
                  const isValide = (selectedAchat.statutAchat ?? 'VALIDE') === 'VALIDE';
                  const hasPrix  = isValide && selectedAchat.lignesAchat.some((l: any) => l.prixDetailFinal != null);
                  const methodeL: MethodeRepartition = selectedAchat.methodeRepartition ?? 'POIDS';
                  const uniteL   = methodeL === 'POIDS' ? 'kg' : 'cm³';
                  const tauxTotalL = Number(selectedAchat.fraisTransport ?? 0) + Number(selectedAchat.fraisDouane ?? 0);
                  const hasCharge  = hasPrix && tauxTotalL > 0;
                  return (
                  <div>
                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Package size={15} />Produits</h3>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                          <th className="px-4 py-2">Produit</th>
                          <th className="px-4 py-2 text-center">Qté</th>
                          <th className="px-4 py-2 text-right">P.U. devise</th>
                          <th className="px-4 py-2 text-right">P.U. FCFA</th>
                          <th className="px-4 py-2 text-right">CMUP avant</th>
                          <th className="px-4 py-2 text-right">CMUP après</th>
                          {hasCharge && <th className="px-4 py-2 text-right">{uniteL}/unité</th>}
                          {hasCharge && <th className="px-4 py-2 text-right">Charge/unité</th>}
                          {hasPrix && <th className="px-4 py-2 text-right">Coeff det/gros</th>}
                          {hasPrix && <th className="px-4 py-2 text-right">Prix détail</th>}
                          {hasPrix && <th className="px-4 py-2 text-right">Prix gros</th>}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedAchat.lignesAchat.map((l: any, i: number) => {
                            const pv = methodeL === 'POIDS' ? (l.poidsUtilise ?? null) : (l.volumeUtilise ?? null);
                            const chargeUnitCalc = pv != null ? tauxTotalL * pv : null;
                            return (
                            <tr key={l.id ?? i}>
                              <td className="px-4 py-2 font-medium text-slate-900">{l.produit?.nomProduit ?? '—'}</td>
                              <td className="px-4 py-2 text-center">{l.quantite}</td>
                              <td className="px-4 py-2 text-right">{fmt(l.prixUnitaireDevise ?? l.prixUnitaire)}</td>
                              <td className="px-4 py-2 text-right">{fmt(l.prixUnitaireFcfa ?? l.prixUnitaire)}</td>
                              <td className="px-4 py-2 text-right text-slate-500">{l.cmupAvant != null ? fmt(l.cmupAvant) : '—'}</td>
                              <td className="px-4 py-2 text-right font-semibold text-primary">{l.cmupApres != null ? fmt(l.cmupApres) : '—'}</td>
                              {hasCharge && (
                                <td className="px-4 py-2 text-right text-slate-500">
                                  {pv != null ? `${pv} ${uniteL}` : '—'}
                                </td>
                              )}
                              {hasCharge && (
                                <td className="px-4 py-2 text-right text-amber-700 font-medium">
                                  {chargeUnitCalc != null ? `${Math.round(chargeUnitCalc * 100) / 100} FCFA` : '—'}
                                </td>
                              )}
                              {hasPrix && (
                                <td className="px-4 py-2 text-right text-slate-500 text-xs">
                                  {l.coeffDetail != null ? `×${Number(l.coeffDetail).toFixed(2)} / ×${Number(l.coeffGros ?? 0).toFixed(2)}` : '—'}
                                </td>
                              )}
                              {hasPrix && (
                                <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                                  {l.prixDetailFinal != null ? fmt(l.prixDetailFinal) : '—'}
                                </td>
                              )}
                              {hasPrix && (
                                <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                                  {l.prixGrosFinal != null ? fmt(l.prixGrosFinal) : '—'}
                                </td>
                              )}
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modal formulaire ────────────────────────────────────── */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingAchat ? `Modifier brouillon #${editingAchat.id.substring(0,8)}` : 'Nouvel achat (brouillon)'}
                </h2>
                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
                <div className="p-6 overflow-y-auto space-y-6 flex-1">

                  {/* Section 1 — Fournisseur + devise */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur *</label>
                      <select required value={form.fournisseurId}
                        onChange={e => {
                          const f = fournisseurs.find(f => f.id === e.target.value);
                          updateForm({ fournisseurId: e.target.value, devise: f?.deviseDefaut ?? 'FCFA' });
                          if (f?.deviseDefaut && f.deviseDefaut !== 'FCFA') fetchTaux(f.deviseDefaut);
                        }}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        disabled={!!editingAchat}>
                        <option value="">Sélectionner…</option>
                        {fournisseurs.map(f => (
                          <option key={f.id} value={f.id}>{f.nomEntreprise} {f.deviseDefaut && f.deviseDefaut !== 'FCFA' ? `(${f.deviseDefaut})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Devise *</label>
                      <select value={form.devise}
                        onChange={e => { const d = e.target.value as Devise; updateForm({ devise: d }); fetchTaux(d); }}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        disabled={!!editingAchat}>
                        {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Section 2 — Taux (si non FCFA) */}
                  {form.devise !== 'FCFA' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Taux de change ({form.devise} → FCFA)</span>
                        <button type="button" onClick={() => fetchTaux(form.devise)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                          <RefreshCw size={13} className={tauxLoading ? 'animate-spin' : ''} />Actualiser
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">1 {form.devise} =</label>
                          <div className="flex items-center gap-2">
                            <input type="number" step="0.000001" min="0.000001" required
                              value={form.tauxVersFcfa}
                              onChange={e => updateForm({ tauxVersFcfa: parseFloat(e.target.value) || 0, sourceTaux: 'MANUEL' })}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                            <span className="text-sm text-slate-500 whitespace-nowrap">FCFA</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Source</label>
                          <select value={form.sourceTaux} onChange={e => updateForm({ sourceTaux: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                            {['API','MANUEL','BANQUE','BUREAU_CHANGE','AUTRE'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      {form.tauxAlerte && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          <span>{form.tauxAlerte}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 3 — Statut paiement */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Statut paiement</label>
                      <select value={form.statutPaiement} onChange={e => updateForm({ statutPaiement: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm">
                        {STATUTS_PAIEMENT.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Section 4 — Lignes produits */}
                  {!editingAchat && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Package size={14} />Produits</h3>
                        <button type="button" onClick={addLigne}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20">
                          <Plus size={13} />Ajouter une ligne
                        </button>
                      </div>
                      <div className="space-y-2">
                        {form.lignes.map((ligne, i) => {
                          const produit = produits.find(p => p.id === ligne.produitId);
                          const sousTotalDevise = ligne.prixUnitaireDevise * ligne.quantite;
                          const sousTotalFcfa = form.devise === 'FCFA' ? sousTotalDevise : sousTotalDevise * form.tauxVersFcfa;
                          return (
                            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-50 rounded-xl p-3">
                              <div className="col-span-12 sm:col-span-4">
                                {i === 0 && <label className="block text-xs text-slate-500 mb-1">Produit</label>}
                                <ProduitSearch
                                  value={ligne.produitId}
                                  produits={produits}
                                  onChange={produitId => updateLigne(i, { produitId })}
                                />
                              </div>
                              <div className="col-span-4 sm:col-span-2">
                                {i === 0 && <label className="block text-xs text-slate-500 mb-1">Quantité</label>}
                                <input type="number" min="1" value={ligne.quantite}
                                  onChange={e => updateLigne(i, { quantite: parseInt(e.target.value) || 1 })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                              <div className="col-span-5 sm:col-span-3">
                                {i === 0 && <label className="block text-xs text-slate-500 mb-1">Prix unit. ({form.devise})</label>}
                                <input type="number" min="0" step="0.01" value={ligne.prixUnitaireDevise}
                                  onChange={e => updateLigne(i, { prixUnitaireDevise: parseFloat(e.target.value) || 0 })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                              <div className="col-span-12 sm:col-span-2 text-right">
                                {i === 0 && <div className="text-xs text-slate-500 mb-1">S-total FCFA</div>}
                                <div className="text-xs font-semibold text-slate-700 py-2">{fmt(sousTotalFcfa)}</div>
                              </div>
                              <div className="col-span-3 sm:col-span-1 flex justify-end">
                                {form.lignes.length > 1 && (
                                  <button type="button" onClick={() => removeLigne(i)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                    <Minus size={14} />
                                  </button>
                                )}
                              </div>
                              {produit && (
                                <div className="col-span-12 text-xs text-slate-500 flex gap-4 px-1">
                                  <span>CMUP actuel: <strong>{fmt(produit.cmupActuel ?? 0)} FCFA</strong></span>
                                  <span>Stock: <strong>{produit.quantiteStock}</strong></span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 5 — CMUP Preview */}
                  {!editingAchat && (cmupLoading || cmupPreview) && (
                    <div className="border border-primary/20 bg-primary/5 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-primary mb-3">
                        Simulation CMUP {cmupLoading && <span className="text-xs font-normal ml-2 text-slate-500">calcul…</span>}
                      </h3>
                      {cmupPreview && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead><tr className="text-slate-500 font-semibold uppercase">
                              <th className="pb-2">Produit</th>
                              <th className="pb-2 text-center">Entrée</th>
                              <th className="pb-2 text-right">CMUP avant</th>
                              <th className="pb-2 text-right">CMUP après</th>
                              <th className="pb-2 text-right">Stock avant</th>
                              <th className="pb-2 text-right">Stock après</th>
                            </tr></thead>
                            <tbody className="divide-y divide-primary/10">
                              {cmupPreview.lignes.map((l, i) => (
                                <tr key={i}>
                                  <td className="py-1.5 font-medium text-slate-800">{l.nomProduit}</td>
                                  <td className="py-1.5 text-center">{l.quantiteEntree}</td>
                                  <td className="py-1.5 text-right text-slate-600">{fmt(l.cmupAvant)} FCFA</td>
                                  <td className="py-1.5 text-right font-bold text-primary">{fmt(l.cmupApres)} FCFA</td>
                                  <td className="py-1.5 text-right text-slate-500">{l.stockAvant}</td>
                                  <td className="py-1.5 text-right font-semibold">{l.stockApres}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Totaux récap */}
                  {!editingAchat && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      {form.devise !== 'FCFA' && (
                        <div>
                          <p className="text-xs text-slate-500">Total ({form.devise})</p>
                          <p className="font-bold text-slate-900">{fmt(totaux.devise)} {form.devise}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500">Total FCFA</p>
                        <p className="font-bold text-primary">{fmt(totaux.fcfa)} FCFA</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Produits impactés</p>
                        <p className="font-bold text-slate-900">{form.lignes.filter(l => l.produitId).length}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pied de formulaire */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                  <button type="button" onClick={closeForm}
                    className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting}
                    className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? 'Enregistrement…' : editingAchat ? 'Mettre à jour' : 'Créer le brouillon'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Barre de filtres ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Rechercher par fournisseur…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="">Tous les statuts</option>
                <option value="BROUILLON">BROUILLON</option>
                <option value="VALIDE">VALIDE</option>
                <option value="ANNULE">ANNULE</option>
              </select>
              {canExport && (
                <button onClick={handleExportCSV} disabled={!filtered.length}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  <Download size={14} />CSV
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            <span className="text-sm text-slate-400">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 font-medium">Réinitialiser</button>
            )}
          </div>
        </div>

        {/* ─── Tableau desktop ─────────────────────────────────────── */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Fournisseur</th>
                <th className="px-5 py-4">Produits</th>
                <th className="px-5 py-4">Devise</th>
                <th className="px-5 py-4">Total FCFA</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Statut achat</th>
                <th className="px-5 py-4">Paiement</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-500">Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center">
                  <ShoppingBag size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun achat trouvé.</p>
                </td></tr>
              ) : filtered.map(a => {
                const statut: StatutAchat = a.statutAchat ?? 'VALIDE';
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-slate-500">{a.id.substring(0, 8)}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{a.fournisseur?.nomEntreprise ?? 'N/A'}</td>
                    <td className="px-5 py-3 text-xs text-slate-500 max-w-[160px] truncate">{formatProduitsShort(a.lignesAchat)}</td>
                    <td className="px-5 py-3 text-xs font-mono text-slate-600">
                      {a.devise ?? 'FCFA'}{a.devise && a.devise !== 'FCFA' && <span className="text-slate-400 ml-1">@{fmt(a.tauxChange)}</span>}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">{fmt(a.montantTotalFcfa ?? a.montantTotal)} FCFA</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{new Date(a.dateAchat).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3">{statutAchatBadge(statut)}</td>
                    <td className="px-5 py-3">{statutPaiementBadge(a.statutPaiement)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedAchat(a)} title="Détails"
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Eye size={15} />
                        </button>
                        {statut === 'BROUILLON' && (
                          <>
                            <button onClick={() => openEdit(a)} title="Modifier"
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Pencil size={15} />
                            </button>
                            {canValider && (
                              <button onClick={() => setConfirmAction({ type: 'valider', achat: a })} title="Valider"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                <CheckCircle size={15} />
                              </button>
                            )}
                            {canValider && (
                              <button onClick={() => setConfirmAction({ type: 'annuler', achat: a })} title="Annuler"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <XCircle size={15} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(a.id)} title="Supprimer"
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── Cards mobile ─────────────────────────────────────────── */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun achat trouvé.</p>
            </div>
          ) : filtered.map(a => {
            const statut: StatutAchat = a.statutAchat ?? 'VALIDE';
            return (
              <div key={a.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{a.fournisseur?.nomEntreprise ?? 'N/A'}</p>
                    <p className="text-xs text-slate-500 font-mono">{a.id.substring(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelectedAchat(a)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg"><Eye size={14} /></button>
                    {statut === 'BROUILLON' && canValider && (
                      <button onClick={() => setConfirmAction({ type: 'valider', achat: a })} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle size={14} /></button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-bold text-slate-900">{fmt(a.montantTotalFcfa ?? a.montantTotal)} FCFA</span>
                  <div className="flex gap-1">{statutAchatBadge(statut)}{statutPaiementBadge(a.statutPaiement)}</div>
                </div>
                <p className="text-xs text-slate-500">{a.devise ?? 'FCFA'} · {new Date(a.dateAchat).toLocaleDateString('fr-FR')}</p>
                <p className="text-xs text-slate-500 truncate"><Package size={11} className="inline mr-1" />{formatProduitsShort(a.lignesAchat)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Modal Prix de vente ─────────────────────────────────── */}
      <AnimatePresence>
        {prixModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Prix de vente — {prixModal.fournisseur?.nomEntreprise}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Configurez les frais et coefficients, calculez les prix suggérés, ajustez si besoin, puis validez.</p>
                </div>
                <button onClick={() => setPrixModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* ── Section 1 : Config lot ── */}
                {(() => {
                  const unite = lotConfig.methodeRepartition === 'POIDS' ? 'kg' : 'cm³';
                  const totalPV = lotLignes.reduce((acc, l) => acc + (l.poidsOuVolume === '' ? 0 : Number(l.poidsOuVolume)) * l.quantite, 0);
                  const totalTransport = lotConfig.fraisTransport * totalPV;
                  const totalDouane   = lotConfig.fraisDouane   * totalPV;
                  return (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Configuration du lot</h3>
                    {/* Méthode d'abord pour que le label soit correct */}
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-medium text-slate-600">Répartition par :</span>
                      {(['POIDS', 'VOLUME'] as MethodeRepartition[]).map(m => (
                        <label key={m} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="methode" checked={lotConfig.methodeRepartition === m}
                            onChange={() => { setLotConfig(c => ({ ...c, methodeRepartition: m })); setLotCalculated(false); }}
                            className="accent-primary" />
                          <span className="text-sm text-slate-700">{m === 'POIDS' ? 'Poids (kg)' : 'Volume (cm³)'}</span>
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Transport (FCFA/{unite})</label>
                        <input type="number" min={0} step={0.01} value={lotConfig.fraisTransport}
                          onChange={e => { setLotConfig(c => ({ ...c, fraisTransport: Number(e.target.value) })); setLotCalculated(false); }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white" />
                        {totalPV > 0 && lotConfig.fraisTransport > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">= {totalTransport.toLocaleString('fr-FR')} FCFA total</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Douane (FCFA/{unite})</label>
                        <input type="number" min={0} step={0.01} value={lotConfig.fraisDouane}
                          onChange={e => { setLotConfig(c => ({ ...c, fraisDouane: Number(e.target.value) })); setLotCalculated(false); }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white" />
                        {totalPV > 0 && lotConfig.fraisDouane > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">= {totalDouane.toLocaleString('fr-FR')} FCFA total</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Coeff détail (défaut)</label>
                        <input type="number" min={1.01} step={0.01} value={lotConfig.coeffDetailDefault}
                          onChange={e => setLotConfig(c => ({ ...c, coeffDetailDefault: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Coeff gros (défaut)</label>
                        <input type="number" min={1.01} step={0.01} value={lotConfig.coeffGrosDefault}
                          onChange={e => setLotConfig(c => ({ ...c, coeffGrosDefault: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white" />
                      </div>
                    </div>
                    {totalPV > 0 && (
                      <p className="text-xs text-slate-500">
                        Total {unite === 'kg' ? 'poids' : 'volume'} du lot : <strong>{totalPV.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} {unite}</strong>
                        {(lotConfig.fraisTransport > 0 || lotConfig.fraisDouane > 0) && (
                          <span> · Charges totales : <strong>{(totalTransport + totalDouane).toLocaleString('fr-FR')} FCFA</strong></span>
                        )}
                      </p>
                    )}
                  </div>
                  );
                })()}

                {/* ── Avertissements ── */}
                {lotAvertissements.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Avertissements</p>
                    {lotAvertissements.map((w, i) => (
                      <p key={i} className="text-sm text-amber-800 flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{w}</p>
                    ))}
                  </div>
                )}

                {/* ── Compteur poids manquants ── */}
                {manquePoids > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">
                      <strong>{manquePoids} produit{manquePoids > 1 ? 's' : ''}</strong> sans {lotConfig.methodeRepartition === 'POIDS' ? 'poids' : 'volume'} — remplissez les champs surlignés avant de valider.
                    </p>
                  </div>
                )}

                {/* ── Tableau produits ── */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Produit</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qté</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CMUP</th>
                        <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {lotConfig.methodeRepartition === 'POIDS' ? 'Poids (kg)' : 'Volume (m³)'}
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Coeff det.</th>
                        <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Coeff gros</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sug. détail</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sug. gros</th>
                        <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prix détail final</th>
                        <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prix gros final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const nouveaux = lotLignes.filter(l => !l.autofill);
                        const deja     = lotLignes.filter(l => l.autofill);
                        const renderRow = (l: LotLigne, idx: number) => (
                          <tr key={l.ligneAchatId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">{l.nomProduit}</td>
                            <td className="px-3 py-3 text-right text-slate-600">{l.quantite}</td>
                            <td className="px-3 py-3 text-right text-slate-600">{l.cmup.toLocaleString('fr-FR')}</td>
                            <td className="px-3 py-3">
                              <input type="number" min={0} step={0.001}
                                value={l.poidsOuVolume}
                                onChange={e => {
                                  const v = e.target.value === '' ? '' : Number(e.target.value);
                                  setLotLignes(prev => prev.map(x => x.ligneAchatId === l.ligneAchatId ? { ...x, poidsOuVolume: v } : x));
                                  setLotCalculated(false);
                                }}
                                placeholder={l.autofill ? 'auto' : 'requis'}
                                className={`w-24 px-2 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 ${l.poidsOuVolume === '' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`} />
                            </td>
                            <td className="px-3 py-3">
                              <input type="number" min={1.01} step={0.01} value={l.coeffDetail}
                                onChange={e => {
                                  setLotLignes(prev => prev.map(x => x.ligneAchatId === l.ligneAchatId ? { ...x, coeffDetail: Number(e.target.value) } : x));
                                  setLotCalculated(false);
                                }}
                                className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20" />
                            </td>
                            <td className="px-3 py-3">
                              <input type="number" min={1.01} step={0.01} value={l.coeffGros}
                                onChange={e => {
                                  setLotLignes(prev => prev.map(x => x.ligneAchatId === l.ligneAchatId ? { ...x, coeffGros: Number(e.target.value) } : x));
                                  setLotCalculated(false);
                                }}
                                className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20" />
                            </td>
                            <td className="px-3 py-3 text-right text-slate-500">
                              {l.prixDetailSuggere > 0 ? <span className="text-emerald-700 font-medium">{l.prixDetailSuggere.toLocaleString('fr-FR')}</span> : '—'}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-500">
                              {l.prixGrosSuggere > 0 ? <span className="text-emerald-700 font-medium">{l.prixGrosSuggere.toLocaleString('fr-FR')}</span> : '—'}
                            </td>
                            <td className="px-3 py-3">
                              <input type="number" min={0} value={l.prixDetailFinal}
                                onChange={e => setLotLignes(prev => prev.map(x => x.ligneAchatId === l.ligneAchatId ? { ...x, prixDetailFinal: e.target.value === '' ? '' : Number(e.target.value) } : x))}
                                className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20" />
                            </td>
                            <td className="px-3 py-3">
                              <input type="number" min={0} value={l.prixGrosFinal}
                                onChange={e => setLotLignes(prev => prev.map(x => x.ligneAchatId === l.ligneAchatId ? { ...x, prixGrosFinal: e.target.value === '' ? '' : Number(e.target.value) } : x))}
                                className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20" />
                            </td>
                          </tr>
                        );
                        return (
                          <>
                            {nouveaux.length > 0 && (
                              <>
                                <tr><td colSpan={10} className="px-4 py-2 bg-indigo-50 text-xs font-semibold text-indigo-700 uppercase tracking-wide">Nouveaux produits — poids/volume à saisir</td></tr>
                                {nouveaux.map((l, i) => renderRow(l, i))}
                              </>
                            )}
                            {deja.length > 0 && (
                              <>
                                <tr><td colSpan={10} className="px-4 py-2 bg-emerald-50 text-xs font-semibold text-emerald-700 uppercase tracking-wide">Déjà ravitaillés — poids/volume pré-rempli</td></tr>
                                {deja.map((l, i) => renderRow(l, i))}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button onClick={calculerPrix} disabled={lotCalculating || manquePoids > 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {lotCalculating ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  {lotCalculating ? 'Calcul en cours…' : 'Calculer les prix'}
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPrixModal(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                    Annuler
                  </button>
                  <button onClick={validerAvecPrix} disabled={!peutValider || lotSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    title={!lotCalculated ? 'Calculez les prix d\'abord' : manquePoids > 0 ? `${manquePoids} poids manquants` : ''}>
                    <CheckCircle size={15} />
                    {lotSubmitting ? 'Validation…' : 'Valider le lot'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
