# AGENTS.md

## Project context

This is a small hotel-booking application used for a senior full-stack coding interview.

The repository contains:
- `client/` — Angular frontend
- `server/` — Node.js/TypeScript backend
- PostgreSQL — application database
- Docker Compose — local infrastructure

## Engineering rules

1. Read `TASK.md` before implementing anything.
2. Inspect the existing code and follow its conventions before creating new abstractions.
3. Keep changes small and focused.
4. Do not rewrite working code without a clear reason.
5. Prefer existing services, components, types, and utilities.
6. Do not add dependencies unless they are genuinely necessary.
7. Keep TypeScript strict and avoid `any`.
8. Validate data at API boundaries.
9. Handle loading, error, empty, and success states in the UI.
10. Consider race conditions and duplicate requests where relevant.
11. Keep API behavior backward-compatible unless the task explicitly requires otherwise.
12. Add or update tests for important business logic and edge cases.

## Angular guidelines

- Prefer standalone components and the existing project style.
- Use Angular signals for local reactive state when appropriate.
- Use `computed()` for derived state.
- Use `effect()` only for actual side effects.
- Avoid unnecessary subscriptions.
- Use `OnPush` where consistent with the existing codebase.
- Keep presentation components simple and move business logic into appropriate services.

## Backend guidelines

- Keep controllers/routes thin.
- Put business logic in services/use-case layers if that pattern already exists.
- Do not trust client-provided data.
- Return appropriate HTTP status codes.
- Avoid N+1 database queries.
- Consider concurrent requests and duplicate operations.

## Testing

Before considering the task complete:
- run the relevant unit/integration tests
- run TypeScript checks/build if available
- inspect the final git diff
- manually verify the important user flow if possible

## AI agent behavior

The AI agent is an implementation partner, not the decision maker.

Before coding:
1. inspect the repository
2. understand the existing architecture
3. identify relevant files
4. propose a concise plan

Implement one logical step at a time.

Do not make broad unrelated improvements.

After each significant step:
- run relevant tests
- inspect the diff
- explain any important trade-offs

If requirements are ambiguous, identify the ambiguity and ask for clarification rather than silently inventing product behavior.
