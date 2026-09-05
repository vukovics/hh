import express, { type Express } from 'express';
import { bookingsRouter } from './bookings/bookings.routes.js';
import { errorHandler } from './http/errors.js';

/** Express app factory — kept separate from `listen` so tests can mount it directly. */
export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(bookingsRouter);

  // Terminal error handler must be registered last.
  app.use(errorHandler);
  return app;
}
