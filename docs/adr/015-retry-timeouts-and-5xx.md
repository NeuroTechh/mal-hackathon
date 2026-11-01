# ADR-015: Retry only timeouts and 5xx

**Status:** Proposed, until the attempt count and delays are measured · **Implementation:** Not built

## Context

Retrying everything wastes effort and can hide real errors. Retrying nothing loses actions on bad networks.

## Decision

Retry network timeouts and 5xx with growing delays, up to a limit. 409 and 422 are final answers and are never retried. The limit and delays are proposals to be set after measuring (a first guess is at most five attempts).

## Alternatives

- Retry every failure: repeats rule violations that cannot change.
- No automatic retry: the user must retry by hand on every bad signal.
- Selective retry: **chosen.**

## Reasons

A 409 or 422 comes from the rules, so the same request gets the same answer. A timeout or 5xx may succeed later, and [ADR-012](012-phone-created-idempotency-keys.md) makes the repeat safe.

## Consequences

The app must show a clear message for final errors and a quiet "still trying" for retryable ones.

## Reconsider when

Telemetry ([ADR-017](017-hosted-measure.md)) shows retries that never succeed or that overload the API.

## In this repository

Not built. Commands are never retried automatically: a 10-second timeout in `app/src/lib/api.ts` shows an error, and the user retries by hand. Reads use `retry: 1` for any failure (`app/src/lib/query-client.ts`), including 409s.
