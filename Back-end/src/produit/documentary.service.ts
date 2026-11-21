import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'node:path';
import { DatabaseService } from '../database/database.service';
import type { DocumentaryEditDto } from './documentary.controller';
const { editDocument } = require(join(process.cwd(), 'scripts/documentary/manual-edit.cjs'));
const statuses = ['enrichi_ia_a_verifier', 'valide_admin', 'identification_insuffisante', 'classification_requise'];
@Injectable()
export class DocumentaryService {
 constructor(private readonly db: DatabaseService) {}
 async list(search: string, status: string, pageText: string) {
  if (typeof search !== 'string' || typeof status !== 'string' || (status && !statuses.includes(status))) throw new BadRequestException('Filtre documentaire invalide.');
  const page = Number(pageText);
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new BadRequestException('Page invalide.');
  const term = search.trim().slice(0, 150);
  const where = `($1='' OR p.id::text=$1 OR p.code ILIKE '%' || $1 || '%' OR p.nom_produit ILIKE '%' || $1 || '%' OR p.code_famille ILIKE '%' || $1 || '%')
   AND ($2='' OR COALESCE(d.status,'classification_requise')=$2)`;
  return this.db.$transaction(async tx => {
   const items = await tx.$queryRawUnsafe(`SELECT p.id,p.code,p.code_famille,p.nom_produit,p.est_actif,COALESCE(d.status,'classification_requise') AS status,
    COALESCE(d.revision,0) AS revision,COALESCE(d.locked,false) AS locked,d.reviewed_at FROM produit p
    LEFT JOIN product_documentary d ON d.product_id=p.id WHERE ${where} ORDER BY p.nom_produit,p.id LIMIT 50 OFFSET $3`, term, status, (page-1)*50);
   const count: any[] = await tx.$queryRawUnsafe(`SELECT count(*)::int AS total FROM produit p LEFT JOIN product_documentary d ON d.product_id=p.id WHERE ${where}`,term,status);
   return {items,total:count[0].total,page,pageSize:50};
  }, {isolationLevel:'RepeatableRead'});
 }
 async detail(id: string) {
  const rows: any[] = await this.db.$queryRawUnsafe(`SELECT p.id,p.nom_produit,p.description,p.code,p.code_famille,p.est_actif,
   COALESCE(d.revision,0) AS revision, d.status,d.locked,d.short_description,d.proposal,d.sources,d.uncertainties,d.reviewed_at
   FROM produit p LEFT JOIN product_documentary d ON d.product_id=p.id WHERE p.id=$1`,id);
  if (!rows.length) throw new NotFoundException('Produit introuvable.');
  const history = await this.db.$queryRawUnsafe(`SELECT id,action,actor_id,"before","after",created_at FROM documentary_event WHERE product_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,id);
  return {...rows[0],history};
 }
 async edit(id: string, input: DocumentaryEditDto, actorId: string) {
  try {
   return await this.db.$transaction(async tx => editDocument({query: async (sql: string, args: unknown[] = []) => {
    if (['BEGIN','COMMIT','ROLLBACK'].includes(sql)) return {rows:[]};
    if (sql.startsWith('SELECT')) return {rows:await tx.$queryRawUnsafe(sql,...args)};
    return {rows:[],rowCount:await tx.$executeRawUnsafe(sql,...args)};
   }},{...input,productId:id,actorId}),{isolationLevel:'Serializable',timeout:15000});
  } catch (error: any) {
   if (error.message==='PRODUCT_NOT_FOUND') throw new NotFoundException('Produit introuvable.');
   if (error.message==='DOCUMENTARY_REVISION_CONFLICT' || error.message==='IDEMPOTENCY_KEY_REUSED' || error.code==='P2034') throw new ConflictException('La fiche a changé. Rechargez-la avant de réessayer.');
   if (/^(INVALID_|UNAUTHORIZED_FIELD|TITLE_TOO_LONG|HTML_NOT_ALLOWED)/.test(error.message || '')) throw new BadRequestException('Texte documentaire invalide.');
   throw error;
  }
 }
}
