import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';

let server: Server;
let base: string;

before(async () => {
  await migrate();
  server = createApp().listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  base = `http://localhost:${port}`;
});

after(async () => {
  server.close();
  await pool.end();
});

beforeEach(async () => {
  await pool.query('TRUNCATE idempotency_keys, bookings RESTART IDENTITY CASCADE');
});

interface PostOptions {
  userId?: string;
  key?: string;
  body?: unknown;
}

function post({ userId, key, body }: PostOptions): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId !== undefined) headers['X-User-Id'] = userId;
  if (key !== undefined) headers['Idempotency-Key'] = key;
  return fetch(`${base}/bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? { roomId: 1, checkIn: '2026-10-01', checkOut: '2026-10-03' }),
  });
}

async function countBookings(userId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM bookings WHERE user_id = $1',
    [userId],
  );
  return Number(rows[0]!.count);
}

test('first request with a new key creates exactly one booking', async () => {
  const res = await post({ userId: 'u1', key: 'k1' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id);
  assert.equal(await countBookings('u1'), 1);
});

test('same user + same key does not create a second booking', async () => {
  const first = await post({ userId: 'u1', key: 'k1' });
  const second = await post({ userId: 'u1', key: 'k1' });

  assert.equal(first.status, 201);
  assert.equal(second.status, 200); // replayed
  const a = await first.json();
  const b = await second.json();
  assert.equal(a.id, b.id); // identical result
  assert.equal(await countBookings('u1'), 1);
});

test('same key used by two different users does not collide', async () => {
  const a = await post({ userId: 'userA', key: 'shared' });
  const b = await post({ userId: 'userB', key: 'shared' });

  assert.equal(a.status, 201);
  assert.equal(b.status, 201); // independent, both create
  const bodyA = await a.json();
  const bodyB = await b.json();
  assert.notEqual(bodyA.id, bodyB.id);
  assert.equal(await countBookings('userA'), 1);
  assert.equal(await countBookings('userB'), 1);
});

test('missing idempotency key is rejected with 400', async () => {
  const res = await post({ userId: 'u1' }); // no key
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'missing_idempotency_key');
  assert.equal(await countBookings('u1'), 0);
});

test('two concurrent requests with same user + key create only one booking', async () => {
  const [r1, r2] = await Promise.all([
    post({ userId: 'race', key: 'same' }),
    post({ userId: 'race', key: 'same' }),
  ]);

  const statuses = [r1.status, r2.status].sort();
  assert.deepEqual(statuses, [200, 201]); // exactly one created, one replayed
  const [b1, b2] = await Promise.all([r1.json(), r2.json()]);
  assert.equal(b1.id, b2.id); // both see the same booking
  assert.equal(await countBookings('race'), 1);
});

test('a failed booking does not make a later retry return a false success', async () => {
  // First attempt references an unknown room -> 422, transaction rolls back,
  // so the key is NOT recorded as a success.
  const failed = await post({
    userId: 'u1',
    key: 'k1',
    body: { roomId: 9999, checkIn: '2026-10-01', checkOut: '2026-10-03' },
  });
  assert.equal(failed.status, 422);
  assert.equal(await countBookings('u1'), 0);

  // Reusing the same key now proceeds fresh and creates a real booking.
  const retry = await post({ userId: 'u1', key: 'k1' });
  assert.equal(retry.status, 201);
  assert.equal(await countBookings('u1'), 1);
});
