# ADR-014: Transactional outbox with a polling worker, no Kafka

**Status:** Accepted · **Implementation:** Partial

## Context

Confirming a booking must notify the patient, but a notification must never be sent for a booking that rolled back, nor lost for one that committed.

## Decision

An outbox row is written in the same transaction as the change. A worker polls the table after the commit and delivers, retrying on failure.

## Alternatives

- Call the push service inside the transaction: a slow or failing vendor holds locks, and a rollback can still leave a sent message.
- Publish to Kafka from the app after commit: the process can die between commit and publish, and the event is lost.
- Kafka with change-data-capture: correct, but adds a broker and connectors to run.
- Outbox plus polling worker: **chosen.**

## Reasons

One transaction writes both the change and the event, so they cannot disagree. A polling worker is the simplest thing that works and uses what we already run.

## Consequences

Delivery is at-least-once, so consumers must tolerate duplicates. Polling adds a small delay, and the table needs routine cleanup.

## Reconsider when

Notification delay or table size is measured as a problem, or several independent consumers need the same events.

## In this repository

The outbox half is built: the `booking.record_transition` trigger writes a row in the same transaction as every appointment insert and update. The worker is not built, so nothing reads the table, `delivered_at` stays empty, and nobody is notified. A one-off check ended with 530 rows written and 0 delivered.

When a worker is added, note that the trigger also fires on updates that do not change the status, such as a check-in.
