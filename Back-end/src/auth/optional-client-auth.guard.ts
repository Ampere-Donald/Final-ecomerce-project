import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class OptionalClientAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, _info: any, context: any): any {
    const authorization = context.switchToHttp().getRequest()
      .headers.authorization;
    if (!authorization) return null;
    if (err || !user) throw err || new UnauthorizedException();
    return user;
  }
}
