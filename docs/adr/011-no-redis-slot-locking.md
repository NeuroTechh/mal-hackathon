# ADR-011: No Redis for slot locking

**Status:** Accepted · **Implementation:** Implemented

## Context

A cache with locks is a common way to keep slots from being taken twice.

## Decision

Do not use Redis, or any second system, for slot locks.

## Alternatives

- Redis locks in front of Postgres: fast, but the lock can expire or fail over and disagree with the database.
- Postgres row locks and the unique index ([ADR-005](005-partial-unique-index.md), [ADR-006](006-row-locks-in-fixed-order.md)): **chosen.**

## Reasons

The lock and the data live together, so they cannot disagree. There is one fewer system to run, secure and learn.

## Consequences

Hot-slot contention is handled by Postgres. We accept that rather than adding a component.

## Reconsider when

Measured lock contention on Postgres limits throughput after query and transaction tuning.

## In this repository

Redis is only used as Better Auth's secondary storage (`backend/src/lib/auth.ts`) and is checked by `/health/ready`. The API does still connect to it at startup, so it remains a dependency of the running service, just not of the booking rule.
