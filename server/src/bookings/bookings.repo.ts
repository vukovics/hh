import type { PoolClient } from 'pg';
import type { Booking, CreateBookingInput } from './bookings.types.js';

/** Row shape as stored/replayed for an idempotency key. */
interface BookingRow {
  id: string;
  user_id: string;
  room_id: number;
  check_in: string;
  check_out: string;
  created_at: string;
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    roomId: row.room_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    createdAt: row.created_at,
  };
}

/**
 * Try to claim the (user, key) pair. Returns true if THIS transaction inserted
 * the row (i.e. we own the work), false if it already existed.
 *
 * ON CONFLICT DO NOTHING blocks on a concurrent, uncommitted insert of the same
 * key until that transaction commits or rolls back — this is what serialises
 * two simultaneous retries at the database level.
 */
export async function claimIdempotencyKey(
  client: PoolClient,
  userId: string,
  key: string,
): Promise<boolean> {
  const result = await client.query(
    `INSERT INTO idempotency_keys (user_id, idempotency_key)
     VALUES ($1, $2)
     ON CONFLICT (user_id, idempotency_key) DO NOTHING
     RETURNING user_id`,
    [userId, key],
  );
  return result.rowCount === 1;
}

/** Fetch the previously stored success response for an already-seen key. */
export async function getStoredResponse(
  client: PoolClient,
  userId: string,
  key: string,
): Promise<Booking | null> {
  const result = await client.query<{ response: Booking | null }>(
    `SELECT response FROM idempotency_keys WHERE user_id = $1 AND idempotency_key = $2`,
    [userId, key],
  );
  return result.rows[0]?.response ?? null;
}

export async function insertBooking(
  client: PoolClient,
  userId: string,
  input: CreateBookingInput,
): Promise<Booking> {
  const result = await client.query<BookingRow>(
    `INSERT INTO bookings (user_id, room_id, check_in, check_out)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, room_id, to_char(check_in, 'YYYY-MM-DD') AS check_in,
               to_char(check_out, 'YYYY-MM-DD') AS check_out, created_at`,
    [userId, input.roomId, input.checkIn, input.checkOut],
  );
  return toBooking(result.rows[0]!);
}

/** Attach the created booking + its response to the claimed idempotency row. */
export async function storeResult(
  client: PoolClient,
  userId: string,
  key: string,
  booking: Booking,
): Promise<void> {
  await client.query(
    `UPDATE idempotency_keys
        SET booking_id = $3, response = $4
      WHERE user_id = $1 AND idempotency_key = $2`,
    [userId, key, booking.id, booking],
  );
}

export async function roomExists(client: PoolClient, roomId: number): Promise<boolean> {
  const result = await client.query(`SELECT 1 FROM rooms WHERE id = $1`, [roomId]);
  return result.rowCount === 1;
}
