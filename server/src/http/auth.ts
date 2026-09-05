import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './errors.js';

/**
 * Auth stub for the interview scope: identity comes from the `X-User-Id` header.
 * PRODUCTION: replace with real authentication (verified bearer/JWT). The rest of
 * the app only depends on `req.userId`, so swapping this out is isolated here.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.header('X-User-Id')?.trim();
  if (!userId) {
    throw new ApiError(401, 'unauthenticated', 'Missing or empty X-User-Id header');
  }
  req.userId = userId;
  next();
}
