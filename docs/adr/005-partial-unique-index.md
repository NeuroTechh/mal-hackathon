# ADR-005: A partial unique index guards every confirmed slot

**Status:** Accepted · **Implementation:** Implemented, with a [known gap](../architecture/as-built.md#known-gaps)

## Context

Two clinic users, or two retries, can confirm different requests for the same slot at the same instant. Application checks alone can both pass.

## Decision

A unique index on `appointment (slot_id) WHERE status IN ('CONFIRMED','COMPLETED')`. A violation is translated to `SLOT_TAKEN`.

## Alternatives

- Check in code only: fails under a race.
- A unique index on all rows for the slot: would block a new booking after a cancellation.
- Partial unique index: **chosen,** so cancelled appointments do not block the slot.

## Reasons

The database refuses the second booking whatever the code did. It is the last line of defence and costs one index.

## Consequences

Double booking is impossible by construction. The cost: code must handle the violation and turn it into a clean answer.

## Reconsider when

A new appointment status can legitimately share a slot. Then the index condition must change with it.

## In this repository

The index is `one_confirmation` in `backend/sql/001_booking.sql`, and it covers `confirmed` only, not `completed`. An exclusion constraint on doctor and time range adds a stronger guard, again for `confirmed` only. A direct SQL insert of a second confirmed appointment was rejected.

Leaving out `completed` is the gap: a doctor can complete a future visit, which reopens the slot for a second confirmed appointment. A violation returns `SLOT_TAKEN_OR_ALREADY_REQUESTED`, or `CONFLICT` on the routes in `workflows.ts`.
