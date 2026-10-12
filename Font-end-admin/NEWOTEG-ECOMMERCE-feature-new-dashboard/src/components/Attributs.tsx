import { useEffect, useRef, useState, type FormEvent } from 'react';
import { attributApi, valeurAttributApi, produitApi, getApiErrorMessage } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { TechnicalDocumentation } from './TechnicalDocumentation';
import { readTechnicalDictionary, type TechnicalDictionary } from '../services/technicalDictionary';

type Product = { id: string; nomProduit: string; code?: string };
type Attribute = { id: string; nomAttribut: string; produitId: string; typeAttribut: 'TEXTE' | 'NOMBRE' | 'LISTE'; cleTechnique?: string | null; obligatoire?: boolean; produit?: Product };
type Value = { id: string; attributId: string; valeur: string };
const emptyAttribute = { nomAttribut: '', produitId: '', typeAttribut: 'TEXTE' as Attribute['typeAttribut'], cleTechnique: '' as NonNullable<Attribute['cleTechnique']> | '', obligatoire: false };
const fieldClass = 'w-full border border-slate-300 rounded px-3 py-2 bg-white focus:outline-2 focus:outline-primary';

export function Attributs() {
  const { admin } = useAdminAuth();
  const canEdit = ['ADMIN', 'SUPER_ADMIN'].includes(admin?.role || '');
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [values, setValues] = useState<Value[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [attributeEditor, setAttributeEditor] = useState<string | null>(null);
  const [attributeForm, setAttributeForm] = useState(emptyAttribute);
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productError, setProductError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [valueEditor, setValueEditor] = useState<string | null>(null);
  const [valueForm, setValueForm] = useState({ attributId: '', valeur: '' });
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [dictionary, setDictionary] = useState<TechnicalDictionary | null>(null);
  const [dictionaryError, setDictionaryError] = useState('');
  const [dictionaryRetry, setDictionaryRetry] = useState(0);
  const sourceTrigger = useRef<HTMLButtonElement | null>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const load = async () => {
    setLoading(true); setError('');
    try { const [a, v] = await Promise.all([attributApi.getAll(), valeurAttributApi.getAll()]); setAttributes(a); setValues(v); }
    catch (e) { setError(getApiErrorMessage(e, 'Impossible de charger les attributs et leurs valeurs. Réessayez.')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setDictionaryError('');
    attributApi.dictionary(controller.signal).then(data => {
      if (!controller.signal.aborted) setDictionary(readTechnicalDictionary(data));
    }).catch(() => {
      if (!controller.signal.aborted) setDictionaryError('Dictionnaire indisponible. Rechargez-le avant d’enregistrer un attribut. Votre saisie est conservée.');
    });
    return () => controller.abort();
  }, [dictionaryRetry]);
  useEffect(() => { editorHeading.current?.focus(); }, [attributeEditor, valueEditor]);
  useEffect(() => {
    setProducts([]); setProductError('');
    if (attributeEditor === null || productSearch.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await produitApi.list({ search: productSearch.trim(), limit: 8, includeInactive: true }, { signal: controller.signal });
        if (!controller.signal.aborted) setProducts(Array.isArray(data) ? data : data.data || []);
      } catch (e) { if (!controller.signal.aborted) setProductError(getApiErrorMessage(e, 'Recherche de produit indisponible. Réessayez.')); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [productSearch, attributeEditor]);
  const closeEditors = () => { setAttributeEditor(null); setValueEditor(null); setSourceId(null); setError(''); setMessage(''); };
  const editAttribute = (a?: Attribute) => {
    closeEditors(); setAttributeEditor(a?.id || 'new'); setSelectedProduct(a?.produit || null); setProductSearch('');
    setAttributeForm(a ? { nomAttribut: a.nomAttribut, produitId: a.produitId, typeAttribut: a.typeAttribut, cleTechnique: a.cleTechnique || '', obligatoire: Boolean(a.obligatoire) } : emptyAttribute);
  };
  const editValue = (v?: Value, a?: Attribute) => {
    closeEditors(); setValueEditor(v?.id || 'new'); setValueForm({ attributId: v?.attributId || a?.id || '', valeur: v?.valeur || '' });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!canEdit || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (attributeEditor) {
        if (!dictionary) { setError('Chargez le dictionnaire avant d’enregistrer cet attribut.'); return; }
        const body = { ...attributeForm, nomAttribut: attributeForm.nomAttribut.trim(), cleTechnique: attributeForm.cleTechnique || null };
        if (attributeEditor === 'new') await attributApi.create(body); else await attributApi.update(attributeEditor, body);
      } else if (valueEditor) {
        const body = { ...valueForm, valeur: valueForm.valeur.trim() };
        if (valueEditor === 'new') await valeurAttributApi.create(body); else await valeurAttributApi.update(valueEditor, body);
      }
      setAttributeEditor(null); setValueEditor(null); await load(); setMessage('Enregistré. Une modification exige une nouvelle relecture des sources concernées.');
    } catch (e) { setError(getApiErrorMessage(e, 'Enregistrement impossible. La saisie est conservée.')); }
    finally { setBusy(false); }
  };
  const remove = async (id: string, kind: 'attribute' | 'value') => {
    if (!canEdit || busy || !window.confirm(kind === 'attribute' ? 'Supprimer cet attribut, ses valeurs et leurs sources ?' : 'Supprimer cette valeur et sa source ?')) return;
    setBusy(true); setError('');
    try { if (kind === 'attribute') await attributApi.delete(id); else await valeurAttributApi.delete(id); closeEditors(); await load(); }
    catch (e) { setError(getApiErrorMessage(e, 'Suppression impossible. Réessayez.')); }
    finally { setBusy(false); }
  };
  const filtered = attributes.filter(a => `${a.nomAttribut} ${a.produit?.nomProduit || ''} ${a.produit?.code || ''}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  return <div className="p-4 sm:p-8 max-w-6xl mx-auto text-slate-800">
    <header className="flex flex-wrap justify-between items-start gap-4 mb-6"><div><h1 className="text-2xl font-semibold">Attributs techniques</h1><p className="text-slate-600 mt-2">Reliez chaque caractéristique à un produit et conservez sa source.</p></div>{canEdit && <button type="button" disabled={busy} onClick={() => editAttribute()} className="bg-primary text-white px-4 py-2 rounded">Ajouter un attribut</button>}</header>
    {!canEdit && <p className="mb-4 text-slate-600">Consultation uniquement. La modification et la relecture sont réservées aux administrateurs.</p>}
    {error && <p role="alert" className="text-red-800 my-4">{error} <button type="button" onClick={() => void load()} className="underline">Recharger la liste</button></p>}
    {message && <p role="status" className="my-4">{message}</p>}
    {dictionaryError && <p role="alert" className="my-4">{dictionaryError} <button type="button" className="underline" onClick={() => setDictionaryRetry(value => value + 1)}>Recharger le dictionnaire</button></p>}
    {canEdit && (attributeEditor || valueEditor) && <section className="border border-slate-200 bg-white p-4 sm:p-6 rounded-lg mb-6">
      <h2 ref={editorHeading} tabIndex={-1} className="text-lg font-semibold mb-4">{attributeEditor ? 'Éditer un attribut' : 'Éditer une valeur'}</h2>
      <form onSubmit={submit}><fieldset disabled={busy} className="space-y-4">
        {attributeEditor ? <>
          <label className="block" htmlFor="attribute-name">Nom de l’attribut<input id="attribute-name" required maxLength={100} value={attributeForm.nomAttribut} onChange={e => setAttributeForm({ ...attributeForm, nomAttribut: e.target.value })} className={fieldClass} /></label>
          <label className="block" htmlFor="attribute-key">Clé du dictionnaire<select id="attribute-key" disabled={!dictionary} value={attributeForm.cleTechnique} onChange={e => setAttributeForm({ ...attributeForm, cleTechnique: e.target.value })} className={fieldClass} aria-describedby="attribute-key-help"><option value="">Sans clé commune — libellé seul</option>{attributeForm.cleTechnique && !dictionary?.entries.some(entry => entry.key === attributeForm.cleTechnique) && <option value={attributeForm.cleTechnique}>{attributeForm.cleTechnique} (clé conservée)</option>}{dictionary?.groups.map(group => <optgroup key={group.key} label={group.fr}>{dictionary.entries.filter(entry => entry.group === group.key).map(entry => <option key={entry.key} value={entry.key}>{entry.fr}</option>)}</optgroup>)}</select></label>
          <p id="attribute-key-help" className="text-sm text-slate-600">Choisissez le paramètre exact, indépendamment du libellé : entrée et sortie, tension nominale et limite absolue restent distinctes. Aucun champ obligatoire ni seuil de remplacement n’est déduit de cette grille. Seules les valeurs documentées et relues servent de référence ou d’alias ; conservez les suffixes. Un alias facilite la recherche ; il ne prouve pas une équivalence. Modifier la clé exige une nouvelle relecture.</p>
          <label className="block" htmlFor="attribute-product-search">Chercher le produit<input id="attribute-product-search" type="search" autoComplete="off" value={productSearch} onChange={e => setProductSearch(e.target.value)} className={fieldClass} /></label>
          <p className="text-sm text-slate-600">Saisissez au moins deux caractères, puis choisissez un produit.</p>
          {productError && <p role="alert">{productError}</p>}
          <label className="block" htmlFor="attribute-product">Produit associé<select id="attribute-product" required value={attributeForm.produitId} onChange={e => { setAttributeForm({ ...attributeForm, produitId: e.target.value }); setSelectedProduct(products.find(p => p.id === e.target.value) || selectedProduct); }} className={fieldClass}>
            <option value="">Choisir un produit</option>
            {selectedProduct && !products.some(p => p.id === selectedProduct.id) && <option value={selectedProduct.id}>{selectedProduct.nomProduit} — {selectedProduct.code || 'Sans référence'}</option>}
            {products.map(p => <option key={p.id} value={p.id}>{p.nomProduit} — {p.code || 'Sans référence'}</option>)}
          </select></label>
          <label className="block" htmlFor="attribute-type">Type<select id="attribute-type" value={attributeForm.typeAttribut} onChange={e => setAttributeForm({ ...attributeForm, typeAttribut: e.target.value as Attribute['typeAttribut'] })} className={fieldClass}><option value="TEXTE">Texte</option><option value="NOMBRE">Nombre</option><option value="LISTE">Liste</option></select></label>
          <label className="flex gap-2"><input type="checkbox" checked={attributeForm.obligatoire} onChange={e => setAttributeForm({ ...attributeForm, obligatoire: e.target.checked })} />Attribut obligatoire</label>
        </> : <>
          <label className="block" htmlFor="value-attribute">Attribut du produit<select id="value-attribute" required value={valueForm.attributId} onChange={e => setValueForm({ ...valueForm, attributId: e.target.value })} className={fieldClass}><option value="">Choisir un attribut</option>{attributes.map(a => <option key={a.id} value={a.id}>{a.produit?.nomProduit} — {a.nomAttribut}</option>)}</select></label>
          <label className="block" htmlFor="attribute-value">Valeur d’origine<input id="attribute-value" required maxLength={100} value={valueForm.valeur} onChange={e => setValueForm({ ...valueForm, valeur: e.target.value })} className={fieldClass} /></label>
          <p className="text-sm text-slate-600">Conservez la valeur telle qu’elle apparaît dans votre source. Documentez-la après l’enregistrement.</p>
        </>}
        <div className="flex gap-3"><button type="submit" className="bg-primary text-white px-4 py-2 rounded">{busy ? 'Enregistrement…' : 'Enregistrer'}</button><button type="button" onClick={closeEditors} className="border border-slate-300 rounded px-4 py-2">Annuler</button></div>
      </fieldset></form>
    </section>}
    <label className="block mb-5" htmlFor="attribute-filter">Filtrer par produit, référence ou attribut<input id="attribute-filter" type="search" value={search} onChange={e => setSearch(e.target.value)} className={fieldClass} /></label>
    {loading ? <p role="status">Chargement des attributs…</p> : !filtered.length ? <p>Aucun attribut. {canEdit ? 'Ajoutez une caractéristique à un produit.' : 'Essayez un autre filtre.'}</p> : <div className="space-y-4">
      {filtered.map(a => <section key={a.id} className="border border-slate-200 bg-white rounded-lg p-4">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{a.nomAttribut}</h2><p className="text-sm text-slate-600">{a.produit?.nomProduit || 'Produit sans libellé'}{a.produit?.code ? ` — ${a.produit.code}` : ''}</p></div>{canEdit && <div className="flex flex-wrap gap-3 text-sm"><button type="button" disabled={busy} onClick={() => editAttribute(a)} className="text-primary underline">Modifier l’attribut</button><button type="button" disabled={busy} onClick={() => editValue(undefined, a)} className="text-primary underline">Ajouter une valeur</button><button type="button" disabled={busy} onClick={() => void remove(a.id, 'attribute')} className="text-red-800 underline">Supprimer l’attribut</button></div>}</div>
        {a.cleTechnique && <p className="text-sm mt-2">Dictionnaire : {dictionary?.entries.find(entry => entry.key === a.cleTechnique)?.fr || a.cleTechnique}</p>}
        <ul className="mt-3 divide-y divide-slate-100">{values.filter(v => v.attributId === a.id).map(v => <li key={v.id} className="py-3 flex flex-wrap justify-between items-start gap-3"><span className="break-words">{v.valeur}</span>{canEdit && <div className="flex flex-wrap gap-3 text-sm"><button type="button" disabled={busy} onClick={e => { closeEditors(); sourceTrigger.current = e.currentTarget; setSourceId(v.id); }} className="text-primary underline" aria-label={`Source de ${a.nomAttribut} : ${v.valeur}`}>Source et relecture</button><button type="button" disabled={busy} onClick={() => editValue(v)} className="text-primary underline">Modifier la valeur</button><button type="button" disabled={busy} onClick={() => void remove(v.id, 'value')} className="text-red-800 underline">Supprimer la valeur</button></div>}</li>)}</ul>
        {!values.some(v => v.attributId === a.id) && <p className="text-sm text-slate-600 mt-3">Aucune valeur renseignée.</p>}
        {canEdit && sourceId && values.some(v => v.id === sourceId && v.attributId === a.id) && <TechnicalDocumentation key={sourceId} valueId={sourceId} onClose={() => { setSourceId(null); sourceTrigger.current?.focus(); }} />}
      </section>)}
    </div>}
  </div>;
}
