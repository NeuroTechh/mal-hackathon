# As built: design versus implementation

The design documents were written before the code. This page records what the code does today and where it differs, so the design can stay readable as a design. If this page and another document disagree about the code, this page is right; if the code and this page disagree, the code is right and this page needs updating.

## How this was checked

Checked on 1 November 2026 against commit `9141a02`, using PostgreSQL 17 and Redis 7 from the images in `compose.yaml`, on Node 26 rather than the Node 24 in `.nvmrc`. ClickHouse was not running, and booking does not need it.

| Evidence | What it is | Can it be rerun? |
| --- | --- | --- |
| **Suite** | `npm run test:integration` and `npm run test:workflows` in `backend/`. Both passed. | Yes |
| **Probe** | A one-off script that called the real API and queried the database. Results below. | No. It is not in the repository. |
| **Reading** | Read from the code and SQL; not exercised. | Not applicable |

Load, fault and race suites have not been run. See the [testing backlog](../testing-backlog.md).

## Summary

**Works and is verified:** the booking rule under concurrency, pending requests holding no slot, cancel reopening a slot, version checks, replay and key reuse on the server, role and clinic checks, QR passes and check-in, and the patient, hospital and doctor API flows. The app's screens were not exercised in this check.

**Written but not finished:** the outbox is filled atomically, but nothing delivers it. Measure is initialised, but the app sends it nothing of its own.

**Not built:** the phone's pending queue and sync engine, automatic command retries, the telemetry interface, request tracing across the phone and API, the audit log, the ports-and-adapters structure, and everything in the [production design](production-design.md) beyond one API and one database (regions, payments, notifications, consent grants, signed offline passes).

## Invariants

