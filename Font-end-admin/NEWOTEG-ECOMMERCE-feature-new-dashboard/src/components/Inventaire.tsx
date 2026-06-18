import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardList, Plus, FileText, FileDown, Check, X, ArrowLeft,
  ShieldCheck, Clock, AlertTriangle,
} from 'lucide-react';
import { inventaireApi, categorieApi, produitApi, adminAccountApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Button, useToast, errorMessage, ConfirmDialog } from './ui';
import {
  exportInventaireCSV, exportInventairePDF, PrixMap,
} from '../utils/exportInventaire';

interface LigneInv {
  id: string;
  produitId: string;
  nomProduit: string;
  codeFamille?: string | null;
  stockSysteme: number;
  stockCompte?: number | null;
  ecart?: number | null;
}
interface Inv {
  id: string;
  reference: string;
  statut: 'EN_COURS' | 'VALIDE' | 'ANNULE';
  perimetre: string;
  createdAt: string;
  viaDelegation?: boolean;
  lignes?: LigneInv[];
  _count?: { lignes: number };
}

const STATUT_STYLE: Record<string, string> = {
  EN_COURS: 'bg-amber-100 text-amber-700',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  ANNULE: 'bg-slate-200 text-slate-500',
};

export const Inventaire = () => {
  const { admin } = useAdminAuth();
  const isSuper = admin?.role === 'SUPER_ADMIN';
  const toast = useToast();

  const [list, setList] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Inv | null>(null);
  const [comptes, setComptes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmValider, setConfirmValider] = useState(false);

  const [categories, setCategories] = useState<{ id: string; nom: string }[]>([]);
  const [prixMap, setPrixMap] = useState<PrixMap>({});
  const [familles, setFamilles] = useState<string[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState<'categorie' | 'famille'>('categorie');
  const [selCat, setSelCat] = useState('');
  const [selFam, setSelFam] = useState('');

  const [delegOpen, setDelegOpen] = useState(false);

  const loadList = () =>
    inventaireApi.getAll().then(setList).catch((e) => toast.show(errorMessage(e), 'error'));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      inventaireApi.getAll().then(setList).catch(() => {}),
      categorieApi.getAll().then((c: any[]) => setCategories(c || [])).catch(() => {}),
      produitApi.getAll().then((ps: any[]) => {
        const pm: PrixMap = {};
        const fam = new Set<string>();
        (ps || []).forEach((p) => {
          pm[p.id] = { prixDetail: p.prixDetail, cmupActuel: p.cmupActuel };
          if (p.codeFamille) fam.add(p.codeFamille);
        });
        setPrixMap(pm);
        setFamilles([...fam].sort());
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const ouvrirDetail = async (id: string) => {
    try {
      const inv: Inv = await inventaireApi.getOne(id);
      setDetail(inv);
      const c: Record<string, string> = {};
      (inv.lignes || []).forEach((l) => { c[l.id] = l.stockCompte != null ? String(l.stockCompte) : ''; });
      setComptes(c);
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const creer = async () => {
    try {
      const payload = mode === 'categorie' ? { categorieId: selCat } : { codeFamille: selFam };
      if ((mode === 'categorie' && !selCat) || (mode === 'famille' && !selFam)) return;
      const inv = await inventaireApi.create(payload);
      setCreateOpen(false); setSelCat(''); setSelFam('');
      await loadList();
      await ouvrirDetail(inv.id);
      toast.show(`Inventaire ${inv.reference} créé (${inv.lignes?.length || 0} produits).`, 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const enregistrerComptage = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const lignes = (detail.lignes || [])
        .map((l) => ({ id: l.id, stockCompte: comptes[l.id] }))
        .filter((l) => l.stockCompte !== '' && l.stockCompte != null)
        .map((l) => ({ id: l.id, stockCompte: Math.max(0, parseInt(String(l.stockCompte), 10) || 0) }));
      const inv = await inventaireApi.comptage(detail.id, lignes);
      setDetail(inv);
      toast.show('Comptage enregistré.', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
    finally { setSaving(false); }
  };

  const valider = async () => {
    if (!detail) return;
    try {
      await enregistrerComptage();
      const inv = await inventaireApi.valider(detail.id);
      setDetail(inv);
      await loadList();
      toast.show(`Inventaire ${inv.reference} validé — stock ajusté.`, 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
    finally { setConfirmValider(false); }
  };

  const annuler = async () => {
    if (!detail) return;
    try { await inventaireApi.annuler(detail.id); await loadList(); setDetail(null); toast.show('Inventaire annulé.', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const invPourExport = useMemo(() => {
    if (!detail) return null;
    return {
      reference: detail.reference, perimetre: detail.perimetre, statut: detail.statut,
      lignes: (detail.lignes || []).map((l) => ({
        produitId: l.produitId, nomProduit: l.nomProduit, codeFamille: l.codeFamille,
        stockSysteme: l.stockSysteme,
        stockCompte: comptes[l.id] !== '' && comptes[l.id] != null ? parseInt(comptes[l.id], 10) : l.stockCompte,
        ecart: l.ecart,
      })),
    };
  }, [detail, comptes]);

  // ── DÉTAIL ───────────────────────────────────────────────────────────────
  if (detail) {
    const enCours = detail.statut === 'EN_COURS';
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <button onClick={() => setDetail(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
          <ArrowLeft size={16} /> Retour à la liste
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-mono">{detail.reference}</h2>
            <p className="text-slate-500 text-sm">{detail.perimetre}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUT_STYLE[detail.statut]}`}>{detail.statut.replace('_', ' ')}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<FileText size={16} />} onClick={() => invPourExport && exportInventaireCSV(invPourExport, prixMap)}>CSV</Button>
          <Button variant="secondary" size="sm" icon={<FileDown size={16} />} onClick={() => invPourExport && exportInventairePDF(invPourExport, prixMap)}>PDF</Button>
          {enCours && <>
            <Button size="sm" onClick={enregistrerComptage} loading={saving}>Enregistrer le comptage</Button>
            <Button size="sm" variant="primary" icon={<Check size={16} />} onClick={() => setConfirmValider(true)}>Valider</Button>
            <Button size="sm" variant="danger" icon={<X size={16} />} onClick={annuler}>Annuler</Button>
          </>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Produit</th>
                <th className="text-center px-3 py-3 font-semibold">Stock système</th>
                <th className="text-center px-3 py-3 font-semibold">Stock compté</th>
                <th className="text-center px-3 py-3 font-semibold">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(detail.lignes || []).map((l) => {
                const compte = comptes[l.id];
                const ecartLive = compte !== '' && compte != null ? parseInt(compte, 10) - l.stockSysteme : l.ecart;
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-900">{l.nomProduit}</p>
                      {l.codeFamille && <p className="text-xs text-slate-400">{l.codeFamille}</p>}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold">{l.stockSysteme}</td>
                    <td className="px-3 py-2 text-center">
                      {enCours ? (
                        <input type="number" min={0} value={compte ?? ''}
                          onChange={(e) => setComptes((c) => ({ ...c, [l.id]: e.target.value }))}
                          className="w-20 px-2 py-1 text-center border border-slate-200 rounded-lg outline-none focus:border-primary" />
                      ) : (l.stockCompte ?? '—')}
                    </td>
                    <td className={`px-3 py-2 text-center font-bold ${ecartLive == null ? 'text-slate-300' : ecartLive === 0 ? 'text-slate-400' : ecartLive > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {ecartLive == null ? '—' : ecartLive > 0 ? `+${ecartLive}` : ecartLive}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ConfirmDialog open={confirmValider} onClose={() => setConfirmValider(false)} onConfirm={valider}
          title="Valider l'inventaire ?"
          description="Les écarts non nuls vont générer des ajustements de stock tracés. Action irréversible."
          confirmLabel="Valider et ajuster" variant="primary" />
      </motion.div>
    );
  }

  // ── LISTE ──────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ClipboardList size={24} className="text-primary" /> Inventaire</h1>
          <p className="text-slate-500 text-sm">Comptez le stock par catégorie ou famille, puis validez les écarts.</p>
        </div>
        <div className="flex gap-2">
          {isSuper && <Button variant="secondary" icon={<ShieldCheck size={18} />} onClick={() => setDelegOpen(true)}>Délégations</Button>}
          <Button icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Nouvel inventaire</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Chargement…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun inventaire. Lancez-en un par catégorie ou famille.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Référence</th>
                <th className="text-left px-4 py-3 font-semibold">Périmètre</th>
                <th className="text-center px-3 py-3 font-semibold">Lignes</th>
                <th className="text-center px-3 py-3 font-semibold">Statut</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => ouvrirDetail(inv.id)}>
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{inv.reference}</td>
                  <td className="px-4 py-3">{inv.perimetre}</td>
                  <td className="px-3 py-3 text-center">{inv._count?.lignes ?? inv.lignes?.length ?? '—'}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUT_STYLE[inv.statut]}`}>{inv.statut.replace('_', ' ')}</span>
                    {inv.viaDelegation && <span className="ml-1 text-[10px] text-violet-600">délégué</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg">Nouvel inventaire</h3>
            <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
              <button onClick={() => setMode('categorie')} className={`flex-1 rounded-md px-3 py-2 text-sm font-bold ${mode === 'categorie' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Par catégorie</button>
              <button onClick={() => setMode('famille')} className={`flex-1 rounded-md px-3 py-2 text-sm font-bold ${mode === 'famille' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Par famille</button>
            </div>
            {mode === 'categorie' ? (
              <select value={selCat} onChange={(e) => setSelCat(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary">
                <option value="">— Choisir une catégorie —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            ) : (
              <select value={selFam} onChange={(e) => setSelFam(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary">
                <option value="">— Choisir une famille —</option>
                {familles.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button onClick={creer}>Générer</Button>
            </div>
          </div>
        </div>
      )}

      {delegOpen && isSuper && <DelegationsPanel onClose={() => setDelegOpen(false)} />}
    </motion.div>
  );
};

// ── Délégations (super admin) ────────────────────────────────────────────────
const DelegationsPanel = ({ onClose }: { onClose: () => void }) => {
  const toast = useToast();
  const [admins, setAdmins] = useState<{ id: string; nom: string; role: string }[]>([]);
  const [delegs, setDelegs] = useState<any[]>([]);
  const [adminId, setAdminId] = useState('');
  const [finAt, setFinAt] = useState('');
  const [motif, setMotif] = useState('');

  const load = () => inventaireApi.listDelegations().then(setDelegs).catch(() => {});
  useEffect(() => {
    adminAccountApi.getAll().then((a: any[]) => setAdmins((a || []).filter((u) => u.role === 'ADMIN'))).catch(() => {});
    load();
  }, []);

  const accorder = async () => {
    if (!adminId || !finAt) return;
    try {
      await inventaireApi.accorderDelegation({ adminUserId: adminId, finAt: new Date(finAt).toISOString(), motif: motif || undefined });
      setAdminId(''); setFinAt(''); setMotif('');
      await load();
      toast.show('Délégation accordée.', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const revoquer = async (id: string) => {
    try { await inventaireApi.revoquerDelegation(id); await load(); toast.show('Délégation révoquée.', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const nomAdmin = (id: string) => admins.find((a) => a.id === id)?.nom || id.slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2"><ShieldCheck size={18} className="text-primary" /> Délégations de validation</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <p className="text-xs text-slate-500">La validation d'inventaire est réservée au super admin. Vous pouvez la déléguer à un admin pour une période précise — chaque validation reste tracée.</p>

        <div className="rounded-xl border border-slate-200 p-3 space-y-2">
          <select value={adminId} onChange={(e) => setAdminId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
            <option value="">— Choisir un admin —</option>
            {admins.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">Jusqu'au</label>
            <input type="date" value={finAt} onChange={(e) => setFinAt(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
          </div>
          <input type="text" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif (optionnel)" maxLength={255} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
          <Button size="sm" onClick={accorder} disabled={!adminId || !finAt}>Accorder la délégation</Button>
        </div>

        <div className="space-y-2">
          {delegs.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Aucune délégation.</p> : delegs.map((d) => {
            const expiree = new Date(d.finAt) < new Date() || !d.active;
            return (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{nomAdmin(d.adminUserId)}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={11} /> jusqu'au {new Date(d.finAt).toLocaleDateString('fr-FR')}
                    {expiree ? <span className="text-slate-400 flex items-center gap-0.5"><AlertTriangle size={10} /> inactive</span> : <span className="text-emerald-600">active</span>}
                  </p>
                </div>
                {d.active && !expiree && <button onClick={() => revoquer(d.id)} className="text-xs font-bold text-red-600 hover:text-red-700">Révoquer</button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
