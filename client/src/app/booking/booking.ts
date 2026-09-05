import { Component, inject, signal } from '@angular/core';
import { Booking, CreateBookingRequest } from './booking.models';
import { BookingService } from './booking.service';

type Status = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-booking',
  template: `
    <section class="booking">
      <h1>Book a room</h1>

      <form (submit)="book($event)">
        <label for="roomId">Room</label>
        <select id="roomId" [value]="roomId()" (change)="roomId.set(+asValue($event))">
          <option [value]="1">Standard Queen</option>
          <option [value]="2">Deluxe King</option>
        </select>

        <label for="checkIn">Check-in</label>
        <input id="checkIn" type="date" [value]="checkIn()" (input)="checkIn.set(asValue($event))" />

        <label for="checkOut">Check-out</label>
        <input
          id="checkOut"
          type="date"
          [value]="checkOut()"
          (input)="checkOut.set(asValue($event))"
        />

        <button type="submit" [disabled]="status() === 'loading'">
          {{ status() === 'loading' ? 'Booking…' : 'Book' }}
        </button>
      </form>

      @if (status() === 'error') {
        <p role="alert" class="error">
          {{ errorMessage() }}
          <button type="button" (click)="retry()">Retry</button>
        </p>
      }

      @if (status() === 'success' && result(); as booking) {
        <p role="status" class="success">Booking confirmed (ref {{ booking.id }}).</p>
        <button type="button" (click)="startNewBooking()">Book another room</button>
      }
    </section>
  `,
})
export class BookingComponent {
  private readonly bookingService = inject(BookingService);

  protected readonly roomId = signal(1);
  protected readonly checkIn = signal('');
  protected readonly checkOut = signal('');

  protected readonly status = signal<Status>('idle');
  protected readonly result = signal<Booking | null>(null);
  protected readonly errorMessage = signal('');

  constructor() {
    // Opening the form starts a fresh attempt with its own idempotency key.
    this.bookingService.startNewAttempt();
  }

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected book(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  /** Retry the SAME attempt — reuses the existing idempotency key. */
  protected retry(): void {
    this.submit();
  }

  /** Start a brand-new booking — mints a new idempotency key and resets the UI. */
  protected startNewBooking(): void {
    this.bookingService.startNewAttempt();
    this.status.set('idle');
    this.result.set(null);
    this.errorMessage.set('');
  }

  private submit(): void {
    const request: CreateBookingRequest = {
      roomId: this.roomId(),
      checkIn: this.checkIn(),
      checkOut: this.checkOut(),
    };
    this.status.set('loading');
    this.bookingService.submit(request).subscribe({
      next: (booking) => {
        this.result.set(booking);
        this.status.set('success');
      },
      error: () => {
        this.errorMessage.set('Could not complete your booking. Please try again.');
        this.status.set('error');
      },
    });
  }
}
