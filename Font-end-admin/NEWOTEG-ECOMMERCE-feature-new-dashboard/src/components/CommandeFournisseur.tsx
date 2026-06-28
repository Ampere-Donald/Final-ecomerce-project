import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Truck, Plus, Sparkles, FileDown, Send, PackageCheck, X, ArrowLeft, Search, Trash2,
} from 'lucide-react';
import {
  commandeFournisseurApi, fournisseurApi, categorieApi, produitApi,
} from '../services/api';
import { Button, useToast, errorMessage, ConfirmDialog } from './ui';
import { exportBonCommandePDF, LigneBC } from '../utils/exportBonCommande';

interface Fournisseur { id: string; nomEntreprise: string; deviseDefaut?: string; }
interface Categorie { id: string; nom: string; }
interface Produit { id: string; nomProduit: string; designationEn?: string | null; categorie?: { nom?: string } | null; dernierCoutAchatFcfa?: number | null; }

interface Ligne {
  produitId: string;
  nomProduit: string;
  designationEn?: string | null;
  quantite: number;
  rate: number;
  prixNegocie: number;
}
interface BC {
  id: string; reference: string; statut: string; devise: string;
  tauxVersFcfa: number; totalDevise: number; totalFcfa: number;
  fournisseurId: string; achatId?: string | null; createdAt: string;
  lignes?: any[]; _count?: { lignes: number };
}

