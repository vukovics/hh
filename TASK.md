# TASK.md — Mock HappyHotel Technical Interview

## Scenario

You are working on a small hotel-booking application.

Guests can search available rooms and create bookings.

The product team has reported a problem:

> When a user clicks "Book" more than once, or when the browser retries a request because of a network problem, the backend can create duplicate bookings.

Your task is to improve the booking flow so that a booking request is **idempotent**.

There is an Angular frontend and a Node.js/TypeScript backend.

---

## Goal

Implement an idempotent booking flow.

A client should be able to send an idempotency key with a booking request.

For the same user and the same idempotency key:

- the first successful request creates the booking
- subsequent requests must return the same booking result
- a retry must not create another booking

Different idempotency keys represent different booking attempts.

---

## Functional requirements

### 1. Frontend

Update the booking flow so that each booking attempt generates a new idempotency key.

Important:

- The key should be generated when the user starts a new booking attempt.
- Clicking retry for the same attempt should reuse the same key.
- Starting a completely new booking should generate a new key.
- Do not put the key in the URL.
- Send the key in an HTTP header:

`Idempotency-Key`

Do not expose implementation details to the user.

### 2. Backend

Update the booking endpoint to read the `Idempotency-Key` header.

For a given authenticated user:

- if the key has never been seen, process the booking normally
- store the result associated with the key
- if the same key is received again, return the previously stored result
- do not create another booking

The idempotency key must be scoped to the user.

For example:

```text
User A + key abc123
```

must be independent from:

```text
User B + key abc123
```

### 3. Validation

Reject requests that do not contain a valid idempotency key.

Use an appropriate HTTP status code and follow the existing API error format.

Do not trust the frontend to provide a unique key.

### 4. Concurrency

Consider this case:

Two identical requests arrive at almost exactly the same time:

```text
Request A ──────┐
                ├──> POST /bookings
Request B ──────┘
```

Your implementation must not create two bookings.

Do not solve this only with an in-memory JavaScript `Map`, because the application may run multiple Node.js instances.

Use the database to provide the required consistency.

### 5. Existing architecture

Before implementing anything:

- inspect the existing booking endpoint
- inspect the database models/schema
- inspect how authentication/user identity is represented
- inspect existing Angular booking services/components
- inspect existing tests
- identify the project's existing error-handling conventions

Follow existing patterns rather than introducing a new architecture unnecessarily.

---

## Testing requirements

Add tests covering at least:

1. First request with a new key creates one booking.
2. Repeating the request with the same user + same key does not create another booking.
3. Same key used by two different users does not collide.
4. Missing idempotency key is rejected.
5. Two concurrent requests with the same user + same key cannot create duplicate bookings.
6. A failed booking should not incorrectly make a later retry return a successful booking result.

For frontend behavior, test that:

1. A new booking attempt generates a key.
2. Retrying the same attempt reuses the key.
3. Starting a new booking generates a different key.

Use the testing framework and conventions already present in the repository.

---

## Non-functional requirements

Keep the implementation:

- simple
- maintainable
- type-safe
- production-oriented
- compatible with multiple backend instances

Avoid:

- global in-memory state for correctness
- unnecessary dependencies
- unrelated refactoring
- large rewrites

---

## Discussion points

During the interview, be prepared to explain:

### Idempotency

Why is an idempotency key needed?

### Key generation

Where should the key be generated?

Should the same key be reused forever?

### Database consistency

How do you prevent two concurrent requests from both creating a booking?

### Failure handling

What happens if the server creates the booking but crashes before storing the idempotency result?

What would you change if this needed to be extremely robust in production?

### Distributed systems

What changes if you run 10 Node.js instances behind a load balancer?

### API design

Why use an HTTP header rather than putting the idempotency key in the request body or URL?

### Testing

Which tests give you the most confidence that duplicate bookings cannot happen?

---

## Interview constraint

You are explicitly encouraged to use an AI coding agent.

However, you are responsible for the final implementation.

Your workflow should demonstrate:

```text
Understand
→ Inspect
→ Plan
→ Implement
→ Test
→ Review
→ Explain
```

Do not blindly accept AI-generated code.

The interviewer will evaluate both the implementation and your engineering reasoning.
