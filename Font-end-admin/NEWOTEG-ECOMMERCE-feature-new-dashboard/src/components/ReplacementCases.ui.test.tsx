import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { ReplacementCases } from './ReplacementCases';
import { casePayload, emptyCase } from '../services/replacementCases';

const mocks = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), evidence: vi.fn(), save: vi.fn(), review: vi.fn(), products: vi.fn(), admin: { role: 'ADMIN' } }));
vi.mock('../services/replacementCases', async () => ({ ...await vi.importActual('../services/replacementCases'), replacementCaseApi: { list: mocks.list, read: mocks.read, evidence: mocks.evidence, save: mocks.save, review: mocks.review } }));
vi.mock('../services/api', () => ({ default: {}, produitApi: { list: mocks.products }, getApiErrorMessage: (_: unknown, fallback: string) => fallback }));
vi.mock('../context/AdminAuthContext', () => ({ useAdminAuth: () => ({ admin: mocks.admin }) }));
const piece = { id: 'candidate', nomProduit: 'Pièce recette', code: 'DEMO' };
const value = { id: 'value', valeur: 'TO-92', attribut: { nomAttribut: 'Boîtier', produitId: piece.id }, documentation: { etat: 'DOCUMENTE', sourceDocument: 'Fiche candidate', sourceRepere: 'Tableau 1', sourceUrl: 'https://manufacturer.example/candidate.pdf' } };
const context = { ...emptyCase, id: 'case', version: 2, reference: 'BC547B', candidatId: piece.id, application: 'Circuit fictif 1 mA', verdict: 'DIRECT_DOCUMENTE', justification: 'Motif fictif', limites: 'Circuit de recette uniquement', sourceUrl: 'https://manufacturer.example/original.pdf', sourceDocument: 'Fiche originale', sourceRepere: 'Page 2', valeurIds: [value.id], empreinteCourante: 'a'.repeat(64), sourcesSelectionRelues: true, reluActuel: false, obsolete: false, preuvesActuelles: { products: [piece], values: [value] }, historique: [] };
beforeEach(() => {
  vi.clearAllMocks(); mocks.admin.role = 'ADMIN'; mocks.list.mockResolvedValue([context]); mocks.read.mockResolvedValue(context); mocks.evidence.mockResolvedValue({ produit: piece, valeurs: [value], next: null }); mocks.save.mockResolvedValue({ id: 'case' }); mocks.review.mockResolvedValue({}); mocks.products.mockResolvedValue({ data: [piece] });
});
async function open() { render(<MemoryRouter><ReplacementCases /></MemoryRouter>); fireEvent.click(await screen.findByRole('button', { name: 'Ouvrir le cas BC547B' })); await screen.findByLabelText('Référence exacte recherchée'); }
const confirmation = () => screen.getByRole('checkbox', { name: /J’ai relu les documents/ });
it('Requires explicit review of a saved dossier and sends no draft fields with the review', async () => {
  await open(); expect(screen.getByRole('button', { name: 'Confirmer la relecture du cas' }).matches(':disabled')).toBe(true);
  fireEvent.click(confirmation()); fireEvent.click(screen.getByRole('button', { name: 'Confirmer la relecture du cas' }));
  await waitFor(() => expect(mocks.review).toHaveBeenCalledWith(context)); expect(mocks.save).not.toHaveBeenCalled();
});
it('A changed verdict resets confirmation and requires saving before review', async () => {
  await open(); fireEvent.click(confirmation()); fireEvent.change(screen.getByLabelText('Décision technique'), { target: { value: 'ADAPTATION_NECESSAIRE' } });
  expect((confirmation() as HTMLInputElement).checked).toBe(false); expect(confirmation().matches(':disabled')).toBe(true);
  fireEvent.change(screen.getByLabelText('Adaptations à effectuer'), { target: { value: 'Adapter le brochage fictif' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('case', expect.objectContaining({ verdict: 'ADAPTATION_NECESSAIRE', adaptations: 'Adapter le brochage fictif' }), 2)); expect(mocks.review).not.toHaveBeenCalled();
});
it('Preserves local input on a concurrent review conflict and locks further writes', async () => {
  mocks.review.mockRejectedValue({ response: { status: 409 } }); await open(); fireEvent.click(confirmation()); fireEvent.click(screen.getByRole('button', { name: 'Confirmer la relecture du cas' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Votre saisie est conservée'); expect((screen.getByLabelText('Document de la pièce recherchée') as HTMLInputElement).value).toBe('Fiche originale');
  expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' }).matches(':disabled')).toBe(true);
  vi.spyOn(window, 'confirm').mockReturnValue(false); fireEvent.click(screen.getByRole('button', { name: 'Recharger la dernière version' })); expect(mocks.read).toHaveBeenCalledTimes(1); vi.restoreAllMocks();
});
it('Keeps edited fields on save failure and lets the same draft be retried', async () => {
  mocks.save.mockRejectedValue(new Error()); await open(); fireEvent.change(screen.getByLabelText('Limites du remplacement'), { target: { value: 'Limites locales' } }); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
  expect((await screen.findByRole('alert')).textContent).toContain('saisie est conservée'); expect((screen.getByLabelText('Limites du remplacement') as HTMLTextAreaElement).value).toBe('Limites locales'); expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' }).matches(':disabled')).toBe(false);
});
it('Source invalidation displays the old proof but cannot stamp a new decision', async () => {
  mocks.read.mockResolvedValue({ ...context, sourcesSelectionRelues: false, obsolete: true, historique: [{ id: 'history', casVersion: 1, reluLe: '2026-10-12T12:00:00Z', preuve: { cas: context, products: [piece], values: [value] } }] }); await open();
  expect(screen.getByText(/La précédente relecture ne s’applique plus/)).toBeTruthy(); expect(confirmation().matches(':disabled')).toBe(true); expect(screen.getByText(/Version 1 —/)).toBeTruthy(); expect(mocks.review).not.toHaveBeenCalled();
});
it('List timestamps never assert that a decision remains valid', async () => {
  mocks.list.mockResolvedValue([{ ...context, reluLe: '2026-10-12T12:00:00Z' }]); render(<MemoryRouter><ReplacementCases /></MemoryRouter>);
  await screen.findByText(/ouvrir pour vérifier l’état actuel/); expect(screen.queryByText(/Décision relue, applicable/)).toBeNull();
});
it('Unauthorised roles never load private cases or evidence', () => {
  mocks.admin.role = 'VENDEUR'; render(<MemoryRouter><ReplacementCases /></MemoryRouter>); expect(screen.getByText(/réservé aux administrateurs/)).toBeTruthy(); expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
});
it('Serialises optional values explicitly and cannot retain adaptations under a direct verdict', () => {
  expect(casePayload({ ...emptyCase, adaptations: 'Previous hidden adaptation' }, 0)).toMatchObject({ version: 0, cibleId: null, adaptations: null, sourceRevision: null });
});
it('Offers an explicitly labelled catalogue selection and clears evidence when the pair changes', async () => {
  await open(); fireEvent.change(screen.getByLabelText('Chercher : Pièce proposée', { exact: true }), { target: { value: 'recette' } });
  await waitFor(() => expect(mocks.products).toHaveBeenCalled());
  const select = screen.getByLabelText('Pièce proposée', { exact: true });
  expect(select.tagName).toBe('SELECT'); fireEvent.change(select, { target: { value: '' } });
  expect(screen.getByText('Caractéristiques retenues — 0/20')).toBeTruthy(); expect(confirmation().matches(':disabled')).toBe(true);
});
it('Retries unavailable evidence without dropping the selected identifiers', async () => {
  mocks.evidence.mockRejectedValueOnce(new Error()); await open(); await screen.findByRole('button', { name: 'Réessayer les caractéristiques' });
  expect(screen.getByText('Caractéristiques retenues — 1/20')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Réessayer les caractéristiques' }));
  await screen.findByText('Source relue'); expect(screen.getByText('Caractéristiques retenues — 1/20')).toBeTruthy(); expect(mocks.evidence).toHaveBeenCalledTimes(2);
});
