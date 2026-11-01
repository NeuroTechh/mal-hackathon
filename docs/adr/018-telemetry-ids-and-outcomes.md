# ADR-018: Telemetry carries IDs and outcomes only

**Status:** Accepted · **Implementation:** Not built

## Context

NeuroTechh handles health-adjacent appointment data, and monitoring tools are a common way for it to leak.

## Decision

Allowed: IDs, attempt number, outcome, HTTP status, screen and role. Forbidden: names, contact details, notes, free text and slot times.

## Alternatives

- Send everything and mask later: one missed rule leaks data.
- Allow-list of fields: **chosen.**

## Reasons

An allow-list fails closed: a new field is blocked until someone adds it on purpose.

## Consequences

Debugging sometimes needs a lookup by ID in our own database, because the monitor shows no details.

## Reconsider when

A proposed new field has a clear, reviewed need. It goes through review, not through a quiet code change.

## In this repository

There is no allow-list, because the app sends Measure nothing of its own: no custom events, spans or attributes. What Measure collects is whatever the SDK captures by default (see [its privacy defaults](../architecture/hld.md#observability-and-error-tracing-with-measure)). The allow-list is due to arrive with the Telemetry port ([ADR-003](003-dependencies-point-inward.md)).
