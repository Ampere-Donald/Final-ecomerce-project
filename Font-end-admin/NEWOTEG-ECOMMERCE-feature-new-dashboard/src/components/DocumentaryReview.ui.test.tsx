import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {DocumentaryReview} from './DocumentaryReview';
const mocks=vi.hoisted(()=>({get:vi.fn(),patch:vi.fn()}));
vi.mock('../services/api',()=>({default:mocks,getApiErrorMessage:()=> 'Conflit : rechargez la fiche.'}));
const id='000431de-8d4a-441f-8bb4-3075c0248ce5';
const row={id,code:'129009',nom_produit:'Résistance catalogue',revision:2,status:'enrichi_ia_a_verifier',locked:false};
const detail={...row,description:'Texte publié',short_description:'Résumé actuel',proposal:{proposed_changes:{display_title:'Titre proposé',short_description:'Résumé proposé',description:'Texte proposé'}},sources:[],uncertainties:['Marquage à confirmer'],reviewed_at:null,history:[]};
beforeEach(()=>{vi.clearAllMocks();mocks.get.mockImplementation((url:string)=>Promise.resolve({data:url==='/catalogue-documentary'?{items:[row],total:1}:detail}));mocks.patch.mockResolvedValue({data:{revision:3}});});
async function open(){render(<DocumentaryReview/>);await userEvent.click(await screen.findByRole('button',{name:/Résistance catalogue/}));await screen.findByLabelText('Description détaillée');}
describe('Révision documentaire',()=>{
 it('keeps the proposal separate until explicitly selected',async()=>{await open();expect((screen.getByLabelText('Description détaillée') as HTMLTextAreaElement).value).toBe('Texte publié');await userEvent.click(screen.getByText('Comparer le texte actuel et la proposition'));await userEvent.click(screen.getByRole('button',{name:'Utiliser comme brouillon'}));expect((screen.getByLabelText('Description détaillée') as HTMLTextAreaElement).value).toBe('Texte proposé');expect(mocks.patch).not.toHaveBeenCalled();});
 it('sends the expected revision and documentary text only',async()=>{await open();await userEvent.click(screen.getByRole('button',{name:'Valider et protéger'}));await waitFor(()=>expect(mocks.patch).toHaveBeenCalledOnce());const [url,payload]=mocks.patch.mock.calls[0];expect(url).toBe(`/catalogue-documentary/${id}`);expect(payload).toMatchObject({expectedRevision:2,validate:true,text:{display_title:'Résistance catalogue',short_description:'Résumé actuel',description:'Texte publié'}});expect(Object.keys(payload).sort()).toEqual(['expectedRevision','operationId','text','validate']);expect(payload.operationId).toMatch(/^[a-f0-9-]{36}$/i);});
 it('preserves a correction when saving fails',async()=>{mocks.patch.mockRejectedValue({response:{status:409}});await open();const area=screen.getByLabelText('Description détaillée');await userEvent.clear(area);await userEvent.type(area,'Correction humaine');await userEvent.click(screen.getByRole('button',{name:'Enregistrer la correction'}));await screen.findByRole('alert');expect((area as HTMLTextAreaElement).value).toBe('Correction humaine');});
});
