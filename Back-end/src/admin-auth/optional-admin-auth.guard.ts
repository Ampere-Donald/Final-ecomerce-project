import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authentification admin OPTIONNELLE.
 *
 * Ne rejette jamais la requête : si le jeton est absent ou invalide, `req.user`
 * reste `null` et la requête passe quand même. Si le jeton est valide, `req.user`
 * est renseigné. Utile pour les endpoints publics qui enrichissent leur réponse
 * lorsqu'un membre du staff est connecté (ex. masquer les coûts au public).
 */
@Injectable()
export class OptionalAdminAuthGuard extends AuthGuard('jwt-admin') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
