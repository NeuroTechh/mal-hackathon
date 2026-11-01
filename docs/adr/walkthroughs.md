# ADR walkthroughs

These walkthroughs test the [decision records](README.md) against real situations. They describe the design, and were written before the code. Notes marked **As built** say where the code differs. Throughout, the Diagnostics steps rely on tracing that [is not built yet](016-one-request-id.md).

## Walkthrough 1: the core path

A patient requests a slot, the clinic confirms it, and the patient is told. This is the path every other record protects.

### Expected behavior

| Step | What happens | What is written | What the user sees |
| --- | --- | --- | --- |
| 1. Patient taps Request | The app saves the action with a new ID K, then sends it with `Idempotency-Key: K` (ADR-012, 013). | A local saved action on the phone. | "Waiting to send". |
| 2. API receives it | Checks the token, looks up K, opens a transaction, locks the slot row, confirms the slot is OPEN (ADR-006). | Nothing yet. | Nothing yet. |
| 3. Commit | One commit writes the PENDING request, an outbox row and the stored result for K (ADR-007, 014). | Request, outbox row, idempotency result. | 201 returned; the saved action is cleared; the request shows as pending. |
| 4. Clinic opens the request | Reads the request with its current version. | Nothing. | The request in the clinic's list. |
| 5. Clinic confirms | Locks slot then request, checks PENDING, version and slot OPEN, then commits (ADR-005, 006, 008). | Appointment CONFIRMED, request CONFIRMED, slot BOOKED, outbox row, audit event. | Confirmation on the clinic screen. |
| 6. After the commit | The worker delivers the outbox row; a job declines sibling requests (ADR-010, 014). | Delivery state on the outbox row; siblings set to DECLINED. | The patient is told; other patients see a decline. |

**Things that must always be true.**

- A slot has at most one CONFIRMED or COMPLETED appointment.
- A pending request never changes the slot.
- Every committed change has its outbox row, and every outbox row belongs to a committed change.
- A rejection writes nothing.