const STATUT_STYLE: Record<string, string> = {
  BROUILLON: 'bg-slate-200 text-slate-600',
  ENVOYEE: 'bg-blue-100 text-blue-700',
  RECUE: 'bg-emerald-100 text-emerald-700',
  ANNULEE: 'bg-red-100 text-red-600',
};
const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n || 0);
const estComposant = (p?: { categorie?: { nom?: string } | null }) =>
  (p?.categorie?.nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes('composant');

export const CommandeFournisseur = () => {
  const toast = useToast();
  const [list, setList] = useState<BC[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<BC | null>(null);

  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);

  // Création
  const [createOpen, setCreateOpen] = useState(false);
  const [fournisseurId, setFournisseurId] = useState('');
  const [catId, setCatId] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);

  const loadList = () => commandeFournisseurApi.getAll().then(setList).catch((e) => toast.show(errorMessage(e), 'error'));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      commandeFournisseurApi.getAll().then(setList).catch(() => {}),
      fournisseurApi.getAll().then((f: any[]) => setFournisseurs(f || [])).catch(() => {}),
      categorieApi.getAll().then((c: any[]) => setCategories(c || [])).catch(() => {}),
      produitApi.getAll().then((p: any[]) => setProduits(p || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const fournisseur = fournisseurs.find((f) => f.id === fournisseurId);
  const devise = fournisseur?.deviseDefaut || 'FCFA';

  const produitsFiltres = useMemo(() => {
    let arr = produits;
    if (catId) arr = arr.filter((p) => (p as any).categorieId === catId || p.categorie);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((p) => p.nomProduit.toLowerCase().includes(q) || (p.designationEn || '').toLowerCase().includes(q));
    return arr.slice(0, 40);
  }, [produits, catId, search]);

  const ajouterLigne = (p: Produit) => {
    setLignes((prev) => {
      if (prev.some((l) => l.produitId === p.id)) return prev;
      const rate = Number(p.dernierCoutAchatFcfa) || 0;
      return [...prev, { produitId: p.id, nomProduit: p.nomProduit, designationEn: p.designationEn, quantite: 1, rate, prixNegocie: rate }];
    });
  };
  const majLigne = (id: string, champ: 'quantite' | 'rate' | 'prixNegocie', val: number) =>
    setLignes((prev) => prev.map((l) => l.produitId === id ? { ...l, [champ]: Math.max(0, val) } : l));
  const retirerLigne = (id: string) => setLignes((prev) => prev.filter((l) => l.produitId !== id));

  const suggerer = async () => {
    if (!catId) { toast.show('Choisissez une catégorie pour la suggestion.', 'warning'); return; }
    try {
      const sugg = await commandeFournisseurApi.suggestions({ categorieId: catId });
      const aPrendre = (sugg || []).filter((s: any) => s.aSuggerer && s.quantiteSuggeree > 0);
      if (!aPrendre.length) { toast.show('Rien à réapprovisionner dans cette catégorie.', 'info'); return; }
      setLignes(aPrendre.map((s: any) => ({
        produitId: s.produitId, nomProduit: s.nomProduit, designationEn: s.designationEn,
        quantite: s.quantiteSuggeree, rate: Number(s.rate) || 0, prixNegocie: Number(s.rate) || 0,
      })));
      toast.show(`${aPrendre.length} article(s) suggéré(s).`, 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const totalCreation = useMemo(() => lignes.reduce((s, l) => s + l.prixNegocie * l.quantite, 0), [lignes]);

  const creer = async () => {
    if (!fournisseurId || !lignes.length) { toast.show('Fournisseur et au moins une ligne requis.', 'warning'); return; }
    setSaving(true);
    try {
      const bc = await commandeFournisseurApi.create({
        fournisseurId,
        lignes: lignes.map((l) => ({ produitId: l.produitId, quantite: l.quantite, rate: l.rate, prixNegocie: l.prixNegocie })),
      });
      setCreateOpen(false); setLignes([]); setFournisseurId(''); setCatId('');
      await loadList();
      await ouvrirDetail(bc.id);
      toast.show(`Bon ${bc.reference} créé.`, 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
    finally { setSaving(false); }
  };

  const ouvrirDetail = async (id: string) => {
    try { setDetail(await commandeFournisseurApi.getOne(id)); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  // Édition des lignes dans le détail (brouillon)
  const [editLignes, setEditLignes] = useState<Ligne[]>([]);
  useEffect(() => {
    if (detail) setEditLignes((detail.lignes || []).map((l: any) => ({
      produitId: l.produitId, nomProduit: l.nomProduit, designationEn: l.designationEn,
      quantite: l.quantite, rate: Number(l.rate), prixNegocie: Number(l.prixNegocie),
    })));
  }, [detail?.id]);

  const enregistrerDetail = async () => {
    if (!detail) return;
    try {
      const upd = await commandeFournisseurApi.update(detail.id, {
        lignes: editLignes.map((l) => ({ produitId: l.produitId, quantite: l.quantite, rate: l.rate, prixNegocie: l.prixNegocie })),
      });
      setDetail(upd); await loadList();
      toast.show('Bon mis à jour.', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const exporter = () => {
    if (!detail) return;
    const f = fournisseurs.find((x) => x.id === detail.fournisseurId);
    const lignesBC: LigneBC[] = (detail.lignes || []).map((l: any) => ({
      produitId: l.produitId, nomProduit: l.nomProduit, designationEn: l.designationEn,
      quantite: l.quantite, rate: Number(l.rate), prixNegocie: Number(l.prixNegocie), sousTotal: Number(l.sousTotal),
    }));
    // composant si au moins un produit du bon est dans une catégorie "composant"
    const compact = lignesBC.some((l) => estComposant(produits.find((p) => p.id === l.produitId)));
    exportBonCommandePDF({
      reference: detail.reference, fournisseurNom: f?.nomEntreprise || '—',
      devise: detail.devise, tauxVersFcfa: Number(detail.tauxVersFcfa),
      totalDevise: Number(detail.totalDevise), createdAt: detail.createdAt, lignes: lignesBC,
    }, compact);
  };

  const envoyer = async () => {
    if (!detail) return;
    try { const u = await commandeFournisseurApi.envoyer(detail.id); setDetail({ ...detail, ...u }); await loadList(); toast.show('Bon marqué comme envoyé.', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const convertir = async () => {
    if (!detail) return;
    try { await commandeFournisseurApi.convertirAchat(detail.id); await ouvrirDetail(detail.id); await loadList(); toast.show('Bon converti en achat (brouillon). À valider dans Achats.', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
    finally { setConfirmConvert(false); }
  };

  // ── DÉTAIL ────────────────────────────────────────────────────────────────
  if (detail) {
    const brouillon = detail.statut === 'BROUILLON';
    const total = editLignes.reduce((s, l) => s + l.prixNegocie * l.quantite, 0);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <button onClick={() => setDetail(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary"><ArrowLeft size={16} /> Retour</button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-mono">{detail.reference}</h2>
            <p className="text-slate-500 text-sm">{fournisseurs.find((f) => f.id === detail.fournisseurId)?.nomEntreprise} · {detail.devise}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUT_STYLE[detail.statut]}`}>{detail.statut}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<FileDown size={16} />} onClick={exporter}>Export PDF</Button>
          {brouillon && <>
            <Button size="sm" onClick={enregistrerDetail}>Enregistrer</Button>
            <Button size="sm" variant="secondary" icon={<Send size={16} />} onClick={envoyer}>Marquer envoyé</Button>
          </>}
          {detail.statut !== 'ANNULEE' && !detail.achatId && (
            <Button size="sm" variant="primary" icon={<PackageCheck size={16} />} onClick={() => setConfirmConvert(true)}>Convertir en achat</Button>
          )}
          {detail.achatId && <span className="text-xs text-emerald-600 self-center">✓ Converti en achat</span>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Désignation</th>
                <th className="text-center px-3 py-3 font-semibold">Qté</th>
                <th className="text-right px-3 py-3 font-semibold">Rate ({detail.devise})</th>
                <th className="text-right px-3 py-3 font-semibold">Prix négocié</th>
                <th className="text-right px-4 py-3 font-semibold">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editLignes.map((l) => (
                <tr key={l.produitId} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-900">{l.designationEn || l.nomProduit}</p>
                    <p className="text-xs text-slate-400">{l.nomProduit}</p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {brouillon ? <input type="number" min={1} value={l.quantite} onChange={(e) => setEditLignes((p) => p.map((x) => x.produitId === l.produitId ? { ...x, quantite: Math.max(1, +e.target.value) } : x))} className="w-16 px-2 py-1 text-center border border-slate-200 rounded-lg outline-none focus:border-primary" /> : l.quantite}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {brouillon ? <input type="number" min={0} step="any" value={l.rate} onChange={(e) => setEditLignes((p) => p.map((x) => x.produitId === l.produitId ? { ...x, rate: Math.max(0, +e.target.value) } : x))} className="w-24 px-2 py-1 text-right border border-slate-200 rounded-lg outline-none focus:border-primary" /> : fmt(l.rate)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {brouillon ? <input type="number" min={0} step="any" value={l.prixNegocie} onChange={(e) => setEditLignes((p) => p.map((x) => x.produitId === l.produitId ? { ...x, prixNegocie: Math.max(0, +e.target.value) } : x))} className="w-24 px-2 py-1 text-right border border-emerald-200 bg-emerald-50 rounded-lg outline-none focus:border-emerald-500" /> : fmt(l.prixNegocie)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{fmt(l.prixNegocie * l.quantite)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td className="px-4 py-3">Total</td>
                <td className="px-3 py-3 text-center">{editLignes.reduce((s, l) => s + l.quantite, 0)}</td>
                <td></td><td></td>
                <td className="px-4 py-3 text-right text-primary">{fmt(total)} {detail.devise}</td>
              </tr>
              {detail.devise !== 'FCFA' && (
                <tr className="text-xs text-slate-500">
                  <td colSpan={5} className="px-4 py-2 text-right">≈ {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(total * Number(detail.tauxVersFcfa))} FCFA (taux {Number(detail.tauxVersFcfa)})</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        <ConfirmDialog open={confirmConvert} onClose={() => setConfirmConvert(false)} onConfirm={convertir}
          title="Convertir en achat ?" description="Crée un achat (brouillon) lié, avec les prix négociés. À valider ensuite dans Achats pour impacter le stock et le CMUP."
          confirmLabel="Convertir" variant="primary" />
      </motion.div>
    );
  }

  // ── LISTE ───────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Truck size={24} className="text-primary" /> Bons de commande fournisseur</h1>
          <p className="text-slate-500 text-sm">Commandez depuis le catalogue, en anglais, avec suggestion automatique.</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Nouveau bon</Button>
      </div>

      {loading ? <div className="text-center text-slate-400 py-12">Chargement…</div>
        : list.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><Truck size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun bon de commande.</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Référence</th>
                  <th className="text-left px-4 py-3 font-semibold">Fournisseur</th>
                  <th className="text-center px-3 py-3 font-semibold">Lignes</th>
                  <th className="text-right px-3 py-3 font-semibold">Total</th>
                  <th className="text-center px-3 py-3 font-semibold">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((bc) => (
                  <tr key={bc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => ouvrirDetail(bc.id)}>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{bc.reference}</td>
                    <td className="px-4 py-3">{fournisseurs.find((f) => f.id === bc.fournisseurId)?.nomEntreprise || '—'}</td>
                    <td className="px-3 py-3 text-center">{bc._count?.lignes ?? bc.lignes?.length ?? '—'}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmt(Number(bc.totalDevise))} {bc.devise}</td>
                    <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUT_STYLE[bc.statut]}`}>{bc.statut}</span></td>
                    <td className="px-4 py-3 text-slate-500">{new Date(bc.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* MODALE CRÉATION */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Nouveau bon de commande</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">— Fournisseur —</option>
                {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nomEntreprise} ({f.deviseDefaut || 'FCFA'})</option>)}
              </select>
              <select value={catId} onChange={(e) => setCatId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">— Catégorie (pour suggestion) —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <Button variant="secondary" icon={<Sparkles size={16} />} onClick={suggerer}>Suggérer le réappro</Button>
            </div>

            {/* Recherche + ajout manuel */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit à ajouter…" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
            </div>
            {search && (
              <div className="flex flex-wrap gap-2">
                {produitsFiltres.map((p) => (
                  <button key={p.id} onClick={() => ajouterLigne(p)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5">+ {p.nomProduit}</button>
                ))}
              </div>
            )}

            {/* Lignes */}
            {lignes.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr><th className="text-left px-3 py-2">Produit</th><th className="px-2 py-2">Qté</th><th className="px-2 py-2">Rate</th><th className="px-2 py-2">Négocié</th><th className="px-2 py-2">Montant</th><th></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lignes.map((l) => (
                      <tr key={l.produitId}>
                        <td className="px-3 py-2"><p className="font-medium">{l.designationEn || l.nomProduit}</p><p className="text-xs text-slate-400">{l.nomProduit}</p></td>
                        <td className="px-2 py-2"><input type="number" min={1} value={l.quantite} onChange={(e) => majLigne(l.produitId, 'quantite', +e.target.value)} className="w-16 px-2 py-1 text-center border border-slate-200 rounded-lg" /></td>
                        <td className="px-2 py-2"><input type="number" min={0} step="any" value={l.rate} onChange={(e) => majLigne(l.produitId, 'rate', +e.target.value)} className="w-20 px-2 py-1 text-right border border-slate-200 rounded-lg" /></td>
                        <td className="px-2 py-2"><input type="number" min={0} step="any" value={l.prixNegocie} onChange={(e) => majLigne(l.produitId, 'prixNegocie', +e.target.value)} className="w-20 px-2 py-1 text-right border border-emerald-200 bg-emerald-50 rounded-lg" /></td>
                        <td className="px-2 py-2 text-right font-semibold">{fmt(l.prixNegocie * l.quantite)}</td>
                        <td className="px-2 py-2"><button onClick={() => retirerLigne(l.produitId)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-6">Aucune ligne. Utilisez « Suggérer » ou la recherche.</p>}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-sm">Total : <span className="font-bold text-primary">{fmt(totalCreation)} {devise}</span></span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
                <Button onClick={creer} loading={saving} disabled={!fournisseurId || !lignes.length}>Créer le bon</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
