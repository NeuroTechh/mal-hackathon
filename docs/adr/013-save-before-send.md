# ADR-013: The phone saves an action before sending it

**Status:** Accepted · **Implementation:** Not built

## Context

The app can be killed, or the network can drop, between a tap and the reply.

## Decision

The action and its key are written to local storage first (PendingQueue). Only after the API's answer is the saved action cleared.

## Alternatives

- Send first, keep it in memory: a lost action is lost silently.
- Save, then send: **chosen.**

## Reasons

The saved action survives restarts, and together with [ADR-012](012-phone-created-idempotency-keys.md) a retry cannot double-book.

## Consequences

The app needs local storage and a sync engine, and the UI must show "waiting to send" honestly.

## Reconsider when

Local storage problems, such as corruption or growth, appear in the field.

## In this repository

Not built. The app uses the alternative this record rejected: the key lives in memory, so killing the app loses both the action and the key. Booking requests and appointment decisions keep the key across a second tap (`app/src/app/doctor/[id].tsx`, `app/src/components/AppointmentList.tsx`). There is no "waiting to send" state.
