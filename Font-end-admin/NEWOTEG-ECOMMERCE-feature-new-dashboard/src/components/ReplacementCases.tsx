import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getApiErrorMessage, produitApi } from '../services/api';
import { caseError, caseForm, emptyCase, replacementCaseApi, verdictLabels, type CaseContext, type CaseForm, type CaseRow, type Evidence, type Piece, type Verdict } from '../services/replacementCases';

const inputClass = 'w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2 focus:outline-2 focus:outline-primary';
const buttonClass = 'rounded border border-slate-300 px-4 py-2 disabled:opacity-50';
const date = (value: string) => new Date(value).toLocaleString('fr-CM');

function PiecePicker({ label, value, onChange, optional = false }: { label: string; value: Piece | null; onChange: (piece: Piece | null) => void; optional?: boolean }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Piece[]>([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setProducts([]); setError('');
    if (query.trim().length < 2) return () => controller.abort();
    const timer = window.setTimeout(() => {
      produitApi.list({ search: query.trim(), limit: 8, includeInactive: true }, { signal: controller.signal }).then(data => {
        if (!controller.signal.aborted) setProducts(Array.isArray(data) ? data : data.data || []);
      }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e, 'Recherche indisponible. Votre sélection est conservée.')); });
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, retry]);
  return <div className="min-w-0 space-y-2">
    <label htmlFor={`${id}-search`} className="block text-sm font-medium">Chercher : {label}</label><input id={`${id}-search`} type="search" value={query} onChange={e => setQuery(e.target.value)} className={inputClass} placeholder="Au moins deux caractères" />
    <label htmlFor={`${id}-piece`} className="block text-sm font-medium">{label}</label><select id={`${id}-piece`} required={!optional} value={value?.id || ''} onChange={e => onChange(products.find(p => p.id === e.target.value) || (value?.id === e.target.value ? value : null))} className={inputClass}>
      <option value="">{optional ? 'Référence absente du catalogue' : 'Choisir la pièce'}</option>
      {value && !products.some(p => p.id === value.id) && <option value={value.id}>{value.nomProduit} — {value.code || 'Sans référence'}</option>}
      {products.map(p => <option key={p.id} value={p.id}>{p.nomProduit} — {p.code || 'Sans référence'}</option>)}
    </select>
    {error && <p role="alert" className="text-sm text-red-800">{error} <button type="button" onClick={() => setRetry(v => v + 1)} className="underline">Réessayer la recherche</button></p>}
  </div>;
}

function EvidenceDescription({ value }: { value: Evidence }) {
  const source = value.documentation;
  return <div className="min-w-0 break-words text-sm"><p><strong>{value.attribut.nomAttribut}</strong> : {value.valeur}</p>
    <p className={source.etat === 'DOCUMENTE' ? 'text-emerald-800' : 'text-amber-900'}>{source.etat === 'DOCUMENTE' ? 'Source relue' : source.obsolete ? 'Source à relire' : 'Source non documentée'}</p>
    {source.sourceDocument && <p>{source.sourceDocument} — {source.sourceRepere}</p>}
    {source.conditions && <p>Conditions : {source.conditions}</p>}
    {source.motif && <p>Note : {source.motif}</p>}
    {source.sourceUrl && /^https:\/\//.test(source.sourceUrl) && <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Consulter le document</a>}
  </div>;
}

function EvidencePicker({ piece, selected, onChange, refresh }: { piece: Piece; selected: string[]; onChange: (id: string, checked: boolean) => void; refresh: number }) {
  const [values, setValues] = useState<Evidence[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>();
  useEffect(() => { setValues([]); setNext(null); setCursor(undefined); }, [piece.id, refresh]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    replacementCaseApi.evidence(piece.id, cursor, controller.signal).then(page => {
      if (controller.signal.aborted) return;
      setValues(old => cursor ? [...old, ...page.valeurs.filter(v => !old.some(o => o.id === v.id))] : page.valeurs); setNext(page.next); setLoading(false);
    }).catch(e => { if (!controller.signal.aborted) { setError(getApiErrorMessage(e, 'Caractéristiques indisponibles. La sélection est conservée.')); setLoading(false); } });
    return () => controller.abort();
  }, [piece.id, cursor, retry, refresh]);
  return <section className="min-w-0 rounded border border-slate-200 p-4" aria-label={`Preuves de ${piece.nomProduit}`}>
    <h3 className="font-semibold break-words">{piece.nomProduit}</h3>
    {values.map(v => <label key={v.id} className="flex items-start gap-3 border-b border-slate-100 py-3"><input type="checkbox" checked={selected.includes(v.id)} disabled={!selected.includes(v.id) && selected.length >= 20} onChange={e => onChange(v.id, e.target.checked)} className="mt-1" /><EvidenceDescription value={v} /></label>)}
    {!loading && !error && !values.length && <p className="my-3 text-sm">Aucune caractéristique. Renseignez et documentez les attributs avant la relecture.</p>}
    {loading && <p role="status" className="mt-3 text-sm">Chargement des caractéristiques…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error} <button type="button" className="underline" onClick={() => setRetry(v => v + 1)}>Réessayer les caractéristiques</button></p>}
    {next && !loading && !error && <button type="button" className="mt-3 text-primary underline" onClick={() => setCursor(next)}>Charger plus de caractéristiques</button>}
  </section>;
}

