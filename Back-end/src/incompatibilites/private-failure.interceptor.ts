import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { catchError, throwError } from 'rxjs';
@Injectable()
export class PrivateFailureInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    // Prevent SQL/Prisma input (private descriptions or hashes) reaching the
    // global exception/audit logger. Expected validation/access errors stay useful.
    return next
      .handle()
      .pipe(
        catchError((error) =>
          throwError(() =>
            error instanceof HttpException
              ? error
              : new ServiceUnavailableException(
                  'Le suivi des incompatibilités est indisponible. Réessayez avec la même tentative.',
                ),
          ),
        ),
      );
  }
}
