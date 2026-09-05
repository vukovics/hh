# Production hardening notes

The interview implementation is intentionally minimal. Items below were called
**out of scope** for this task but are what I would add before production.

## Idempotency correctness

- **Same key, different payload.** Today any request that reuses a committed key
  replays the stored booking, even if the body differs. Production should store a
  hash/fingerprint of the request body on the idempotency row and return `422`
  when a reused key arrives with a mismatched payload — this catches client bugs
  where one key is accidentally reused for two different bookings.
- **Stuck in-flight requests.** The design serialises concurrent retries by
  blocking on the unique constraint inside one transaction, so there is no
  committed "pending" state to leak. If we ever split claim and completion into
  separate transactions (e.g. to shorten lock hold time), we would need a
  `status` column plus a TTL/reaper to expire abandoned `pending` rows and a
  `409 Retry-After` response while one is in flight.
- **Key retention.** Idempotency rows grow unbounded. Add a retention policy
  (e.g. delete rows older than 24–72h) matched to how long clients may retry.

## Auth

- `X-User-Id` is a stub. Replace with real authentication (verified bearer/JWT,
  session, or mTLS). Only `req.userId` (backend) and the request header (frontend
  interceptor) need to change — the idempotency logic is unaffected.

## Data model / concurrency

- **Booking availability.** No overlap/double-booking check exists — two users
  can book the same room for the same dates. Production needs an availability
  constraint (e.g. exclusion constraint on room + date range) which is a separate
  concern from request idempotency.
- **Lock hold time.** The unique-index lock is held for the duration of booking
  creation. Fine at this scale; under high contention consider advisory locks or
  a shorter claim/commit split (with the pending-state handling above).

## Operations

- Use a real migration tool (node-pg-migrate / Flyway) instead of the ad-hoc
  `schema.sql` runner, with versioned, reversible migrations.
- Add structured logging, request IDs, metrics on replayed-vs-created ratio, and
  health/readiness probes that check DB connectivity.
- CORS/proxy: the dev setup uses an Angular proxy (`/api` → `:3000`). Production
  would front both behind one origin or configure CORS explicitly.

## Failure semantics (discussion point)

- Booking creation and idempotency-result storage commit in **one transaction**,
  so a crash mid-flight rolls both back and a later retry re-attempts cleanly —
  it never observes a phantom success. If the two ever had to be split across
  systems (e.g. an external payment call between them), we would need the
  outbox pattern or a saga to keep them consistent.
