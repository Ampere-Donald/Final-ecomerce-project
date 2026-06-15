import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Sécurité par défaut : si un endpoint applique RolesGuard sans déclarer
    // de @Roles, on REFUSE (au lieu d'autoriser). Un endpoint « tout utilisateur
    // authentifié » doit utiliser AdminAuthGuard seul, sans RolesGuard.
    if (!requiredRoles || requiredRoles.length === 0) return false;
    const { user } = context.switchToHttp().getRequest();
    return !!user && requiredRoles.includes(user.role);
  }
}
