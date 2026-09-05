import { pool } from '../db/pool.js';
import { ApiError } from '../http/errors.js';
import {
  claimIdempotencyKey,
  getStoredResponse,
  insertBooking,
  roomExists,
  storeResult,
} from './bookings.repo.js';
import type { Booking, CreateBookingInput } from './bookings.types.js';

export interface CreateBookingResult {
  booking: Booking;
  /** true when we returned a previously stored result instead of creating a new booking. */
  replayed: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_KEY_LENGTH = 255;

/** Validate the Idempotency-Key header. Presence + shape only — we do NOT trust it to be unique. */
export function validateIdempotencyKey(raw: string | undefined): string {
  const key = raw?.trim();
  if (!key) {
    throw new ApiError(400, 'missing_idempotency_key', 'Idempotency-Key header is required');
  }
  if (key.length > MAX_KEY_LENGTH) {
    throw new ApiError(400, 'invalid_idempotency_key', 'Idempotency-Key is too long');
  }
  return key;
}

/** Validate + narrow the request body at the API boundary. */
export function parseCreateBookingInput(body: unknown): CreateBookingInput {
  if (typeof body !== 'object' || body === null) {
    throw new ApiError(400, 'invalid_request', 'Request body must be an object');
  }
  const { roomId, checkIn, checkOut } = body as Record<string, unknown>;

  if (typeof roomId !== 'number' || !Number.isInteger(roomId) || roomId <= 0) {
    throw new ApiError(400, 'invalid_request', 'roomId must be a positive integer');
  }
  if (typeof checkIn !== 'string' || !DATE_RE.test(checkIn)) {
    throw new ApiError(400, 'invalid_request', 'checkIn must be a YYYY-MM-DD date');
  }
  if (typeof checkOut !== 'string' || !DATE_RE.test(checkOut)) {
    throw new ApiError(400, 'invalid_request', 'checkOut must be a YYYY-MM-DD date');
  }
  if (checkOut <= checkIn) {
    throw new ApiError(400, 'invalid_request', 'checkOut must be after checkIn');
  }
  return { roomId, checkIn, checkOut };
}

/**
 * Idempotent booking creation.
 *
 * The whole operation runs in ONE transaction so the booking and its stored
 * idempotency result commit together — a crash mid-flight rolls both back, and a
 * later retry re-attempts cleanly (it does not see a phantom success).
 */
export async function createBooking(
  userId: string,
  idempotencyKey: string,
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const owns = await claimIdempotencyKey(client, userId, idempotencyKey);
    if (!owns) {
      // Key already committed by a prior request (blocking guaranteed it finished).
      const stored = await getStoredResponse(client, userId, idempotencyKey);
      await client.query('COMMIT');
      if (!stored) {
        // Should not happen: committed key rows always carry a response.
        throw new ApiError(409, 'idempotency_conflict', 'Request is still being processed');
      }
      return { booking: stored, replayed: true };
    }

    // We own the key: validate referenced room, create the booking, store the result.
    if (!(await roomExists(client, input.roomId))) {
      throw new ApiError(422, 'unknown_room', `Room ${input.roomId} does not exist`);
    }
    const booking = await insertBooking(client, userId, input);
    await storeResult(client, userId, idempotencyKey, booking);

    await client.query('COMMIT');
    return { booking, replayed: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
