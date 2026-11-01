# ADR-006: Row locks in a fixed order

**Status:** Accepted · **Implementation:** Partial

## Context

A confirm touches the slot and the request. Two confirms that lock in opposite orders can wait on each other forever.

## Decision

Lock the slot row first, then the request row, with `SELECT ... FOR UPDATE`. A reschedule locks both slots in ascending ID order.

## Alternatives

- No locks, rely on the unique index: correct, but concurrent attempts fail late and noisily.
- Serializable isolation everywhere: correct, but transactions can be aborted and must be retried broadly.
- Explicit row locks in one order: **chosen.**

## Reasons

One lock order everywhere rules out deadlocks, and waiting callers see the final state and answer cleanly.

## Consequences

Every new write path must follow the order, so it becomes a code-review rule. Locks are held only inside short transactions.

## Reconsider when

Lock waits show up as a measured latency problem on hot slots.

## In this repository

Confirm, decline, cancel and the visit commands lock the slot, then the appointment, in `bookings.ts` and `workflows.ts`. Reschedules do not sort: `POST /v1/visits/:id/reschedule` locks the visit's slot, then the new one, so [crossing reschedules can deadlock](../architecture/as-built.md#known-gaps).
