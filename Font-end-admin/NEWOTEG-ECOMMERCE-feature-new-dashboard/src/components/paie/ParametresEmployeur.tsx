import React, { useEffect, useState } from 'react';
import { Save, Building2, AlertCircle } from 'lucide-react';
import { paieApi } from '../../services/api';
import { Button } from '../ui/Button';
import { useToast, errorMessage } from '../ui/Toast';
import { ParametresEmployeur as Params } from './types';

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-60';

const NUMERIC_KEYS = new Set([
  'tauxCnps',
  'plafondCnps',
  'tauxCfc',
  'tauxCac',
  'abattementIrppAnnuel',
  'tauxFraisProIrpp',
]);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
    {children}
  </div>
);

export const ParametresEmployeur = ({ canEdit }: { canEdit: boolean }) => {
  const toast = useToast();
  const [params, setParams] = useState<Params | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    paieApi
      .getParametres()
      .then(setParams)
      .catch((e: any) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Params, v: any) =>
    setParams((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    if (!params) return;
    setSaving(true);
    try {
      const data: Record<string, any> = {};
      for (const [k, v] of Object.entries(params)) {
        if (k === 'id' || v === null || v === undefined) continue;
        if (NUMERIC_KEYS.has(k)) {
          if (v !== '') data[k] = Number(v);
        } else {
          data[k] = v;
        }
      }
      const updated = await paieApi.updateParametres(data);
      setParams(updated);
      toast.success('Paramètres employeur enregistrés.');
    } catch (e: any) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !params)
    return <div className="text-center text-slate-400 py-12">Chargement…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          Ces informations apparaissent en en-tête de chaque bulletin. Elles sont
          indispensables pour qu'un bulletin soit crédible (visa, banque,
          administration).
        </span>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Building2 size={18} /> Identité de l'employeur
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Raison sociale">
            <input className={inputClass} value={params.raisonSociale || ''} onChange={(e) => set('raisonSociale', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Secteur d'activité">
            <input className={inputClass} value={params.secteurActivite || ''} onChange={(e) => set('secteurActivite', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="NIU">
            <input className={inputClass} value={params.niu || ''} onChange={(e) => set('niu', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="RCCM">
            <input className={inputClass} value={params.rccm || ''} onChange={(e) => set('rccm', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="N° CNPS employeur">
            <input className={inputClass} value={params.cnpsEmployeur || ''} onChange={(e) => set('cnpsEmployeur', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Téléphone">
            <input className={inputClass} value={params.telephone || ''} onChange={(e) => set('telephone', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={params.email || ''} onChange={(e) => set('email', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Ville">
            <input className={inputClass} value={params.ville || ''} onChange={(e) => set('ville', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Adresse">
            <input className={inputClass} value={params.adresse || ''} onChange={(e) => set('adresse', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Logo (URL)">
            <input className={inputClass} value={params.logoUrl || ''} onChange={(e) => set('logoUrl', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Signataire (nom)">
            <input className={inputClass} value={params.signataireNom || ''} onChange={(e) => set('signataireNom', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Signataire (qualité)">
            <input className={inputClass} value={params.signataireQualite || ''} onChange={(e) => set('signataireQualite', e.target.value)} disabled={!canEdit} />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-bold text-slate-900">Taux & barèmes (Cameroun)</h3>
        <p className="text-xs text-slate-500">
          Valeurs par défaut conformes à la réglementation en vigueur. Ne les
          modifiez que si la loi change.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Taux CNPS salarié (%)">
            <input type="number" step="0.1" className={inputClass} value={(params.tauxCnps as any) ?? ''} onChange={(e) => set('tauxCnps', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Plafond CNPS (FCFA)">
            <input type="number" className={inputClass} value={(params.plafondCnps as any) ?? ''} onChange={(e) => set('plafondCnps', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Taux CFC (%)">
            <input type="number" step="0.1" className={inputClass} value={(params.tauxCfc as any) ?? ''} onChange={(e) => set('tauxCfc', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="CAC (% de l'IRPP)">
            <input type="number" step="0.1" className={inputClass} value={(params.tauxCac as any) ?? ''} onChange={(e) => set('tauxCac', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Abattement IRPP annuel">
            <input type="number" className={inputClass} value={(params.abattementIrppAnnuel as any) ?? ''} onChange={(e) => set('abattementIrppAnnuel', e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Frais pro IRPP (%)">
            <input type="number" step="0.1" className={inputClass} value={(params.tauxFraisProIrpp as any) ?? ''} onChange={(e) => set('tauxFraisProIrpp', e.target.value)} disabled={!canEdit} />
          </Field>
        </div>
      </section>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} loading={saving} icon={<Save size={16} />}>
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
};
