import api from './api';

export type DraftState = 'INCONNU' | 'A_VERIFIER' | 'CONTRADICTOIRE' | 'NON_APPLICABLE';
export const sourceFields = {
  uniteSource: { label: 'Unité de la valeur d’origine', max: 40 },
  valeurNormalisee: { label: 'Valeur normalisée (facultatif)', max: 100 },
  uniteNormalisee: { label: 'Unité normalisée', max: 40 },
  conditions: { label: 'Conditions d’utilisation ou de mesure', max: 500 },
  sourceUrl: { label: 'Lien HTTPS vers la source', max: 800 },
  sourceDocument: { label: 'Titre du document', max: 200 },
  sourceRepere: { label: 'Page, tableau ou section', max: 160 },
  sourceRevision: { label: 'Révision du document', max: 100 },
  motif: { label: 'Note de décision (publique)', max: 500 },
} as const;
export type SourceField = keyof typeof sourceFields;
export type SourceForm = Record<SourceField, string> & { etat: DraftState };
export interface SourceContext {
  valeur: string;
  attribut: string;
  valeurVersion: number;
  attributVersion: number;
  produitVersion: number;
  documentation: (Record<SourceField, string | null> & {
    version: number; etat: DraftState | 'DOCUMENTE'; valeurSource: string; reluLe?: string | null;
  }) | null;
  effective: { etat: DraftState | 'DOCUMENTE'; obsolete: boolean };
}
export function sourceForm(context: SourceContext): SourceForm {
  return {
    ...Object.fromEntries(Object.keys(sourceFields).map(key => [key, context.documentation?.[key as SourceField] || ''])),
    etat: context.effective.etat === 'DOCUMENTE' ? 'A_VERIFIER' : context.effective.etat,
  } as SourceForm;
}
export function sourcePayload(context: SourceContext, form: SourceForm) {
  return {
    ...Object.fromEntries(Object.keys(sourceFields).map(key => [key, form[key as SourceField].trim() || null])),
    etat: form.etat,
    version: context.documentation?.version ?? 0,
    valeurVersion: context.valeurVersion,
    attributVersion: context.attributVersion,
    produitVersion: context.produitVersion,
  };
}
export function sourceError(form: SourceForm, review: boolean): string | null {
  if (Boolean(form.valeurNormalisee.trim()) !== Boolean(form.uniteNormalisee.trim()))
    return 'Renseignez la valeur normalisée et son unité ensemble.';
  if (form.valeurNormalisee.trim() && !/^[+-]?\d+(?:\.\d+)?$/.test(form.valeurNormalisee.trim()))
    return 'Utilisez un nombre décimal avec un point. Ne remplacez pas une donnée inconnue par zéro.';
  if (form.etat !== 'A_VERIFIER' && form.valeurNormalisee.trim())
    return 'Une donnée non établie ne reçoit pas de valeur normalisée.';
  if (['CONTRADICTOIRE', 'NON_APPLICABLE'].includes(form.etat) && !form.motif.trim())
    return 'Expliquez la contradiction ou la non-application dans la note de décision.';
  if (form.sourceUrl.trim()) {
    try {
      const url = new URL(form.sourceUrl.trim());
      if (url.protocol !== 'https:' || url.username || url.password) throw Error();
    } catch { return 'Utilisez un lien HTTPS sans identifiants intégrés.'; }
  }
  if (review && (form.etat !== 'A_VERIFIER' || !form.sourceUrl.trim() || !form.sourceDocument.trim() || !form.sourceRepere.trim() || !form.motif.trim()))
    return 'La relecture exige une donnée à vérifier, une source, son titre, une page ou section et une note de décision.';
  return null;
}
export const technicalDocumentationApi = {
  read: (id: string, signal?: AbortSignal): Promise<SourceContext> => api.get(`/valeurs-attribut/${id}/documentation-admin`, { signal }).then(r => r.data),
  save: (id: string, context: SourceContext, form: SourceForm) => api.patch(`/valeurs-attribut/${id}/documentation`, sourcePayload(context, form)).then(r => r.data),
  review: (id: string, context: SourceContext, form: SourceForm) => api.post(`/valeurs-attribut/${id}/documentation/relire`, { ...sourcePayload(context, form), confirmerRelecture: true }).then(r => r.data),
};
