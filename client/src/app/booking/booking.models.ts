export interface CreateBookingRequest {
  roomId: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
}

export interface Booking {
  id: string;
  userId: string;
  roomId: number;
  checkIn: string;
  checkOut: string;
  createdAt: string;
}
