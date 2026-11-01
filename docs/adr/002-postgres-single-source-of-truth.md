# ADR-002: Postgres is the single source of truth

**Status:** Accepted · **Implementation:** Implemented

## Context

Slots, requests, appointments, idempotency keys, the outbox and audit events must agree with each other at every moment.

## Decision

All of them live in one Postgres database, and the application keeps no copy of the truth.

## Alternatives

- Several stores, each best at one job (a cache for slots, a log store for audit, a queue for events): each is fast at its job, but they can disagree.
- One relational store: **chosen.**

## Reasons

Transactions across tables are free inside one database. Postgres is proven, widely understood and easy to hire for. We already run it.

## Consequences

One backup, one restore, one access model. The cost: Postgres is the component we must protect hardest, with backups, a standby and restores that are practised, not assumed.

## Reconsider when

A measured workload, after indexing, partitioning and a read replica, still cannot be served.

## In this repository

Booking state, idempotency records and the outbox are all in the `booking` schema, along with uploaded files and hospital photos stored as `bytea`. Booking routes do not touch Redis or ClickHouse. Audit events are not stored yet ([ADR-019](019-audit-log-in-postgres.md)).
