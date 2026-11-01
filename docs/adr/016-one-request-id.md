# ADR-016: One request ID is the idempotency key and the trace key

**Status:** Accepted · **Implementation:** Not built

## Context

When a booking goes wrong, someone must follow it from the phone to the database. Two separate IDs would need a lookup between them.

## Decision

The request ID K is sent as `Idempotency-Key` and `X-Request-Id`. It appears in API log lines and on the outbox row, and is a Measure attribute on the phone. The outcome is one of: `ok`, `network_timeout`, `rejected_slot_taken`, `rejected_validation`, `server_error`.

## Alternatives

- Separate trace ID: one more thing to generate and join.
- Full distributed tracing platform: powerful, but it is another system to run for a single API.
- Reuse K: **chosen.**

## Reasons

One ID answers "what happened to this tap" in every place it touched.

## Consequences

The key must never carry meaning or personal data. It is a random identifier only.

## Reconsider when

Several services call each other, so one action needs a tree of spans.

## In this repository

Not built. K is sent as `Idempotency-Key` and stored in `booking.commands`, and it is a random UUID as this record requires. But there is no `X-Request-Id`, the API does not log requests, the outbox has no column for K, and nothing attaches it to Measure. A failure cannot be followed from the phone to the database yet.
