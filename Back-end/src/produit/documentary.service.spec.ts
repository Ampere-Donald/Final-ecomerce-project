import { BadRequestException, ConflictException } from '@nestjs/common';
import { DocumentaryService } from './documentary.service';
describe('documentary admin service',()=>{
 it('rejects unknown status and invalid page before querying',async()=>{
  const db:any={$transaction:jest.fn()};const service=new DocumentaryService(db);
  await expect(service.list('','unknown','1')).rejects.toBeInstanceOf(BadRequestException);
  await expect(service.list('','','0')).rejects.toBeInstanceOf(BadRequestException);
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('binds search parameters rather than interpolating input',async()=>{
  const query=jest.fn().mockResolvedValueOnce([] as never).mockResolvedValueOnce([{total:0}] as never);
  const db:any={$transaction:async(fn:any)=>fn({$queryRawUnsafe:query})};
  const search="quote' OR true --";
  await new DocumentaryService(db).list(search,'valide_admin','2');
  expect(query.mock.calls[0][0]).not.toContain(search);
  expect(query.mock.calls[0].slice(1)).toEqual([search,'valide_admin',50]);
 });
 it('maps serialization conflicts to a reload response',async()=>{
  const db:any={$transaction:async()=>{throw {code:'P2034'};}};
  await expect(new DocumentaryService(db).edit('p',{} as any,'admin')).rejects.toBeInstanceOf(ConflictException);
 });
});
