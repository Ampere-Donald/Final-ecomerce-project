import { useEffect, useRef, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { createClientId } from '../utils/clientId';
const labels: Record<string, string> = { enrichi_ia_a_verifier: 'À vérifier', valide_admin: 'Validé par admin', identification_insuffisante: 'Identification insuffisante', classification_requise: 'À classer' };
type Row = { id: string; code: string; nom_produit: string; revision: number; status: string; locked: boolean };
type Text = { display_title: string; short_description: string; description: string };
type Detail = Row & { description: string | null; short_description: string | null; proposal: { proposed_changes?: Partial<Text> } | null; sources: { url?: string; organisme?: string; portee?: string }[] | null; uncertainties: string[] | null; reviewed_at: string | null; history: { id: string; action: string; created_at: string; before: {title?: string; description?: string}; after: {title?: string; description?: string} }[] };
const empty: Text = { display_title: '', short_description: '', description: '' };
const safeLink = (url?: string) => { try { const u = new URL(url || ''); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } };
export function DocumentaryReview() {
 const [search, setSearch] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
 const [rows, setRows] = useState<Row[]>([]), [total, setTotal] = useState(0), [selected, setSelected] = useState('');
 const [detail, setDetail] = useState<Detail | null>(null), [text, setText] = useState<Text>(empty);
 const [loading, setLoading] = useState(false), [loadingDetail, setLoadingDetail] = useState(false), [saving, setSaving] = useState(false);
 const [error, setError] = useState(''), [listError, setListError] = useState(''), [success, setSuccess] = useState(''), [dirty, setDirty] = useState(false), [refresh, setRefresh] = useState(0), [listRefresh, setListRefresh] = useState(0);
 const operation = useRef('');
 const operationIntent = useRef<boolean | null>(null);
 useEffect(() => {
  const controller = new AbortController(); setLoading(true); setListError('');
  const timer = setTimeout(() => { api.get('/catalogue-documentary', { params: { search, status, page }, signal: controller.signal }).then(r => {setRows(r.data.items);setTotal(r.data.total);}).catch(e => {if (!controller.signal.aborted) setListError(getApiErrorMessage(e, 'Impossible de charger les fiches.'));}).finally(() => {if (!controller.signal.aborted) setLoading(false);}); }, 250);
  return () => { clearTimeout(timer);controller.abort(); };
 }, [search, status, page, refresh, listRefresh]);
 useEffect(() => {
  if (!selected) return;
  const controller = new AbortController();setLoadingDetail(true);setDetail(null);setError('');
  api.get(`/catalogue-documentary/${selected}`, {signal:controller.signal}).then(r => {const d:Detail=r.data;setDetail(d);setText({display_title:d.nom_produit,short_description:d.short_description || '',description:d.description || ''});setDirty(false);operation.current='';}).catch(e => {if (!controller.signal.aborted) setError(getApiErrorMessage(e,'Impossible de charger cette fiche.'));}).finally(()=>{if(!controller.signal.aborted)setLoadingDetail(false);});
  return ()=>controller.abort();
 }, [selected, refresh]);
 const edit = (key: keyof Text, value: string) => {setText(t=>({...t,[key]:value}));setDirty(true);operation.current='';setSuccess('');};
 const choose = (id: string) => {if(saving || (dirty && !window.confirm('Abandonner les modifications non enregistrées ?')))return;setSelected(id);setSuccess('');};
 async function save(validate: boolean) {
  if(!detail || saving)return;setSaving(true);setError('');setSuccess('');
  if (!operation.current || operationIntent.current !== validate) operation.current = createClientId();
  operationIntent.current = validate;
  try {await api.patch(`/catalogue-documentary/${detail.id}`,{operationId:operation.current,expectedRevision:detail.revision,text,validate});setDirty(false);setSuccess(validate?'Fiche validée et protégée.':'Correction enregistrée et protégée.');setRefresh(v=>v+1);}
  catch(e){setError(getApiErrorMessage(e,'Enregistrement impossible. Vos modifications sont conservées.'));}
  finally{setSaving(false);}
 }
 const proposal=detail?.proposal?.proposed_changes;
 return <section className="space-y-6">
  <header><h1 className="text-2xl font-bold text-slate-900">Documentation produits</h1><p className="mt-2 text-slate-600">Relisez les propositions, corrigez les textes et protégez les fiches validées.</p></header>
  <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4">
   <label className="min-w-0 w-full text-sm font-medium sm:flex-1">Rechercher par référence, UUID, titre ou famille<input className="mt-2 w-full rounded-lg border border-slate-300 p-3" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} /></label>
   <label className="w-full text-sm font-medium sm:w-auto">État documentaire<select className="mt-2 block w-full rounded-lg border border-slate-300 p-3" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Tous les états</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
  </div>
  {listError && <p role="alert" className="text-red-700">{listError} <button className="underline" onClick={()=>setListRefresh(v=>v+1)}>Réessayer</button></p>}
  {success && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{success}</p>}
  <div className="grid gap-6 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
   <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-4" aria-busy={loading}>
    <p className="mb-3 text-sm text-slate-600">{loading?'Chargement…':`${total} fiche${total > 1 ? 's' : ''}`}</p>
    {!loading && !rows.length && <p>Aucune fiche pour ces critères.</p>}
    <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto xl:max-h-[42rem]">{rows.map(r=><li key={r.id}><button disabled={saving} aria-current={selected===r.id?'true':undefined} className={`w-full rounded-lg p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${selected===r.id?'bg-blue-50':'hover:bg-slate-50'}`} onClick={()=>choose(r.id)}><span className="block font-medium text-slate-900">{r.nom_produit}</span><span className="mt-1 block text-sm text-slate-600">{r.code} · {labels[r.status] || 'À classer'}{r.locked?' · Protégée':''}</span></button></li>)}</ul>
    <nav aria-label="Pagination des fiches" className="mt-4 flex items-center justify-between gap-2"><button disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>Précédent</button><span className="text-sm">{page} / {Math.max(1,Math.ceil(total/50))}</span><button disabled={page*50>=total||loading} onClick={()=>setPage(p=>p+1)}>Suivant</button></nav>
   </aside>
   <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5" aria-busy={loadingDetail}>
    {!selected && <p className="text-slate-600">Sélectionnez une fiche pour consulter ses textes et ses sources.</p>}
    {loadingDetail && <p>Chargement de la fiche…</p>}
    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}<button className="ml-2 underline" onClick={()=>{if(!dirty||window.confirm('Recharger et abandonner les modifications ?'))setRefresh(v=>v+1);}}>Recharger la fiche</button></div>}
    {detail && <div className="space-y-6">
     <header><h2 className="text-xl font-semibold">{detail.nom_produit}</h2><p className="mt-1 break-all text-sm text-slate-600">{detail.code} · {detail.id}</p><p className="mt-2 text-sm">{labels[detail.status] || 'À classer'} · Révision {detail.revision}{detail.locked?' · Protégée contre les imports automatiques':''}</p>{detail.reviewed_at&&<p className="mt-1 text-sm text-slate-600">Dernière revue : {new Date(detail.reviewed_at).toLocaleString('fr-FR')}</p>}</header>
     <details><summary className="cursor-pointer font-medium">Comparer le texte actuel et la proposition</summary><div className="mt-3 grid gap-4 md:grid-cols-2"><div><h3 className="font-medium">Actuellement publié</h3><p className="mt-2 whitespace-pre-wrap text-sm">{detail.description || 'Aucune description.'}</p></div><div><h3 className="font-medium">Proposition à relire</h3><p className="mt-2 whitespace-pre-wrap text-sm">{proposal?.description || 'Aucune proposition disponible.'}</p>{proposal?.description && <button disabled={saving} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={()=>{setText({display_title:proposal.display_title||detail.nom_produit,short_description:proposal.short_description||'',description:proposal.description||''});setDirty(true);operation.current='';}}>Utiliser comme brouillon</button>}</div></div></details>
     <form onSubmit={e=>{e.preventDefault();void save(false);}} className="space-y-4">
      <label className="block font-medium">Titre<input required maxLength={150} disabled={saving} className="mt-2 w-full rounded-lg border border-slate-300 p-3" value={text.display_title} onChange={e=>edit('display_title',e.target.value)}/></label>
      <label className="block font-medium">Description courte<textarea required maxLength={20000} disabled={saving} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-3" value={text.short_description} onChange={e=>edit('short_description',e.target.value)}/></label>
      <label className="block font-medium">Description détaillée<textarea required maxLength={50000} disabled={saving} rows={9} className="mt-2 w-full rounded-lg border border-slate-300 p-3" value={text.description} onChange={e=>edit('description',e.target.value)}/></label>
      <p className="text-sm text-slate-600">L’enregistrement protège vos corrections contre les enrichissements automatiques.</p>
      <div className="flex flex-wrap gap-3"><button disabled={saving||loadingDetail} className="rounded-lg border border-slate-300 px-4 py-3" type="submit">{saving?'Enregistrement…':'Enregistrer la correction'}</button><button disabled={saving||loadingDetail||Object.values(text).some(v=>!v.trim())} className="rounded-lg bg-blue-700 px-4 py-3 text-white" type="button" onClick={()=>void save(true)}>Valider et protéger</button></div>
     </form>
     <section><h3 className="font-semibold">Attributs techniques validés</h3><p className="mt-2 text-sm text-slate-600">Modifiez les caractéristiques avec leurs sources dans l’éditeur technique. Les propositions IA ne sont pas copiées dans les attributs.</p><a className="mt-3 inline-block text-blue-700 underline" href={`/attributs?productId=${encodeURIComponent(detail.id)}`} target="_blank" rel="noopener noreferrer">Ouvrir les attributs de cette fiche</a></section>
     <section><h3 className="font-semibold">Sources et incertitudes</h3><ul className="mt-3 space-y-2 text-sm">{(detail.sources||[]).map((s,i)=>{const url=safeLink(s.url);return <li key={i}>{url?<a className="break-all text-blue-700 underline" href={url} target="_blank" rel="noreferrer">{s.organisme || url}</a>:<span>Source sans lien public valide</span>}{s.portee&&<p className="text-slate-600">{s.portee}</p>}</li>;})}</ul>{!detail.sources?.length&&<p className="mt-2 text-sm text-slate-600">Aucune source enregistrée.</p>}<ul className="mt-3 list-inside list-disc text-sm text-amber-900">{(detail.uncertainties||[]).map((u,i)=><li key={i}>{u}</li>)}</ul></section>
     <details><summary className="cursor-pointer font-medium">Historique des 100 dernières opérations</summary>{detail.history.map(h=><div key={h.id} className="mt-3 border-t border-slate-200 pt-3 text-sm"><p>{h.action} · {new Date(h.created_at).toLocaleString('fr-FR')}</p><p className="mt-2 whitespace-pre-wrap">Avant : {h.before.description || 'Vide'}</p><p className="mt-2 whitespace-pre-wrap">Après : {h.after.description || 'Vide'}</p></div>)}</details>
    </div>}
   </article>
  </div>
 </section>;
}
