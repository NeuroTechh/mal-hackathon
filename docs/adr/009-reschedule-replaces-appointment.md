# ADR-009: A reschedule is a new request that replaces the old appointment

**Status:** Accepted · **Implementation:** Implemented

## Context

Moving an appointment must never leave the patient with nothing if the new time is refused.

## Decision

A reschedule is a new request carrying `replaces_appointment_id`. The old appointment is cancelled in the same commit that confirms the new one.

## Alternatives

- Cancel first, then rebook: a rejected rebook leaves the patient with no appointment.
- Edit the appointment's slot in place: hides history and complicates the unique index.
- Replace on confirm: **chosen.**

## Reasons

The move succeeds as a whole or not at all, and both appointments stay in the history.

## Consequences

The confirm path is longer, and it locks two slots ([ADR-006](006-row-locks-in-fixed-order.md)).

## Reconsider when

A new product rule changes who can move whose appointment.

## In this repository

Patient reschedules follow this record, with the column named `previous_id`. The old visit stays confirmed until the confirm in `bookings.ts` cancels it, and `test:workflows` covers this. Shared records carry over to the new visit.

Hospital reschedules skip the request: the hospital is the approver, so `workflows.ts` swaps the two appointments in one transaction. The confirm locks the old appointment rather than its slot, so it does not lock two slots as the consequences above expect.
