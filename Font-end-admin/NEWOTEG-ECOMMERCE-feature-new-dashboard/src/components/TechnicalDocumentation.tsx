import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../services/api';
import { sourceFields, sourceForm, sourceError, technicalDocumentationApi, type SourceContext, type SourceField, type SourceForm, type DraftState } from '../services/technicalDocumentation';

export const stateLabels = { A_VERIFIER: 'À vérifier', INCONNU: 'Inconnu', CONTRADICTOIRE: 'Contradictoire', NON_APPLICABLE: 'Non applicable', DOCUMENTE: 'Documenté après relecture' };
export function TechnicalDocumentation({ valueId, onClose }: { valueId: string; onClose: () => void }) {
  const [context, setContext] = useState<SourceContext | null>(null);
  const [form, setForm] = useState<SourceForm | null>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const load = async (signal?: AbortSignal) => {
    try {
      const next = await technicalDocumentationApi.read(valueId, signal);
      if (signal?.aborted) return false;
      setContext(next); setForm(sourceForm(next)); setConflict(false); setConfirmed(false); setError('');
      return true;
    } catch (e) { if (!signal?.aborted) setError(getApiErrorMessage(e, 'Impossible de charger la source. Réessayez.')); return false; }
  };
  useEffect(() => { const controller = new AbortController(); heading.current?.focus(); void load(controller.signal); return () => controller.abort(); }, [valueId]);
  const save = async (review: boolean) => {
    if (!context || !form || busy || conflict) return;
    const validation = sourceError(form, review);
    if (validation || (review && !confirmed)) { setError(validation || 'Confirmez votre relecture avant de documenter.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      if (review) await technicalDocumentationApi.review(valueId, context, form);
      else await technicalDocumentationApi.save(valueId, context, form);
      const refreshed = await load();
      if (!refreshed) { setConflict(true); setConfirmed(false); }
      setMessage(refreshed ? (review ? 'Relecture enregistrée. La source est documentée.' : 'Brouillon enregistré. La donnée reste à vérifier ou signalée selon son état.') : 'Enregistré, mais la dernière version n’a pas pu être chargée. Rechargez avant une nouvelle modification.');
    } catch (e: any) {
      setConfirmed(false);
      if (e?.response?.status === 409) {
        setConflict(true); setError('La valeur, le produit ou sa source a changé. Votre saisie est conservée. Copiez-la si nécessaire puis rechargez avant une nouvelle relecture.');
      } else setError(getApiErrorMessage(e, 'Enregistrement impossible. Votre saisie est conservée.'));
    } finally { setBusy(false); }
  };
  const inputClass = 'w-full border border-slate-300 rounded px-3 py-2 bg-white focus:outline-2 focus:outline-primary';
  return <section className="border border-slate-200 rounded-lg bg-white p-4 sm:p-6 mt-6" aria-labelledby="technical-source-title" aria-busy={busy}>
    <div className="flex justify-between items-start gap-4"><h2 id="technical-source-title" ref={heading} tabIndex={-1} className="text-xl font-semibold text-slate-900">Source technique</h2><button type="button" disabled={busy} onClick={onClose} className="text-primary underline">Fermer</button></div>
    {error && <p role="alert" className="my-3 text-red-800">{error}</p>}
    {message && <p role="status" className="my-3 text-slate-700">{message}</p>}
    {!context || !form ? <button type="button" onClick={() => void load()} className="mt-3 text-primary underline">{error ? 'Réessayer' : 'Chargement de la source…'}</button> : <>
      <div className="my-4 border-l-2 border-slate-300 pl-4 text-sm space-y-1"><p>{context.attribut} : <strong>{context.valeur}</strong></p><p>État actuel : {stateLabels[context.effective.etat]}</p>
        {context.effective.obsolete && <p className="text-amber-900">L’ancienne relecture ne s’applique plus. Contrôlez à nouveau la source et les conditions.</p>}
        {context.documentation && context.documentation.valeurSource !== context.valeur && <p>Ancienne valeur relue : {context.documentation.valeurSource}</p>}
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void save(false); }}>
        <fieldset disabled={busy || conflict} className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="source-state">État du brouillon</label>
          <select id="source-state" value={form.etat} onChange={e => { setForm({ ...form, etat: e.target.value as DraftState }); setConfirmed(false); }} className={inputClass}>
            {(['A_VERIFIER', 'INCONNU', 'CONTRADICTOIRE', 'NON_APPLICABLE'] as const).map(s => <option key={s} value={s}>{stateLabels[s]}</option>)}
          </select>
          <p className="text-sm text-slate-600">La valeur d’origine reste inchangée. La normalisation est facultative. Vérifiez les unités et les conditions ; aucun calcul automatique ne garantit la compatibilité.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(sourceFields).map(([key, field]) => <div key={key} className={field.max === 500 ? 'sm:col-span-2' : ''}>
              <label className="block text-sm font-medium mb-1" htmlFor={`source-${key}`}>{field.label}</label>
              {field.max === 500 ? <textarea id={`source-${key}`} rows={3} maxLength={field.max} value={form[key as SourceField]} onChange={e => { setForm({ ...form, [key]: e.target.value }); setConfirmed(false); }} className={inputClass} /> : <input id={`source-${key}`} type={key === 'sourceUrl' ? 'url' : 'text'} maxLength={field.max} value={form[key as SourceField]} onChange={e => { setForm({ ...form, [key]: e.target.value }); setConfirmed(false); }} className={inputClass} />}
            </div>)}
          </div>
          <p className="text-sm text-slate-600">La source, les conditions et la note seront visibles sur le site. L’identité de la personne qui relit reste privée. Enregistrer le brouillon retire une éventuelle validation précédente.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={form.etat !== 'A_VERIFIER'} />J’ai consulté le document indiqué et vérifié cette valeur, son unité et ses conditions.</label>
          <div className="flex flex-wrap gap-3"><button type="submit" className="border border-slate-300 rounded px-4 py-2">Enregistrer le brouillon</button><button type="button" disabled={!confirmed || form.etat !== 'A_VERIFIER'} onClick={() => void save(true)} className="bg-primary text-white rounded px-4 py-2 disabled:opacity-50">Documenter après relecture</button></div>
        </fieldset>
        {conflict && <button type="button" onClick={() => { if (window.confirm('Recharger remplacera la saisie locale par la dernière version enregistrée. Continuer ?')) void load(); }} className="text-primary underline mt-4">Recharger la dernière version</button>}
      </form>
    </>}
  </section>;
}
