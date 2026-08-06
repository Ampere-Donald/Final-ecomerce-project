import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminAuthGuard extends AuthGuard('jwt-admin') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    const request = context.switchToHttp().getRequest();
    const path = String(request.originalUrl || request.url || '').split('?')[0];
    const credentialRoute = /\/admin-auth\/(me|change-password|change-pin)$/.test(path);

    if (request.user?.mustChangeCredential && !credentialRoute) {
      throw new ForbiddenException('Vous devez definir un nouvel identifiant secret avant de continuer');
    }
    return Boolean(authenticated);
  }
}
