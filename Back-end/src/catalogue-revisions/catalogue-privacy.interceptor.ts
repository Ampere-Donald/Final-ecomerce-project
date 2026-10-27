import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
const privateKeys = new Set([
  'prixRevision',
  'classementRevision',
  'commercialRevision',
  'prixVerifieRevision',
  'prixVerifieAt',
  'prixVerifiePar',
  'classementVerifieRevision',
  'classementVerifieAt',
  'classementVerifiePar',
  'propositionsCatalogue',
  'evenementsCatalogue',
]);
export function stripCatalogueReview(value: any): any {
  if (Array.isArray(value)) return value.map(stripCatalogueReview);
  if (
    !value ||
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !privateKeys.has(key))
      .map(([key, child]) => [key, stripCatalogueReview(child)]),
  );
}
@Injectable()
export class CataloguePrivacyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const user = context.switchToHttp().getRequest().user;
    return next
      .handle()
      .pipe(
        map((value) =>
          user?.type === 'admin' ? value : stripCatalogueReview(value),
        ),
      );
  }
}
