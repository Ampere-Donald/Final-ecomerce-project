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
    // Anonymous aggregate observations must not be linked to IP, account or
    // correlation IDs in the business audit journal. No business mutation here.
    if (
      req.route?.path === '/api/parcours/evenements' ||
      /^\/api\/parcours\/evenements\/?$/i.test(req.path || '')
    )
      return next.handle();
    const requestId = req.requestId || 'no-request-id';

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
              `[${requestId}] ${method} ${req.url} by ${userInfo} from ${req.ip} [${Date.now() - start}ms]`,
            );
          },
          error: (err) => {
            this.logger.warn(
              `[${requestId}] ${method} ${req.url} FAILED by ${userInfo} from ${req.ip} - ${err.message}`,
            );
          },
        }),
      );
    }

    return next.handle();
  }
}
