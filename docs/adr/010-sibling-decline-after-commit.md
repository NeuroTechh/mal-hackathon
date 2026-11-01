# ADR-010: Sibling requests are declined by a retried job after the commit

**Status:** Accepted · **Implementation:** Differs

## Context

When one request wins a slot, the other pending requests for it should be declined.

## Decision

After the commit, a separate job declines the siblings. It is retried until it succeeds.

## Alternatives

- Decline them inside the confirm transaction: the transaction grows with the number of siblings and holds locks longer.
- Leave them pending: clinics would see requests that can never succeed.
- Decline after the commit: **chosen.**

## Reasons

The booking commits fast. A sibling that is still pending for a moment is harmless, because confirming it fails with `SLOT_TAKEN`.

## Consequences

A short window where stale pending requests are visible. The correctness rule is unaffected.

## Reconsider when

The delay between booking and sibling decline is long enough for users to notice.

## In this repository

The code does the opposite. The confirm in `bookings.ts` declines siblings inside its transaction, which is the first alternative above and also what the [production design](../architecture/production-design.md#where-races-happen-and-what-resolves-each) describes. There is no job.

This removes the stale window and needs no retries, at the cost this record predicted: the transaction grows with the number of siblings. One confirm declined 199 siblings correctly in a one-off check, but its timing was not measured. It also changes the loser's error from `SLOT_TAKEN` to `STALE_VERSION`.

The team has not yet decided whether to change the code or update this record.
