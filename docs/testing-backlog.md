# Testing backlog

Requested after the core flows are usable. Keep these as dedicated suites with repeatable fixtures and isolated Docker databases.

- Concurrency: hundreds of approvals for a single slot; competing bookings across overlapping time ranges; concurrent check-ins and idempotency retries.
- Race conditions: confirm versus cancel/expiry; reschedule versus cancellation/completion; blocking a slot versus requesting it; stale versions and out-of-order responses; transaction rollback and lock ordering.
- Load: sustained and burst search, availability, requests and clinic decisions; measure p50/p95/p99, error rates, connection pool saturation, lock waits and outbox lag. Establish capacity targets before choosing pass thresholds.
- Security: tenant and role isolation, object ownership, upload size/type/content validation, QR replay/revocation, input injection, rate limiting and authorization bypass. Verify demo identity headers are disabled in production. Test real auth when it replaces role buttons.
- Faults: Redis loss, PostgreSQL restarts, dropped responses after commit, worker retries and storage failures.

Current checks: `npm run test:integration` and `npm run test:workflows` in backend. They cover functional booking and workflow behavior, not the complete suites above.
