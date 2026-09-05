-- Minimal schema for the idempotent booking flow.

CREATE TABLE IF NOT EXISTS rooms (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0)
);

CREATE TABLE IF NOT EXISTS bookings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  room_id    INTEGER NOT NULL REFERENCES rooms (id),
  check_in   DATE NOT NULL,
  check_out  DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

-- One row per (user, idempotency key). The composite PRIMARY KEY is the
-- correctness guarantee: it scopes keys per user AND provides the unique
-- constraint that serialises concurrent retries in the database.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id         TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  booking_id      UUID REFERENCES bookings (id),
  response        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);

-- Seed a couple of rooms so bookings have something to reference.
INSERT INTO rooms (id, name, price_cents)
VALUES (1, 'Standard Queen', 12000),
       (2, 'Deluxe King', 20000)
ON CONFLICT (id) DO NOTHING;
