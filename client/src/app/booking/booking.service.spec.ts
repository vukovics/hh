import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BookingService } from './booking.service';
import { CreateBookingRequest } from './booking.models';

const request: CreateBookingRequest = { roomId: 1, checkIn: '2026-10-01', checkOut: '2026-10-03' };

describe('BookingService idempotency key lifecycle', () => {
  let service: BookingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('generates a key when a new booking attempt starts', () => {
    expect(service.idempotencyKey()).toBeNull();
    service.startNewAttempt();
    expect(service.idempotencyKey()).toBeTruthy();
  });

  it('reuses the same key when retrying the same attempt', () => {
    service.startNewAttempt();
    const key = service.idempotencyKey();

    service.submit(request).subscribe({ error: () => {} });
    const first = httpMock.expectOne('/api/bookings');
    expect(first.request.headers.get('Idempotency-Key')).toBe(key);
    first.flush(null, { status: 500, statusText: 'Server Error' }); // simulate a failed attempt

    // Retry: same attempt -> same key, both in state and on the wire.
    service.submit(request).subscribe();
    const retry = httpMock.expectOne('/api/bookings');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush({ id: 'b1' });

    expect(service.idempotencyKey()).toBe(key);
  });

  it('generates a different key when a new booking is started', () => {
    service.startNewAttempt();
    const firstKey = service.idempotencyKey();

    service.startNewAttempt();
    const secondKey = service.idempotencyKey();

    expect(secondKey).toBeTruthy();
    expect(secondKey).not.toBe(firstKey);
  });
});