export function ReplacementCases() {
  const { admin } = useAdminAuth();
  const canEdit = ['ADMIN', 'SUPER_ADMIN'].includes(admin?.role || '');
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [listError, setListError] = useState('');
  const [listRetry, setListRetry] = useState(0);
  const [filter, setFilter] = useState('');
  const [editor, setEditor] = useState<string | null>(null);
  const [context, setContext] = useState<CaseContext | null>(null);
  const [form, setForm] = useState<CaseForm>({ ...emptyCase, valeurIds: [] });
  const [pieces, setPieces] = useState<{ candidate: Piece | null; target: Piece | null }>({ candidate: null, target: null });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const readController = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!canEdit) return;
    const controller = new AbortController(); setListError('');
    replacementCaseApi.list(controller.signal).then(data => { if (!controller.signal.aborted) setRows(data); }).catch(e => { if (!controller.signal.aborted) setListError(getApiErrorMessage(e, 'Registre indisponible. Réessayez.')); });
    return () => controller.abort();
  }, [canEdit, listRetry]);
  useEffect(() => () => readController.current?.abort(), []);
  const load = async (id: string) => {
    readController.current?.abort(); const controller = new AbortController(); readController.current = controller;
    setLoading(true); setError('');
    try {
      const next = await replacementCaseApi.read(id, controller.signal);
      if (controller.signal.aborted) return false;
      setContext(next); setForm(caseForm(next)); setEditor(id);
      setPieces({ candidate: next.preuvesActuelles.products.find(p => p.id === next.candidatId) || null, target: next.preuvesActuelles.products.find(p => p.id === next.cibleId) || null });
      setDirty(false); setConfirmed(false); setConflict(false); setRefresh(v => v + 1); return true;
    } catch (e) { if (!controller.signal.aborted) setError(getApiErrorMessage(e, 'Dossier indisponible. Votre saisie est conservée.')); return false; }
    finally { if (!controller.signal.aborted) setLoading(false); }
  };
  const open = (id: string) => {
    if (busy || (dirty && !window.confirm('Quitter remplacera votre saisie non enregistrée. Continuer ?'))) return;
    readController.current?.abort(); setEditor(id); setContext(null); setError(''); setMessage(''); setConfirmed(false); setDirty(false); setConflict(false);
    setForm({ ...emptyCase, valeurIds: [] }); setPieces({ candidate: null, target: null }); setLoading(false);
    if (id !== 'new') void load(id);
    window.setTimeout(() => heading.current?.focus(), 0);
  };
  const update = (changes: Partial<CaseForm>) => { setForm(old => ({ ...old, ...changes })); setDirty(true); setConfirmed(false); setMessage(''); };
  const choose = (kind: 'candidate' | 'target', piece: Piece | null) => {
    // A changed pair never reuses evidence from the preceding pieces.
    setPieces(old => ({ ...old, [kind]: piece })); update({ [kind === 'candidate' ? 'candidatId' : 'cibleId']: piece?.id || '', valeurIds: [] });
  };
  const save = async (review: boolean) => {
    if (!canEdit || busy || conflict || loading) return;
    const invalid = caseError(form);
    if (invalid) { setError(invalid); return; }
    if (review && (!context || dirty || !confirmed || !context.sourcesSelectionRelues || form.retire || context.reluActuel)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const id = review ? context!.id : (await replacementCaseApi.save(editor === 'new' ? null : editor, form, context?.version || 0)).id;
      if (review) await replacementCaseApi.review(context!);
      setEditor(id);
      const refreshed = await load(id);
      if (!refreshed) { setConflict(true); setConfirmed(false); }
      setMessage(refreshed ? (review ? 'Relecture enregistrée pour cette référence et cet usage.' : 'Brouillon enregistré. Relisez le dossier avant de confirmer la décision.') : 'Enregistré, mais la dernière version n’a pas pu être chargée. Rechargez avant de poursuivre.');
      setListRetry(v => v + 1);
    } catch (e) {
      setConfirmed(false);
      if ((e as { response?: { status?: number } })?.response?.status === 409) { setConflict(true); setError('Le cas ou une source a changé. Votre saisie est conservée. Rechargez la dernière version avant de poursuivre.'); }
      else setError(getApiErrorMessage(e, 'Enregistrement impossible. Votre saisie est conservée.'));
    } finally { setBusy(false); }
  };
  const fields = [
    ['reference', 'Référence exacte recherchée', 255], ['application', 'Usage et conditions du montage', 500],
    ['justification', 'Motif de la décision', 1500], ['limites', 'Limites du remplacement', 1500],
    ['sourceUrl', 'Source HTTPS de la pièce recherchée', 800], ['sourceDocument', 'Document de la pièce recherchée', 200],
    ['sourceRepere', 'Page ou section de la pièce recherchée', 160], ['sourceRevision', 'Révision du document (facultatif)', 100],
  ] as const;
  const reviewable = Boolean(context && !dirty && !form.retire && !context.reluActuel && context.sourcesSelectionRelues && !conflict);
  if (!canEdit) return <p className="p-6">Ce registre est réservé aux administrateurs.</p>;
  return <main className="mx-auto max-w-6xl min-w-0 p-4 text-slate-800 sm:p-8">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Cas de remplacement</h1><p className="mt-2 text-slate-600">Décisions techniques, usage déclaré et preuves conservées.</p></div><button type="button" disabled={busy || loading} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50" onClick={() => open('new')}>Nouveau cas</button></header>
    <p className="mb-5 text-sm text-slate-600">La relecture des sources ne suffit pas à garantir un remplacement : le technicien vérifie aussi le montage, le brochage et les limites. <Link to="/attributs" className="text-primary underline">Gérer les attributs et leurs sources</Link></p>
    {editor && <section className="mb-8 min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="replacement-case-title" aria-busy={busy || loading}>
      <h2 id="replacement-case-title" ref={heading} tabIndex={-1} className="text-xl font-semibold">{editor === 'new' ? 'Préparer un remplacement' : 'Relire le dossier'}</h2>
      {error && <p role="alert" className="my-4 text-red-800">{error}</p>}
      {message && <p role="status" className="my-4">{message}</p>}
      {loading ? <p role="status" className="my-4">Chargement du dossier…</p> : editor !== 'new' && !context ? <button type="button" className="mt-4 underline" onClick={() => void load(editor)}>Réessayer le dossier</button> : <form onSubmit={(e: FormEvent) => { e.preventDefault(); void save(false); }}>
        {context && <p className="my-4 border-l-2 border-slate-300 pl-3 text-sm">{context.retire ? 'Cas retiré.' : context.reluActuel ? 'Décision relue, applicable uniquement à cet usage.' : context.obsolete ? 'La précédente relecture ne s’applique plus. Contrôlez le dossier et les sources.' : 'Brouillon : aucune décision publiée.'} Version {context.version}.{dirty && ' Modifications locales non enregistrées.'}</p>}
        <fieldset disabled={busy || conflict} className="mt-5 space-y-5">
          <div className="grid gap-5 md:grid-cols-2"><PiecePicker label="Pièce proposée" value={pieces.candidate} onChange={p => choose('candidate', p)} /><PiecePicker label="Pièce à remplacer au catalogue (facultatif)" optional value={pieces.target} onChange={p => choose('target', p)} /></div>
          <p className="text-sm text-slate-600">Conservez la référence complète, ses suffixes et sa casse. Pour une référence absente du catalogue, fournissez sa fiche d’origine.</p>
          <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, max]) => <label key={key} className={`block min-w-0 text-sm font-medium ${max === 1500 || key === 'application' ? 'sm:col-span-2' : ''}`}>{label}{max >= 1500 || key === 'application' ? <textarea rows={3} maxLength={max} required value={form[key]} onChange={e => update({ [key]: e.target.value })} className={inputClass} /> : <input type={key === 'sourceUrl' ? 'url' : 'text'} maxLength={max} required={key !== 'sourceRevision'} value={form[key]} onChange={e => update({ [key]: e.target.value })} className={inputClass} />}</label>)}</div>
          <label className="block text-sm font-medium">Décision technique<select value={form.verdict} onChange={e => update({ verdict: e.target.value as Verdict, adaptations: '' })} className={inputClass}>{Object.entries(verdictLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
          {form.verdict === 'ADAPTATION_NECESSAIRE' && <label className="block text-sm font-medium">Adaptations à effectuer<textarea required rows={3} maxLength={1500} value={form.adaptations} onChange={e => update({ adaptations: e.target.value })} className={inputClass} /></label>}
          <div><h3 className="font-semibold">Caractéristiques retenues — {form.valeurIds.length}/20</h3><p className="my-2 text-sm text-slate-600">Sélectionnez les preuves utiles de chaque pièce. Cette sélection n’est pas une vérification automatique de tous les critères nécessaires.</p>
            {form.valeurIds.length > 0 && <button type="button" className="mb-3 text-sm text-primary underline" onClick={() => update({ valeurIds: [] })}>Effacer la sélection des preuves</button>}
            <div className="grid gap-4 md:grid-cols-2">{[pieces.candidate, pieces.target].filter((p): p is Piece => Boolean(p)).map(p => <EvidencePicker key={p.id} piece={p} selected={form.valeurIds} refresh={refresh} onChange={(id, checked) => update({ valeurIds: checked ? [...form.valeurIds, id] : form.valeurIds.filter(v => v !== id) })} />)}</div>
            {context && !dirty && context.preuvesActuelles.values.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-primary">Vérifier les preuves enregistrées</summary><ul className="mt-3 space-y-3">{context.preuvesActuelles.values.map(v => <li key={v.id}><p className="font-medium">{context.preuvesActuelles.products.find(p => p.id === v.attribut.produitId)?.nomProduit}</p><EvidenceDescription value={v} /></li>)}</ul></details>}
          </div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={form.retire} onChange={e => update({ retire: e.target.checked })} className="mt-1" />Retirer ce cas des décisions visibles sur le site (l’historique reste conservé).</label>
          <div className="border-t border-slate-200 pt-4"><p className="mb-3 text-sm">Enregistrer un brouillon exige une nouvelle relecture. Les motifs, limites, adaptations et documents seront publics lorsque la décision sera relue.</p><button type="submit" className={buttonClass}>Enregistrer le brouillon</button></div>
          <div className="border-t border-slate-200 pt-4"><p className="mb-3 text-sm text-slate-600">{dirty ? 'Enregistrez vos modifications avant de relire.' : !context ? 'Enregistrez ce cas pour préparer sa relecture.' : !context.sourcesSelectionRelues ? 'Documentez les caractéristiques retenues de chaque pièce ; vérifiez aussi que les pièces sont actives et admises aux équivalences.' : context.reluActuel ? 'Ce dossier est déjà relu. Toute modification exige une nouvelle relecture.' : 'Contrôlez les documents et la suffisance des critères pour cet usage précis.'}</p>
            <label className="mb-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={!reviewable} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />J’ai relu les documents, les critères nécessaires, le montage, le brochage, les adaptations et les limites de cette décision.</label>
            <button type="button" disabled={!reviewable || !confirmed} onClick={() => void save(true)} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">Confirmer la relecture du cas</button>
          </div>
        </fieldset>
        {context && <button type="button" disabled={busy} className="mt-4 text-primary underline" onClick={() => { if ((!dirty && !conflict) || window.confirm('Recharger remplacera votre saisie locale par la dernière version enregistrée. Continuer ?')) void load(context.id); }}>Recharger la dernière version</button>}
      </form>}
      {context && context.historique.length > 0 && <div className="mt-6 border-t border-slate-200 pt-4"><h3 className="font-semibold">Historique des relectures (20 dernières au maximum)</h3>{context.historique.map(h => <details key={h.id} className="border-b border-slate-100 py-3"><summary className="cursor-pointer">Version {h.casVersion} — {date(h.reluLe)} — {verdictLabels[h.preuve.cas.verdict]}</summary><div className="mt-3 space-y-2 break-words text-sm"><p>Référence : {h.preuve.cas.reference}</p><p>Usage : {h.preuve.cas.application}</p><p>Motif : {h.preuve.cas.justification}</p><p>Limites : {h.preuve.cas.limites}</p>{h.preuve.cas.adaptations && <p>Adaptations : {h.preuve.cas.adaptations}</p>}<p>Source d’origine : {h.preuve.cas.sourceDocument} — {h.preuve.cas.sourceRepere}{h.preuve.cas.sourceRevision && ` — ${h.preuve.cas.sourceRevision}`}</p>{/^https:\/\//.test(h.preuve.cas.sourceUrl) && <a href={h.preuve.cas.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Document d’origine conservé</a>}{h.preuve.values.map(v => <div key={v.id} className="border-l-2 border-slate-200 pl-3"><p>{h.preuve.products.find(p => p.id === v.attribut.produitId)?.nomProduit}</p><EvidenceDescription value={v} /></div>)}</div></details>)}</div>}
    </section>}
    <label className="mb-4 block text-sm font-medium">Filtrer les 50 derniers cas<input type="search" value={filter} onChange={e => setFilter(e.target.value)} className={inputClass} /></label>
    {listError && <p role="alert" className="mb-4 text-red-800">{listError} <button type="button" className="underline" onClick={() => setListRetry(v => v + 1)}>Réessayer le registre</button></p>}
    <ul className="divide-y divide-slate-200">{rows.filter(r => `${r.reference} ${r.application}`.toLocaleLowerCase('fr').includes(filter.toLocaleLowerCase('fr'))).map(r => <li key={r.id} className="flex flex-wrap justify-between gap-4 py-4"><div className="min-w-0 break-words"><h2 className="font-semibold">{r.reference}</h2><p className="text-sm">{r.application}</p><p className="mt-1 text-sm text-slate-600">{r.retire ? 'Retiré' : r.reluLe ? `Relu le ${date(r.reluLe)} — ouvrir pour vérifier l’état actuel` : 'Brouillon'} · {verdictLabels[r.verdict]}</p></div><button type="button" disabled={busy || loading} className={`${buttonClass} shrink-0`} onClick={() => open(r.id)} aria-label={`Ouvrir le cas ${r.reference}`}>Ouvrir</button></li>)}</ul>
    {!rows.length && !listError && <p className="my-4 text-slate-600">Aucun cas chargé. Préparez un premier dossier ou <button type="button" onClick={() => setListRetry(v => v + 1)} className="underline">actualisez le registre</button>.</p>}
  </main>;
}
