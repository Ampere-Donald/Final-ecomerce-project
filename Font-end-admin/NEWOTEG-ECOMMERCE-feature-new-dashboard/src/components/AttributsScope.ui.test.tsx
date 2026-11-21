import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {Attributs} from './Attributs';
const api=vi.hoisted(()=>({getOne:vi.fn(),attributes:vi.fn()}));
vi.mock('../context/AdminAuthContext',()=>({useAdminAuth:()=>({admin:{role:'ADMIN'}})}));
vi.mock('../services/technicalDictionary',()=>({readTechnicalDictionary:()=>({groups:[],entries:[]})}));
vi.mock('../services/api',()=>({attributApi:{getAll:api.attributes,dictionary:()=>Promise.resolve({})},valeurAttributApi:{getAll:()=>Promise.resolve([])},produitApi:{getOne:api.getOne},getApiErrorMessage:()=> 'Erreur de chargement'}));
vi.mock('./TechnicalDocumentation',()=>({TechnicalDocumentation:()=>null}));
const id='000431de-8d4a-441f-8bb4-3075c0248ce5';
beforeEach(()=>{vi.clearAllMocks();window.history.replaceState({},'',`/attributs?productId=${id}`);api.getOne.mockResolvedValue({id,nomProduit:'Pièce ciblée',code:'129009'});api.attributes.mockResolvedValue([{id:'a',produitId:id,nomAttribut:'Attribut ciblé',typeAttribut:'TEXTE'},{id:'b',produitId:'other',nomAttribut:'Autre attribut',typeAttribut:'TEXTE'}]);});
afterEach(()=>window.history.replaceState({},'','/'));
describe('Attributs de la fiche documentaire',()=>{
 it('filters by immutable ID and preselects it for a new attribute',async()=>{render(<Attributs/>);await screen.findByText('Attribut ciblé');expect(screen.queryByText('Autre attribut')).toBeNull();await waitFor(()=>expect((screen.getByRole('button',{name:'Ajouter un attribut'}) as HTMLButtonElement).disabled).toBe(false));await userEvent.click(screen.getByRole('button',{name:'Ajouter un attribut'}));expect((screen.getByLabelText('Produit associé') as HTMLSelectElement).value).toBe(id);});
 it('keeps the global view when no product is specified',async()=>{window.history.replaceState({},'','/attributs');render(<Attributs/>);await screen.findByText('Autre attribut');expect(api.getOne).not.toHaveBeenCalled();});
});
