# ADR-008: Version-based optimistic concurrency on requests

**Status:** Accepted · **Implementation:** Implemented

## Context

A clinic user may confirm from a screen that is out of date, for example after the patient changed the request.

## Decision

Each request has a version. A confirm carries the version the clinic saw, and a mismatch returns `STALE_VERSION`.

## Alternatives

- Last write wins: silently overwrites newer facts.
- Lock the request while someone views it: ties up rows for human think-time.
- Version check: **chosen.**

## Reasons

No locks held while a person decides. The clinic reloads and decides again.

## Consequences

One more error the app must explain well. The gain is that no decision is made on old data.

## Reconsider when

`STALE_VERSION` appears often in normal use, which would point to a screen refresh problem.

## In this repository

The `booking.record_transition` trigger raises `version` on every update, and clients send it in `If-Match`. This is also the code that the loser of a confirm race receives, because the winner has already declined its request ([ADR-010](010-sibling-decline-after-commit.md)). So when judging the condition above, staff collisions will count too, not only stale screens.
