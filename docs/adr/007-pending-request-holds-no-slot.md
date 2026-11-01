# ADR-007: A pending request holds no slot

**Status:** Accepted · **Implementation:** Implemented

## Context

Patients ask; the clinic decides. If asking blocked the slot, one patient could keep it from everyone else.

## Decision

A request in PENDING writes no hold on the slot. The slot becomes BOOKED only when a request is confirmed.

## Alternatives

- Soft hold with a timeout: friendlier to the requester but adds expiry timers, cleanup jobs and more states to get wrong.
- No hold: **chosen.**

## Reasons

Fewer states, no timers, and the clinic stays in control of who gets the slot.

## Consequences

Several patients may ask for the same slot, and all but one will be declined. The product must make that clear.

## Reconsider when

Users complain of declined requests often enough that a short, visible hold would clearly help.

## In this repository

Availability in `GET /v1/doctors/:id/slots` only counts confirmed appointments. Five patients requested one slot and it stayed listed. The request inbox tells staff that approving one declines the others.