> **As built.** Steps 2 to 5 work on the server, with no audit event, a 200 rather than a 201, and one appointment row rather than separate request and appointment rows. Step 1's local save and step 6's delivery are not built, and siblings are declined in step 5. The first rule above [can be broken](../architecture/as-built.md#known-gaps) by completing a future visit.

### Verification

| Check | How | Expected |
| --- | --- | --- |
| Happy path | Integration test: request, confirm, read back. | Appointment CONFIRMED, slot BOOKED, one outbox row per change. |
| No double booking | Test that confirms two requests for one slot from two connections at once. | One succeeds; the other gets `SLOT_TAKEN`. |
| Index is the last guard | Test that bypasses the code check and inserts a second CONFIRMED appointment for the slot directly. | The database raises a unique violation. |
| Replay | Send the same command twice with the same K. | Same answer; one appointment. |
| Key reuse | Send the same K with a different payload. | 409 `IDEMPOTENCY_CONFLICT`. |
| Live invariant | Query for slots with more than one CONFIRMED or COMPLETED appointment, as below. | Zero rows, always. |

```sql
SELECT slot_id FROM booking.appointments
WHERE status IN ('confirmed','completed')
GROUP BY slot_id HAVING count(*) > 1;
```

The table and status names in the query have been updated to the real schema.

> **As built.** The live invariant is the one check that fails: it returned a row after a future visit was completed and its slot re-booked. See [the status of each test](../architecture/lld.md#test-plan). A race loser gets `STALE_VERSION`, and a key reuse gets `IDEMPOTENCY_KEY_REUSED`.

### Diagnostics

Start from the request ID K. Search Measure for K on the phone, then the API log for the same K in `X-Request-Id`, then the outbox row carrying K (ADR-016). The `outcome` on the phone says where it stopped: `ok`, `network_timeout`, `rejected_slot_taken`, `rejected_validation` or `server_error`. If the phone says `ok` but the patient was not told, look at the outbox row: not delivered means the worker, delivered means the push service or the device.

## Walkthrough 2: when things fail

Three failures, each with the behavior we expect, how we prove it, and how we find it in production. In all three, the system ends in a correct state without anyone repairing data by hand.

### Failure A: the response is lost after the server committed

**What happens.** The patient taps Request. The API commits, but the phone loses signal before the 201 arrives. The app sees a timeout.

**Expected behavior.**

1. The phone records the outcome `network_timeout` and keeps the saved action, because it was never cleared (ADR-013).
2. It retries with the same K after a growing delay (ADR-015). The API finds K, sees the same payload hash, and returns the stored 201.
3. The phone clears the saved action. There is one request in the database, not two.

**Verification.** Test with a proxy that drops the response after the API commits. Assert one request row, one outbox row, and a second call that returns the first answer. A second test sends the same K with a changed payload and expects 409 `IDEMPOTENCY_CONFLICT`, which proves a replay is not a blind cache.

**Diagnostics.** In Measure, K shows one attempt with `network_timeout` followed by an attempt with `ok`. The API log shows two lines for K, the second marked as a replay. If the second attempt never appears, the phone never retried: check whether the saved action still exists on the device.

> **As built.** The API's replay and key-reuse behaviour is verified. On the phone, nothing is saved and nothing retries automatically. A patient who taps Request again while the screen is open reuses K and gets the first result.

### Failure B: two clinic users confirm different requests for the same slot

**What happens.** Two staff members each confirm a different patient for the same slot at the same moment.

**Expected behavior.**

1. Both transactions try to lock the slot row. One gets it first; the other waits (ADR-006).
2. The first commits: appointment CONFIRMED, slot BOOKED.
3. The second gets the lock, sees the slot is no longer OPEN, and returns 409 `SLOT_TAKEN`. Nothing is written.
4. If both ever passed the code checks together, the unique index makes the second insert fail, and the API still answers `SLOT_TAKEN` (ADR-005).
5. The second clinic user sees a clear message and the slot disappears from their open list.

**Verification.** The concurrent-confirm test from Walkthrough 1, repeated many times. Expected every time: exactly one CONFIRMED appointment for the slot and one `SLOT_TAKEN`. A separate test removes the code check on purpose and expects the unique violation, to prove the index works on its own.

**Diagnostics.** Two API log lines with different K values for one slot ID, one `ok` and one `rejected_slot_taken`. A `rejected_slot_taken` is normal when staff collide. A sudden rise in them points to a screen that is not refreshing, which is a product issue and not a data issue.

> **As built.** The outcome holds: with 2, 50 and 200 simultaneous confirms, exactly one was confirmed. Step 3 differs: the winner has already declined the second request in its own transaction, so the second gets `409 STALE_VERSION`. The app shows "This appointment just changed. Please try again."

### Failure C: the notification cannot be delivered

**What happens.** The booking is committed but the push service is down, or the worker crashes.

**Expected behavior.**

1. The booking stays correct. The outbox row is already committed (ADR-014).
2. The worker retries the row until it is delivered. After the service returns, the patient is told, late but told.
3. Because delivery is at-least-once, a crash between sending and marking as delivered can send twice. The message is safe to repeat.

**Verification.** Stop the push adapter in a test, confirm a booking, and assert the outbox row remains undelivered. Restart the adapter and assert delivery. Kill the worker between send and mark, restart, and assert the message is repeated safely and the row ends delivered.

**Diagnostics.** Look for outbox rows that stay undelivered for longer than the delay you can accept (set from the product, not guessed here). Many old rows means the worker or the push service; a few means one bad destination, such as an invalid device token. Alert on the age of the oldest undelivered row.

> **As built.** Only step 1 applies. There is no worker or push adapter, so every outbox row stays undelivered.

## Walkthrough 3: a new requirement arrives

> **As built.** Holds are not in the code, and ADR-020 is not a real record. This is a worked example of how the design would absorb a change.

**The requirement.** Clinics ask: "Let us hold a slot for a patient while they fill in an intake form." The length of the hold is set by the clinic. This is realistic, and it directly challenges [ADR-007](007-pending-request-holds-no-slot.md), which says nothing holds a slot until it is confirmed.

**Expected behavior.** A clinic user can hold an open slot for one named request. While the hold is active, other requests cannot be confirmed for that slot, and the held request can. When the hold ends or is released, the slot is open to everyone again.

**How the design absorbs it.** The answer is a new record, not a rewrite.

- **ADR-020 (Proposed): clinic-initiated holds.** It narrows ADR-007: asking still holds nothing, but a clinic can create an explicit hold. ADR-007 stays valid for ordinary requests.
- A hold is data on the slot, not a new kind of appointment: which request it is held for and until when. The slot's status stays OPEN or BOOKED.
- Expiry is decided by the clock at check time. A hold whose end time has passed is treated as gone by every read and by the confirm path. A cleanup job only tidies old values, so a late job cannot keep a slot blocked.
- The confirm path gains one check, made after the slot is locked: if there is an active hold for a different request, return a new final error `SLOT_HELD`.
- Hold and release are ordinary commands: idempotency key, slot lock first, one commit, an outbox row and an audit event. Only the clinic role may call them.

| Area | Changes? | How |
| --- | --- | --- |
| Unique index (ADR-005) | No | A hold is not an appointment, so the guard is untouched. |
| Lock order (ADR-006) | No | Hold and release lock the slot first, like everything else. |
| Pending holds no slot (ADR-007) | Narrowed | Superseded for held requests only, by ADR-020. |
| Idempotency and retries (ADR-012, 015) | No | New commands use the same keys; `SLOT_HELD` is final and not retried. |
| Outbox (ADR-014) | Extended | A new event type tells the patient the slot is held for them. |
| Telemetry (ADR-016, 018) | Extended | A new outcome, `rejected_slot_held`. The allowed fields do not change. |
| Audit (ADR-019) | Extended | Hold and release are audit events. |
| Database | Additive | Two nullable columns on the slot. Existing rows and code keep working. |
| Phone app | Extended | A "held for you" state and a clear `SLOT_HELD` message for other clinic users. |

**Verification.**

| Check | Expected |
| --- | --- |
| Hold a slot, then confirm a different request. | `SLOT_HELD`, nothing written. |
| Hold a slot, then confirm the held request. | Confirmed, the hold is cleared in the same commit. |
| Let the hold pass its end time, then confirm a different request. | Confirmed, with no cleanup job needed. |
| Race: confirm and release at the same instant. | One order wins; the slot is never double booked, and the unique index still holds. |
| Retry the hold command with the same K. | One hold, the same answer. |
| Run the whole existing test suite. | Unchanged results, which proves the change is additive. |

**Diagnostics.** Support will ask "why can't I confirm this?" The answer is `rejected_slot_held` in Measure and a `SLOT_HELD` line in the API log, with the hold's request ID and end time in the audit event. A hold that never ends points to a bad end time written by the hold command, not to a cleanup job, because expiry does not depend on one.

**Risks, and what we do.**

- A clinic holds many slots and starves patients. Only the clinic role can hold, every hold is audited, and the clinic sets its own length. A per-clinic limit can be added if misuse is measured.
- Clock differences. Hold times are compared using the database's clock, not the phone's.

**Reconsider when.** Holds become a core flow rather than an exception, for example patients holding their own slots. Then the hold deserves its own table and states, and ADR-007 should be replaced rather than narrowed.
