# Architectural decision records

These 19 records explain why NeuroTechh is built the way it is, so each choice can be defended or revisited with a clear head. Every record uses the same six parts.

- **Context:** the problem and the forces on it.
- **Decision:** what we chose, in one or two sentences.
- **Alternatives:** what else was on the table, and why each lost.
- **Reasons:** why the choice won.
- **Consequences:** what we gain, and what it costs us.
- **Reconsider when:** the measurement or event that would reopen the decision.

Two principles run through all of them. The database decides correctness, so the app and API may be wrong or retried safely. And proven technology comes first: a new system is added only after a measured need.

The records were written before the code, and the decisions are kept as written. Each now ends with an **In this repository** section, checked against the code on 1 November 2026. The originals are in [architectural-decision-records.pdf](../hackathon-submission/architectural-decision-records.pdf).

**Status** is the state of the decision. *Accepted* means it is the current design. *Proposed* means the direction is chosen but a detail, such as a number, still needs measuring.

**Implementation** is the state of the code. *Implemented* means the decision is in the code. *Partial* means only part of it is. *Differs* means the code does something else. *Not built* means the code does not do it yet.

Of the 19: 8 are implemented, 4 partial, 1 differs and 6 not built.

## Shape of the system

| ADR | Decision | Status | Implementation |
| --- | --- | --- | --- |
| [001](001-one-modular-api.md) | One modular API, not microservices | Accepted | Implemented |
| [002](002-postgres-single-source-of-truth.md) | Postgres is the single source of truth | Accepted | Implemented |
| [003](003-dependencies-point-inward.md) | Dependencies point inward (ports and adapters) | Accepted | Not built |
| [004](004-tls-and-signed-tokens.md) | TLS and signed tokens, no service mesh | Accepted | Partial |

## Booking correctness

| ADR | Decision | Status | Implementation |
| --- | --- | --- | --- |
| [005](005-partial-unique-index.md) | A partial unique index guards every confirmed slot | Accepted | Implemented, with a [known gap](../architecture/as-built.md#known-gaps) |
| [006](006-row-locks-in-fixed-order.md) | Row locks in a fixed order | Accepted | Partial |
| [007](007-pending-request-holds-no-slot.md) | A pending request holds no slot | Accepted | Implemented |
| [008](008-version-based-optimistic-concurrency.md) | Version-based optimistic concurrency on requests | Accepted | Implemented |
| [009](009-reschedule-replaces-appointment.md) | A reschedule is a new request that replaces the old appointment | Accepted | Implemented |
| [010](010-sibling-decline-after-commit.md) | Sibling requests are declined by a retried job after commit | Accepted | Differs |
| [011](011-no-redis-slot-locking.md) | No Redis for slot locking | Accepted | Implemented |

## Reliability on a bad network

| ADR | Decision | Status | Implementation |
| --- | --- | --- | --- |
| [012](012-phone-created-idempotency-keys.md) | Idempotency keys are created on the phone | Accepted | Implemented |
| [013](013-save-before-send.md) | The phone saves an action before sending it | Accepted | Not built |
| [014](014-transactional-outbox.md) | Transactional outbox with a polling worker, no Kafka | Accepted | Partial |
| [015](015-retry-timeouts-and-5xx.md) | Retry only timeouts and 5xx | Proposed | Not built |

## Observability, privacy and audit

| ADR | Decision | Status | Implementation |
| --- | --- | --- | --- |
| [016](016-one-request-id.md) | One request ID serves as idempotency key and trace key | Accepted | Not built |
| [017](017-hosted-measure.md) | Measure, hosted, for phone error tracing | Accepted | Partial |
| [018](018-telemetry-ids-and-outcomes.md) | Telemetry carries IDs and outcomes only | Accepted | Not built |
| [019](019-audit-log-in-postgres.md) | Audit log in Postgres, not ClickHouse | Accepted | Not built |

## Walkthroughs

[Walkthroughs](walkthroughs.md) test the records against three situations: the core path, three failures, and a new requirement. The third sketches a hypothetical ADR-020 for clinic-initiated holds, which is a worked example rather than a decision.
