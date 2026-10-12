import api from './api';

export const verdictLabels = {
  DIRECT_DOCUMENTE: 'Remplacement direct documenté',
  ADAPTATION_NECESSAIRE: 'Adaptation nécessaire',
  REFUSE: 'Remplacement refusé',
  A_CONFIRMER: 'À confirmer',
} as const;
export type Verdict = keyof typeof verdictLabels;
export type Piece = { id: string; nomProduit: string; code?: string | null; estActif?: boolean };
export type Evidence = {
  id: string; valeur: string;
  attribut: { nomAttribut: string; produitId: string; cleTechnique?: string | null };
  documentation: { etat: string; obsolete?: boolean; sourceUrl?: string; sourceDocument?: string; sourceRepere?: string; conditions?: string; motif?: string };
};
export type EvidencePage = { produit: Piece; valeurs: Evidence[]; next: string | null };
export type CaseForm = {
  reference: string; cibleId: string; candidatId: string; application: string;
  verdict: Verdict; justification: string; limites: string; adaptations: string;
  sourceUrl: string; sourceDocument: string; sourceRepere: string; sourceRevision: string;
  valeurIds: string[]; retire: boolean;
};
export type CaseRow = { id: string; version: number; reference: string; application: string; verdict: Verdict; retire: boolean; reluLe?: string | null };
export type CaseContext = CaseRow & CaseForm & {
  empreinteCourante: string; sourcesSelectionRelues: boolean; reluActuel: boolean; obsolete: boolean;
  preuvesActuelles: { products: Piece[]; values: Evidence[] };
  historique: { id: string; casVersion: number; reluLe: string; preuve: { cas: CaseForm; products: Piece[]; values: Evidence[] } }[];
};
export const emptyCase: CaseForm = { reference: '', cibleId: '', candidatId: '', application: '', verdict: 'A_CONFIRMER', justification: '', limites: '', adaptations: '', sourceUrl: '', sourceDocument: '', sourceRepere: '', sourceRevision: '', valeurIds: [], retire: false };
export function caseForm(c: CaseContext): CaseForm {
  return Object.fromEntries(Object.keys(emptyCase).map(key => [key, c[key as keyof CaseForm] ?? emptyCase[key as keyof CaseForm]])) as CaseForm;
}
export function casePayload(form: CaseForm, version: number) {
  return { ...form, version, cibleId: form.cibleId || null, adaptations: form.verdict === 'ADAPTATION_NECESSAIRE' ? form.adaptations : null, sourceRevision: form.sourceRevision || null };
}
export function caseError(form: CaseForm): string | null {
  if (!form.reference.trim() || !form.candidatId || !form.application.trim() || !form.justification.trim() || !form.limites.trim()) return 'Renseignez la référence exacte, la pièce proposée, l’usage, le motif et les limites.';
  if (form.cibleId === form.candidatId) return 'La pièce proposée doit être différente de la pièce à remplacer.';
  if (!form.sourceDocument.trim() || !form.sourceRepere.trim()) return 'Indiquez le document et la page ou section de la pièce recherchée.';
  try { const u = new URL(form.sourceUrl); if (u.protocol !== 'https:' || u.username || u.password) throw Error(); }
  catch { return 'Utilisez une source HTTPS sans identifiants intégrés.'; }
  if (!form.valeurIds.length || form.valeurIds.length > 20) return 'Sélectionnez entre 1 et 20 caractéristiques des pièces concernées.';
  if (form.verdict === 'ADAPTATION_NECESSAIRE' && !form.adaptations.trim()) return 'Décrivez les adaptations nécessaires.';
  return null;
}
export const replacementCaseApi = {
  list: (signal?: AbortSignal): Promise<CaseRow[]> => api.get('/equivalence/cas', { signal }).then(r => r.data),
  read: (id: string, signal?: AbortSignal): Promise<CaseContext> => api.get(`/equivalence/cas/${id}`, { signal }).then(r => r.data),
  evidence: (id: string, after?: string, signal?: AbortSignal): Promise<EvidencePage> => api.get(`/equivalence/cas/pieces/${id}/preuves`, { params: { after }, signal }).then(r => r.data),
  save: (id: string | null, form: CaseForm, version: number): Promise<{ id: string }> => id ? api.patch(`/equivalence/cas/${id}`, casePayload(form, version)).then(r => r.data) : api.post('/equivalence/cas', casePayload(form, version)).then(r => r.data),
  review: (c: CaseContext) => api.post(`/equivalence/cas/${c.id}/relire`, { version: c.version, empreinte: c.empreinteCourante, confirmerRelecture: true }).then(r => r.data),
};
