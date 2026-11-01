# ADR-003: Dependencies point inward

**Status:** Accepted · **Implementation:** Not built

## Context

Booking rules must not depend on a web framework, a database driver or a vendor SDK, or each upgrade becomes a rule change.

## Decision

The booking policy and its ports (interfaces) sit at the centre. Adapters for Postgres, push delivery, HTTP and telemetry sit outside and depend on the centre, never the reverse. On the phone this gives RequestStore, PendingQueue, SyncEngine, ApiClient and a Telemetry port with a Measure adapter and a Fake.

## Alternatives

- Layered by technology (controllers, services, repositories calling each other freely): quick to start, but rules and I/O drift together.
- Ports and adapters: **chosen.**

## Reasons

The rules can be tested without a database or a network, and a vendor can be swapped by replacing one adapter.

## Consequences

A few extra interfaces to write and keep honest. The gain is cheap tests and cheap replacement.

## Reconsider when

A port has only ever had one adapter and no test double after a long time. Then it is ceremony and can be removed.

## In this repository

Not built. The route handlers in `backend/src/modules/` hold the rules and the SQL together, so both test suites need a real database. On the phone, `app/src/lib/api.ts` is the only one of the named pieces that exists in some form.

The legal transitions are the one rule kept apart from the handlers: they live in the `booking.record_transition` trigger, which enforces them whatever the application does.
