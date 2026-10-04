import type { NextFunction, Request, Response } from 'express';

// Controller @Header decorators do not run when a guard rejects the request.
// Apply privacy before guards and body parsing, including their error responses.
export function guestPrivateHeadersMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (
    /^\/api\/(commandes|avis|incompatibilites)\/guest(?:\/|$)/i.test(
      request.path,
    )
  ) {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
}
