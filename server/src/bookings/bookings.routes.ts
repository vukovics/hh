import { Router } from 'express';
import { requireUser } from '../http/auth.js';
import {
  createBooking,
  parseCreateBookingInput,
  validateIdempotencyKey,
} from './bookings.service.js';

export const bookingsRouter: Router = Router();

/**
 * POST /bookings — create a booking idempotently.
 * Thin controller: read identity + key + body, delegate to the service.
 * Express 5 forwards rejected async handlers to the error middleware.
 */
bookingsRouter.post('/bookings', requireUser, async (req, res) => {
  const key = validateIdempotencyKey(req.header('Idempotency-Key'));
  const input = parseCreateBookingInput(req.body);
  const { booking, replayed } = await createBooking(req.userId!, key, input);
  res.status(replayed ? 200 : 201).json(booking);
});
