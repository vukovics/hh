import type { NextFunction, Request, Response } from 'express';

/**
 * Single API error shape used everywhere: { error: { code, message } }.
 * `code` is a stable machine-readable string; `message` is human-readable.
 */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function sendError(res: Response, err: ApiError): void {
  const body: ApiErrorBody = { error: { code: err.code, message: err.message } };
  res.status(err.status).json(body);
}

/** Terminal error middleware — converts thrown ApiErrors (and anything else) into the standard shape. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    sendError(res, err);
    return;
  }
  console.error('Unhandled error:', err);
  sendError(res, new ApiError(500, 'internal_error', 'Internal server error'));
}
