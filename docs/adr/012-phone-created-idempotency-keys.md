# ADR-012: Idempotency keys are created on the phone

**Status:** Accepted · **Implementation:** Implemented

## Context

A response can be lost after the server has already committed. The phone then cannot tell whether the booking happened.

## Decision

The phone creates a key K for each action, saves it with the action, and sends it as `Idempotency-Key`. The API stores the result with a hash of the payload. A replay returns the stored result. The same key with a different payload returns 409 `IDEMPOTENCY_CONFLICT`.

## Alternatives

- Server-generated keys: the server cannot know that a retry is the same action unless the client says so.
- Natural keys (patient, slot, time): block legitimate repeats and fail on reschedules.
- Client-generated key: **chosen.**

## Reasons

Only the client knows whether it is retrying or acting anew. A stored result makes a retry safe.

## Consequences

Idempotency records must be stored and eventually cleaned up. How long to keep them is a number to set from real retry behaviour, and we do not assume one here.

## Reconsider when

Another client type, such as a partner integration, cannot generate keys reliably.

## In this repository

`command()` in `app/src/lib/api.ts` creates the key with `expo-crypto`. On the server, `booking.commands` stores the result by user and key, with a SHA-256 fingerprint of the path, body and `If-Match`, and an advisory lock serialises concurrent retries of one key. A replay returns 200 with the stored result; a mismatch returns 409 `IDEMPOTENCY_KEY_REUSED`.

Saving the key before sending is [ADR-013](013-save-before-send.md), which is not built. Records are never cleaned up, and `booking.commands` has no `created_at` to clean them up by.
