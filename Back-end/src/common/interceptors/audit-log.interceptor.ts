import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDIT');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const user = req.user;
      const userInfo = user
        ? `${user.type || 'client'}:${user.email || user.id}`
        : 'anonymous';
      const start = Date.now();

      return next.handle().pipe(
        tap({
          next: () => {
            this.logger.log(
              `${method} ${req.url} by ${userInfo} from ${req.ip} [${Date.now() - start}ms]`,
            );
          },
          error: (err) => {
            this.logger.warn(
              `${method} ${req.url} FAILED by ${userInfo} from ${req.ip} - ${err.message}`,
            );
          },
        }),
      );
    }

    return next.handle();
  }
}
