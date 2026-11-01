# ADR-019: Audit log in Postgres, not ClickHouse

**Status:** Accepted · **Implementation:** Not built

## Context

We need a tamper-evident record of who did what. The first idea was ClickHouse, which would be a new database added for one purpose.

## Decision

An `audit_event` table in the Postgres we already run. The writer role has INSERT only and the reader role SELECT only. The table is partitioned by month, with a hash chain across rows and a nightly export to write-once storage. An analytics copy is added only if a real reporting need appears.

## Alternatives

- ClickHouse: strong for large analytical scans, but audit is mostly writes and lookups by ID. It adds a database to run, secure, back up and hire for, and the audit write would be a second write that can fail.
- Application log files: easy, but hard to query and easy to alter.
- Postgres with the controls above: **chosen.**

## Reasons

The audit row is written in the same transaction as the booking, so both exist or neither does. We already operate Postgres. The controls make silent edits detectable.

## Consequences

The audit table grows with usage and needs partition management and archiving. A very heavy reporting query could compete with live traffic, so reports run on a replica.

## Reconsider when

Measured audit volume or reporting scans cannot be served by partitioning, indexes and a replica. The analytics copy is the first step, before any move of the source of truth.

## In this repository

Not built. There is no `audit_event` table, and appointments do not record who changed them. ClickHouse is in `compose.yaml` and `/health/ready`, and the README lists it as analytics infrastructure, but nothing writes to it. That is ahead of this record, which adds an analytics copy only once a real reporting need appears.
