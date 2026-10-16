import { beforeEach, expect, it, vi } from 'vitest';
import { sourceForm, sourcePayload, sourceError, technicalDocumentationApi, type SourceContext } from './technicalDocumentation';
const calls = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock('./api', () => ({ default: calls }));
const context: SourceContext = { valeur: '0 Ω', attribut: 'Résistance', valeurVersion: 3, attributVersion: 5, produitVersion: 7, documentation: null, effective: { etat: 'A_VERIFIER', obsolete: false } };
beforeEach(() => { vi.clearAllMocks(); for (const call of Object.values(calls)) call.mockResolvedValue({ data: { ok: true } }); });
it('Uses the actual plural backend routes and an explicit review request', async () => {
  const form = sourceForm(context), signal = new AbortController().signal;
  await technicalDocumentationApi.read('v', signal); expect(calls.get).toHaveBeenCalledWith('/valeurs-attribut/v/documentation-admin', { signal });
  await technicalDocumentationApi.save('v', context, form); expect(calls.patch).toHaveBeenCalledWith('/valeurs-attribut/v/documentation', expect.objectContaining({ version: 0, valeurVersion: 3, attributVersion: 5, produitVersion: 7 }));
  await technicalDocumentationApi.review('v', context, form); expect(calls.post).toHaveBeenCalledWith('/valeurs-attribut/v/documentation/relire', expect.objectContaining({ confirmerRelecture: true, etat: 'A_VERIFIER' }));
  expect(calls.post.mock.calls[0][1]).not.toHaveProperty('reluParId');
});
it('Keeps zero, trims empty source fields to null, and never approves an old reviewed form', () => {
  const reviewed = { ...context, documentation: { version: 9, etat: 'DOCUMENTE', valeurSource: '0 Ω', valeurNormalisee: '0', uniteNormalisee: 'Ω' }, effective: { etat: 'DOCUMENTE', obsolete: false } } as SourceContext;
  const form = sourceForm(reviewed); expect(form.etat).toBe('A_VERIFIER'); expect(sourcePayload(reviewed, form)).toMatchObject({ version: 9, valeurNormalisee: '0', uniteNormalisee: 'Ω', sourceUrl: null }); expect(sourceError(form, false)).toBeNull();
  expect(sourceError({ ...form, etat: 'INCONNU' }, false)).toContain('non établie');
});
it('Refuses incomplete units, invented decimal normalization and unsafe source URLs before a write', () => {
  const form = sourceForm(context);
  expect(sourceError({ ...form, valeurNormalisee: '0' }, false)).toContain('ensemble');
  expect(sourceError({ ...form, valeurNormalisee: '10,5', uniteNormalisee: 'V' }, false)).toContain('point');
  expect(sourceError({ ...form, sourceUrl: 'https://user:secret@example.com' }, false)).toContain('sans identifiants');
  expect(sourceError({ ...form, etat: 'NON_APPLICABLE' }, false)).toContain('note de décision');
});
