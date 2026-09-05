import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Booking, CreateBookingRequest } from './booking.models';

const BOOKINGS_URL = '/api/bookings';

/**
 * Owns the idempotency-key lifecycle for the booking flow and talks to the API.
 *
 * The key identifies a single booking *attempt*:
 *  - `startNewAttempt()` mints a fresh key (call it when the user opens a new booking).
 *  - `submit()` reuses the current key, so retrying a failed attempt is safe.
 *
 * The user never sees the key; it travels only in the `Idempotency-Key` header.
 */
@Service()
export class BookingService {
  private readonly http = inject(HttpClient);

  private readonly _idempotencyKey = signal<string | null>(null);
  /** Exposed for tests/diagnostics; not shown to the user. */
  readonly idempotencyKey = this._idempotencyKey.asReadonly();

  /** Begin a new booking attempt with a fresh idempotency key. */
  startNewAttempt(): void {
    this._idempotencyKey.set(crypto.randomUUID());
  }

  /**
   * Submit the current attempt. Reuses the existing key (a retry uses the same
   * key); if no attempt has started yet, one is minted so the request is always keyed.
   */
  submit(request: CreateBookingRequest): Observable<Booking> {
    if (this._idempotencyKey() === null) {
      this.startNewAttempt();
    }
    return this.http.post<Booking>(BOOKINGS_URL, request, {
      headers: {
        'Idempotency-Key': this._idempotencyKey()!,
        // Auth stub for the interview scope — real auth would attach identity
        // via an HTTP interceptor instead of a hard-coded header here.
        'X-User-Id': 'demo-user',
      },
    });
  }
}
