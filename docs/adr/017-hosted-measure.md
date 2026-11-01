# ADR-017: Measure, hosted, for phone error tracing

**Status:** Accepted · **Implementation:** Partial

## Context

Errors that happen on the device, such as a timeout or a crash, never reach the API logs.

## Decision

Use Measure from the phone app, behind a Telemetry port with a Measure adapter and a Fake for tests. Use the hosted service instead of running our own.

## Alternatives

- Build our own error pipeline: more control, much more to run.
- Self-host Measure: Measure's docs recommend a single Linux machine with at least 4 vCPU, 16 GB and 100 GB, and 32 GB or more for its ClickHouse. That adds a database we would operate, which cuts against our own technology policy. The docs recommend the hosted cloud for scale.
- Hosted Measure: **chosen.**

## Reasons

It gives crash and error tracing without a new database for us to run, and the port keeps it replaceable.

## Consequences

Data leaves our systems, so [ADR-018](018-telemetry-ids-and-outcomes.md) limits what is sent. Open points still to verify before release: the React Native method signatures, Expo Go support, SDK overhead and the masking setting names.

## Reconsider when

Price, privacy terms or reliability change, or the SDK cannot meet the open points above.

## In this repository

`@measuresh/react-native` is a dependency, and `app/src/lib/measure.ts` initialises it from the root layout when `MEASURE_*` values are set. It needs a native development build rather than Expo Go, as the README explains, which settles that open point. There is no Telemetry port or Fake, though the SDK is imported in that one file only. The [as-built check](../architecture/as-built.md#how-this-was-checked) did not configure a Measure project, so no data reaching Measure was observed.
