import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { TechnicalDocumentation } from './TechnicalDocumentation';
import { Attributs } from './Attributs';

const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), review: vi.fn(), attributes: vi.fn(), values: vi.fn(), create: vi.fn(), update: vi.fn(), products: vi.fn(), dictionary: vi.fn(), admin: { role: 'ADMIN' } }));
vi.mock('../services/technicalDocumentation', async () => {
  const actual = await vi.importActual('../services/technicalDocumentation');
  return { ...actual, technicalDocumentationApi: { read: mocks.read, save: mocks.save, review: mocks.review } };
});
vi.mock('../services/api', () => ({ default: {}, getApiErrorMessage: (_: unknown, fallback: string) => fallback, attributApi: { getAll: mocks.attributes, create: mocks.create, update: mocks.update, dictionary: mocks.dictionary }, valeurAttributApi: { getAll: mocks.values }, produitApi: { list: mocks.products } }));
vi.mock('../context/AdminAuthContext', () => ({ useAdminAuth: () => ({ admin: mocks.admin }) }));
const context = { valeur: '0', attribut: 'Résistance', valeurVersion: 3, attributVersion: 4, produitVersion: 5, documentation: null, effective: { etat: 'A_VERIFIER', obsolete: false } };
beforeEach(() => { vi.clearAllMocks(); mocks.admin.role = 'ADMIN'; mocks.dictionary.mockResolvedValue({ version: 1, groups: [{ key: 'commun', fr: 'Commun', en: 'Common' }], entries: [{ key: 'REFERENCE_FABRICANT', group: 'commun', fr: 'Référence fabricant', en: 'Manufacturer reference' }, { key: 'ALIAS_RECHERCHE', group: 'commun', fr: 'Alias de recherche', en: 'Search alias' }, { key: 'BOITIER', group: 'commun', fr: 'Boîtier', en: 'Package' }] }); mocks.read.mockResolvedValue(context); mocks.save.mockResolvedValue({}); mocks.review.mockResolvedValue({}); mocks.attributes.mockResolvedValue([{ id: 'a', nomAttribut: 'Résistance', produitId: 'p', typeAttribut: 'TEXTE', produit: { id: 'p', nomProduit: 'Pièce recette', code: 'DEMO' } }]); mocks.values.mockResolvedValue([{ id: 'v', attributId: 'a', valeur: '0' }]); mocks.products.mockResolvedValue({ data: [{ id: 'p', nomProduit: 'Pièce recette', code: 'DEMO' }] }); });
async function open() { render(<TechnicalDocumentation valueId="v" onClose={() => {}} />); await screen.findByLabelText('État du brouillon'); }
function fillSource() { for (const [label, value] of [['Lien HTTPS vers la source', 'https://example.com/data.pdf'], ['Titre du document', 'Fiche recette'], ['Page, tableau ou section', 'Tableau 2'], ['Note de décision (publique)', 'Valeur vérifiée à 25 °C']]) fireEvent.change(screen.getByLabelText(label), { target: { value } }); }
it('Does not review automatically and passes all version contexts on a draft save', async () => {
  await open(); expect(screen.getByRole('button', { name: 'Documenter après relecture' }).matches(':disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('v', context, expect.objectContaining({ etat: 'A_VERIFIER', sourceUrl: '' })));
  expect(mocks.review).not.toHaveBeenCalled();
});
it('Requires evidence and clears the explicit confirmation whenever a field changes', async () => {
  await open(); const checkbox = screen.getByRole('checkbox'); fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole('button', { name: 'Documenter après relecture' }));
  expect((await screen.findByRole('alert')).textContent).toContain('La relecture exige'); expect(mocks.review).not.toHaveBeenCalled();
  fillSource(); expect((checkbox as HTMLInputElement).checked).toBe(false); fireEvent.click(checkbox); fireEvent.click(screen.getByRole('button', { name: 'Documenter après relecture' }));
  await waitFor(() => expect(mocks.review).toHaveBeenCalledTimes(1));
});
it('Keeps local fields on conflict and disables all further writes until a deliberate reload', async () => {
  mocks.save.mockRejectedValue({ response: { status: 409 } }); await open(); fillSource();
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Votre saisie est conservée');
  expect((screen.getByLabelText('Titre du document') as HTMLInputElement).value).toBe('Fiche recette');
  expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' }).matches(':disabled')).toBe(true);
  vi.spyOn(window, 'confirm').mockReturnValue(false); fireEvent.click(screen.getByRole('button', { name: 'Recharger la dernière version' })); expect(mocks.read).toHaveBeenCalledTimes(1); vi.restoreAllMocks();
});
it('Displays stale review and original value without checking the review box', async () => {
  mocks.read.mockResolvedValue({ ...context, documentation: { version: 7, valeurSource: '1', etat: 'DOCUMENTE', sourceDocument: 'Ancien document' }, effective: { etat: 'A_VERIFIER', obsolete: true } }); await open();
  expect(screen.getByText(/L’ancienne relecture/)).toBeTruthy(); expect(screen.getByText('Ancienne valeur relue : 1')).toBeTruthy(); expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
});
it('A failed save keeps the input and can be retried', async () => {
  mocks.save.mockRejectedValue(new Error()); await open(); fillSource(); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
  expect((await screen.findByRole('alert')).textContent).toContain('saisie est conservée'); expect((screen.getByLabelText('Titre du document') as HTMLInputElement).value).toBe('Fiche recette'); expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' }).matches(':disabled')).toBe(false);
});
it('Read-only users cannot open a private source or edit values', async () => {
  mocks.admin.role = 'VENDEUR'; render(<Attributs />); await screen.findByText('Pièce recette — DEMO');
  expect(screen.queryByRole('button', { name: 'Ajouter un attribut' })).toBeNull(); expect(screen.queryByRole('button', { name: /Source de/ })).toBeNull(); expect(mocks.read).not.toHaveBeenCalled();
});
it('The editor opens the source for the selected value and restores focus on close', async () => {
  render(<Attributs />); const button = await screen.findByRole('button', { name: 'Source de Résistance : 0' }); fireEvent.click(button); await screen.findByLabelText('État du brouillon');
  expect(mocks.read).toHaveBeenCalledWith('v', expect.any(AbortSignal)); fireEvent.click(screen.getByRole('button', { name: 'Fermer' })); expect(document.activeElement).toBe(button);
});
it('Creates an attribute using a real selected product and the backend field names', async () => {
  render(<Attributs />); await screen.findByText('Pièce recette — DEMO'); fireEvent.click(screen.getByRole('button', { name: 'Ajouter un attribut' }));
  fireEvent.change(screen.getByLabelText('Nom de l’attribut'), { target: { value: 'Tension' } }); fireEvent.change(screen.getByLabelText('Chercher le produit'), { target: { value: 'Pièce' } });
  await screen.findByRole('option', { name: 'Pièce recette — DEMO' }); fireEvent.change(screen.getByLabelText('Produit associé'), { target: { value: 'p' } }); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ nomAttribut: 'Tension', produitId: 'p', typeAttribut: 'TEXTE', cleTechnique: null, obligatoire: false }));
});

