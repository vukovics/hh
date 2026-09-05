export interface Booking {
  id: string;
  userId: string;
  roomId: number;
  checkIn: string; // ISO date (YYYY-MM-DD)
  checkOut: string;
  createdAt: string;
}

export interface CreateBookingInput {
  roomId: number;
  checkIn: string;
  checkOut: string;
}
