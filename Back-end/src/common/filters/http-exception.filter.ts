import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = request.requestId;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exResponse = exception.getResponse();
      response.status(status).json(
        typeof exResponse === 'string'
          ? { statusCode: status, message: exResponse, requestId }
          : { ...(exResponse as object), requestId },
      );
    } else {
      const prismaCode = (exception as any)?.code;
      this.logger.error(
        `Unhandled exception [${requestId || 'no-request-id'}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );

      if (prismaCode === 'P2021' || prismaCode === 'P2022') {
        response.status(500).json({
          statusCode: 500,
          code: prismaCode,
          requestId,
          message:
            "Base de donnees non synchronisee : les tables ou colonnes necessaires n'existent pas encore. Appliquez la migration Prisma avant de tester ce module.",
        });
        return;
      }

      response.status(500).json({
        statusCode: 500,
        requestId,
        message: 'Une erreur interne est survenue. Veuillez reessayer.',
      });
    }
  }
}
