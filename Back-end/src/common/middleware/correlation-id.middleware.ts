import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type CorrelatedRequest = Request & { requestId?: string };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

export function correlationIdMiddleware(
  request: CorrelatedRequest,
  response: Response,
  next: NextFunction,
) {
  const candidate = request.headers['x-request-id'];
  const incoming = typeof candidate === 'string' && SAFE_REQUEST_ID.test(candidate)
    ? candidate
    : undefined;
  request.requestId = incoming || randomUUID();
  response.setHeader('X-Request-Id', request.requestId);
  next();
}