it('Requires an explicit search usage and explains that an alias is not an equivalent', async () => {
  render(<Attributs />); await screen.findByText('Pièce recette — DEMO'); fireEvent.click(screen.getByRole('button', { name: 'Modifier l’attribut' }));
  const usage = screen.getByLabelText('Clé du dictionnaire');
  expect((usage as HTMLSelectElement).value).toBe('');
  expect(screen.getByText(/Un alias facilite la recherche/)).toBeTruthy();
  fireEvent.change(usage, { target: { value: 'ALIAS_RECHERCHE' } });
  expect((usage as HTMLSelectElement).value).toBe('ALIAS_RECHERCHE');
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('a', expect.objectContaining({ cleTechnique: 'ALIAS_RECHERCHE' })));
});

it('Clears an existing reference key explicitly rather than omitting it from the update', async () => {
  mocks.attributes.mockResolvedValue([{ id: 'a', nomAttribut: 'Référence', produitId: 'p', typeAttribut: 'TEXTE', cleTechnique: 'REFERENCE_FABRICANT', produit: { id: 'p', nomProduit: 'Pièce recette', code: 'DEMO' } }]);
  render(<Attributs />); await screen.findByText('Pièce recette — DEMO'); fireEvent.click(screen.getByRole('button', { name: 'Modifier l’attribut' }));
  const usage = screen.getByLabelText('Clé du dictionnaire'); expect((usage as HTMLSelectElement).value).toBe('REFERENCE_FABRICANT');
  fireEvent.change(usage, { target: { value: '' } }); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('a', expect.objectContaining({ cleTechnique: null })));
});

it('Saves an explicit parameter key without renaming or reviewing the source value', async () => {
  render(<Attributs />); await screen.findByText('Pièce recette — DEMO'); fireEvent.click(screen.getByRole('button', { name: 'Modifier l’attribut' }));
  const key = screen.getByLabelText('Clé du dictionnaire'); await waitFor(() => expect(key.matches(':disabled')).toBe(false));
  fireEvent.change(key, { target: { value: 'BOITIER' } }); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('a', expect.objectContaining({ nomAttribut: 'Résistance', cleTechnique: 'BOITIER' })));
  expect(mocks.review).not.toHaveBeenCalled();
});

it('Keeps the editor input while a failed dictionary load is retried', async () => {
  mocks.dictionary.mockRejectedValueOnce(new Error('Offline'));
  render(<Attributs />); await screen.findByRole('button', { name: 'Recharger le dictionnaire' });
  fireEvent.click(screen.getByRole('button', { name: 'Modifier l’attribut' }));
  fireEvent.change(screen.getByLabelText('Nom de l’attribut'), { target: { value: 'Saisie conservée' } });
  expect(screen.getByLabelText('Clé du dictionnaire').matches(':disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' })); expect(mocks.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Recharger le dictionnaire' }));
  await waitFor(() => expect(screen.getByLabelText('Clé du dictionnaire').matches(':disabled')).toBe(false));
  expect((screen.getByLabelText('Nom de l’attribut') as HTMLInputElement).value).toBe('Saisie conservée');
});