The invariants are defined in the [LLD](lld.md#invariants).

| ID | Rule | How the code enforces it | Evidence | Holds? |
| --- | --- | --- | --- | --- |
| I1 | A slot has at most one active appointment | Slot row lock, then the `one_confirmation` partial unique index and an exclusion constraint on doctor and time range | Suite: 2 concurrent confirms. Probe: 2, 50 and 200 concurrent confirms each gave exactly one confirmed. A direct SQL insert of a second confirmed row was rejected. | **Only for `confirmed`.** See [known gaps](#known-gaps) |
| I2 | A pending request holds no slot | Availability only looks at confirmed appointments | Probe: five pending requests, slot still listed | Yes |
| I3 | Cancelling reopens the slot consistently | Slot state is derived from appointments, so there is no second value to fall out of step | Suite: cancel, then request again. Probe: cancel, then a second patient confirmed | Yes |
| I4 | A retried command has the same effect as one attempt | `booking.commands`, keyed by user and key, with a SHA-256 fingerprint and an advisory lock that serialises retries | Suite: request replay and key reuse. Probe: confirm replay wrote one `confirmed` outbox row | Yes, on the server |
| I5 | Only legal state changes happen | The `booking.record_transition` trigger rejects anything else, in the database rather than in domain code | Probe: confirming a cancelled request was rejected | Yes |
| I6 | A clinic acts only on its own slots | Staff membership check on the appointment's tenant | Probe: another clinic's staff got 403. Suite: a non-staff user got 403 | Yes, but see the row-level security gap below |

## Known gaps

Found while checking the code against the design. None of them has been fixed.

1. **Completing a future visit reopens its slot.** `POST /v1/visits/:id/complete` has no time check, and both `one_confirmation` and the availability query only consider `confirmed`, while the LLD's index also covers `completed`. Probe: a doctor completed a future visit, the slot reappeared, and a second request was confirmed on it. The [live invariant query](../adr/walkthroughs.md#verification) then returned a row. This is the most important gap, because it is the one case found where a slot ends up with two active appointments.
2. **Row-level security does not apply under Compose.** The Compose database role is a superuser, and superusers bypass row-level security even with `FORCE`. Probe: with no `app.user_id` set, every appointment row was visible. API checks are the real control in that setup. Deployment needs a separate non-superuser role.
3. **Reschedules do not lock slots in ascending ID order,** as [ADR-006](../adr/006-row-locks-in-fixed-order.md) requires. Two crossing reschedules can deadlock. Postgres would abort one, so the data stays safe, but the caller sees a failure the design meant to rule out: `workflows.ts` maps `40P01` to `409 CONFLICT`, and `bookings.ts` does not map it, so the same abort during a confirm is a 500. (Reading.)
4. **The patient cancellation cutoff only runs for the demo patient.** `bookings.ts` checks `res.locals.demoRole === "patient"`, so a real signed-in patient would skip it. No effect until real sign-in replaces the role buttons. (Reading.)
5. **Idempotency records cannot be cleaned up yet.** `booking.commands` has no `created_at`, so the retention job needs a migration first. (Reading.)

## Design differences

Each row is a difference between the design and the code. Unless marked as probe or suite evidence, it comes from reading the code.

| Area | Design | Code |
| --- | --- | --- |
| Roles | Patient and clinic, from a signed token | Patient, Hospital and Doctor buttons sending `X-Demo-Role`, ignored when `NODE_ENV=production`. Better Auth sessions otherwise, but the routes in `workflows.ts` authorise on the demo role alone, so they return 403 for a real session. |
| Code structure | `BookingPolicy`, services, `UnitOfWork`, ports and adapters | Express route handlers with inline SQL in `backend/src/modules/` |
| Request and appointment | Two tables | One `booking.appointments` row moving through states, as in the [production design](production-design.md#domain-model-and-state-machines) |
| Slot state | `status` and `version` columns | A `blocked` flag; open or booked is derived from appointments |
| Sibling requests | Declined by a retried job after commit ([ADR-010](../adr/010-sibling-decline-after-commit.md)) | Declined inside the confirm transaction, the alternative the ADR rejected. Probe: 199 siblings were declined in one confirm. |
| Losing a confirm race | `409 SLOT_TAKEN` | `409 STALE_VERSION`, because the winner has already declined the loser's request and raised its version. Probe: every loser at 2, 50 and 200. |
| Withdrawal | `WITHDRAWN` status | A cancel on a pending request, giving `cancelled` |
| Expiry | A job moves requests to `EXPIRED` when the slot starts | `expires_at` defaults to 24 hours and is checked when a decision is made. Probe: `409 REQUEST_EXPIRED`, with the row still `pending`. Nothing writes `expired`. |
| Completion | `COMPLETED` when the clock passes the slot's end | The doctor completes the visit with notes and a prescription |
| Blocking a slot | Rejected only when booked | Also rejected when pending requests exist (`SLOT_HAS_REQUESTS`) |
| Reschedule by hospital | A new request, like a patient's | An immediate swap in one transaction. Patient reschedules follow the design. |
| Phone queue and cache | `PendingQueue`, `SyncEngine`, SQLite cache | None. TanStack Query caches reads in memory only (`app/src/lib/query-client.ts`). |
| Idempotency key on the phone | Saved to storage before sending | Generated with `expo-crypto` and held in memory, so it does not survive the app being killed |
| Retries | Automatic, for timeouts and 5xx, up to five attempts | No automatic command retry. Tapping again reuses the key for booking requests and appointment decisions; other commands use a new key on each tap and rely on `If-Match` where they send a version. |
| Notifications | Worker polls the outbox and calls a stub | No worker or stub. A trigger writes the outbox rows. Probe: 530 rows written, 0 delivered. |
| Tracing | One request ID across phone, API and database | No `X-Request-Id` and no request logging. The API only logs errors and its startup line. |
| Telemetry | `Telemetry` port, Measure adapter, fake for tests, allow-list | `initializeMeasure()` in `app/src/lib/measure.ts`, enabled only when `MEASURE_*` values are set. No custom events, spans or attributes. |
| Audit | `audit_event` table with a hash chain | None |
| Redis and ClickHouse | Not used for booking | Redis only backs Better Auth's secondary storage. ClickHouse is only reached by `/health/ready`, which reports unavailable when it is down. |
| Files | Not covered by the prototype design | PDF, JPEG and PNG up to 5 MB stored in Postgres, with signature checks and appointment-scoped access. See [implementation notes](../implementation.md). |

## Data model

| LLD | Code |
| --- | --- |
| `slot` | `booking.slots` |
| `appointment_request`, `appointment` | `booking.appointments` |
| `clinic_id` | `tenant_id` |
| `patient_id` | `user_id`, plus `patient_name` for the family profile |
| `replaces_appointment_id` | `previous_id` |
| `idempotency_record` | `booking.commands` (`request_hash` is `fingerprint`) |
| `outbox` | `booking.outbox` (`aggregate_id` is `appointment_id`, `type` is `event`, `sent_at` is `delivered_at`; adds `tenant_id` and `version`; no `request_id` or payload) |

Beyond the LLD's tables, the `booking` schema also has `clinics`, `doctors`, `staff`, `profiles`, `files`, `record_links` and `hospital_photos`.

The rule from the data model, as written in `backend/sql/001_booking.sql`:

```sql
EXCLUDE USING gist (doctor_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (status = 'confirmed')

CREATE UNIQUE INDEX one_confirmation ON booking.appointments(slot_id) WHERE status='confirmed';
CREATE UNIQUE INDEX one_active_request ON booking.appointments(user_id,slot_id) WHERE status IN ('pending','confirmed');
```

The exclusion constraint goes further than the LLD: it also protects visits of different lengths, as the [production design](production-design.md#domain-model-and-state-machines) asked. `one_active_request` is not in either design; it stops one account requesting the same slot twice, including for two family profiles.

## Appointment states

| From | To | Trigger | Route |
| --- | --- | --- | --- |
| New | `pending` | Patient requests, or patient reschedules | `POST /v1/appointment-requests`, `POST /v1/visits/:id/reschedule` |
| New | `confirmed` | Hospital reschedules | `POST /v1/visits/:id/reschedule` |
| `pending` | `confirmed` | Hospital confirms; pass token issued; a reschedule's old appointment is cancelled | `POST /v1/requests/:id/confirm` |
| `pending` | `declined` | Hospital declines, or another request for the slot is confirmed | `POST /v1/requests/:id/decline` |
| `pending` | `cancelled` | Patient withdraws, or staff cancel | `POST /v1/appointments/:id/cancel` |
| `pending` | `expired` | Allowed by the trigger, but nothing does it yet | None |
| `confirmed` | `cancelled` | Patient (within the cutoff) or staff cancel; hospital reschedules; pass cleared | `POST /v1/appointments/:id/cancel` |
| `confirmed` | `completed` | Doctor completes; pass cleared | `POST /v1/visits/:id/complete` |

The trigger writes one outbox row for every insert and for every update, including updates that do not change the status.

## HTTP API

All routes are under `/v1`. Read routes for hospitals, doctors and slots are public; the rest need a session or, outside production, `X-Demo-Role`. Every `POST` needs an `Idempotency-Key` of 8 to 128 characters; decisions and visit commands also need the appointment's version in `If-Match`. Successful calls return 200, including new requests and replays, and a replay has no marker.

| Call | Caller | Purpose |
| --- | --- | --- |
| `GET /hospitals`, `GET /hospitals/:id`, `GET /hospitals/:id/photos/:photoId` | Anyone | Directory |
| `GET /doctors`, `GET /doctors/:id`, `GET /doctors/:id/slots` | Anyone | Search and availability, up to 100 rows with no paging |
| `GET /access` | Signed in | Whether the caller is clinic staff |
| `POST /appointment-requests` | Patient | Request a slot |
| `GET /appointments`, `GET /appointments?view=clinic` | Patient, staff | Lists, with no `since` cursor |
| `POST /requests/:id/confirm`, `/decline`, `/cancel` | Staff; patient may cancel their own | Decide. `/appointments/:id/...` is the same handler. |
| `GET /visits/:id`, `GET /visits/:id/files/:fileId` | Patient, hospital, doctor | Visit and shared files |
| `POST /visits/:id/reschedule` | Patient, hospital | Reschedule |
| `POST /visits/:id/files` | Patient | Attach a file |
| `POST /visits/:id/complete` | Doctor | Notes, prescription, completion |
| `POST /scan` | Hospital | Verify a QR pass and check in |
| `GET`, `POST /profiles`; `GET`, `POST /records`; `GET /records/:id` | Patient | Family profiles and record library |
| `GET /workspace` | Hospital, doctor | Workspace data |
| `POST /manage/policy`, `/manage/doctors`, `/manage/doctors/:id/toggle`, `/manage/photos` | Hospital | Clinic management |
| `POST /manage/weekly`, `/manage/slots`, `/manage/slots/:id/toggle` | Doctor | Availability |

Every rejection body is `{ "code": "..." }`. The design's message, retry hint and request ID are not sent; the app maps each code to its own message in `app/src/lib/api.ts`. Validation failures return 400 `INVALID_INPUT` rather than 422.

| Design code | Code in the API |
| --- | --- |
| `SLOT_TAKEN` | `SLOT_TAKEN` when requesting or rescheduling; `SLOT_TAKEN_OR_ALREADY_REQUESTED` when a constraint rejects a write in `bookings.ts`; `CONFLICT` for a constraint violation or deadlock in `workflows.ts` |
| `STALE_VERSION` | `STALE_VERSION` |
| `NOT_PENDING`, `NOT_CONFIRMED` | `INVALID_STATE` |
| `IDEMPOTENCY_CONFLICT` | `IDEMPOTENCY_KEY_REUSED` |
| `FORBIDDEN` | `FORBIDDEN` |
| None | `REQUEST_EXPIRED`, `WINDOW_EXCEEDED` and `CUTOFF_PASSED`, as in the production design |
| None | `PASS_INVALID`, `PASS_OUTSIDE_VISIT_WINDOW`, `SLOT_HAS_REQUESTS`, `OVERLAPPING_SLOT`, `RESCHEDULE_PENDING`, `INVALID_FILE`, `INVALID_PHOTO`, `PHOTO_LIMIT`, `INVALID_TIME`, `NOT_FOUND`, `SLOT_NOT_FOUND`, `UNAUTHORIZED` |
