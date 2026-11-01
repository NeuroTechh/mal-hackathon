# ADR-001: One modular API, not microservices

**Status:** Accepted · **Implementation:** Implemented

## Context

The first brief asked for microservices. The core operation, confirming a slot for one patient, must check the slot and write the appointment so that two patients can never hold it.

## Decision

Ship one deployable API with clear internal modules, backed by one Postgres database.

## Alternatives

- Microservices (booking, scheduling, notification, identity): each owns its data. Confirming a slot would span services, so it needs a distributed transaction or a saga with compensating steps.
- Modular monolith with a later split: **chosen.**

## Reasons

Booking correctness is one local transaction. A saga adds states such as "half-booked" that must be detected and repaired. One deployable also means one thing to secure, deploy, monitor and debug.

## Consequences

Simple to run and reason about. The cost: all modules scale together, and a bad deploy affects everything. Module boundaries ([ADR-003](003-dependencies-point-inward.md)) keep a future split possible.

## Reconsider when

Separate teams are blocked on each other's releases, or one module has a measured scaling need the others do not share.

## In this repository

One Express service (`backend/src/app.ts`) with three route modules in `backend/src/modules/`: `directory`, `bookings` and `workflows`. The boundaries are by file only, because ADR-003 has not been built.
