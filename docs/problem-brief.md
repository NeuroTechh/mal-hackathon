# Problem framing brief

**NeuroTechh:** Appointment Coordination Platform for patients and clinics

1 November 2026 · MAL Hackathon 4 · HealthTech · Prepared by globalhost

**The problem.** Patients cannot see real availability, and clinics cannot control it reliably: slots are double-promised, cancelled slots go unused, and requests are chased by phone. NeuroTechh is a multi-tenant mobile platform where patients request appointments and clinics confirm them. **Its one non-negotiable promise: a confirmed slot belongs to exactly one patient, and a cancellation returns the slot to everyone, consistently.**

## Users

| User | Surface | Needs |
| --- | --- | --- |
| Patient | Mobile app | Finds a doctor by locality, specialisation and filters; requests, tracks, reschedules or cancels; holds a QR pass. Can book for dependents. |
| Hospital admin | Web and mobile | Sets booking windows and policies; confirms or declines requests; manages doctors and blocked dates. |
| Doctor | Web and mobile | Controls own availability for new and follow-up visits; posts notes and prescriptions; reviews history the patient has shared. |
| Front-desk staff | Scanner app | Scans the patient's QR pass to verify the booking and check them in. |

## Core journey

| Step | What happens |
| --- | --- |
| 1. Browse | Search by locality, specialty or doctor and see live slots. |
| 2. Request | Patient requests a slot. Pending requests do not block others. |
| 3. Decide | Clinic confirms one request and declines the rest, or auto-confirms by policy. |
| 4. Pass and alerts | SMS, email and push. QR pass is saved offline and emailed. |
| 5. Visit | Staff scan the QR to check in. Doctor posts notes and prescription. |
| 6. Follow up | Notes inform the next booking, with rules set by the doctor. |

**At any point before the visit** the patient or clinic can reschedule or cancel. The old QR pass is revoked, the patient and doctor are notified, and the slot reopens to the public.

## Scope

**In scope**

- **Phase 1, core loop:** browse, request, confirm or decline, status, cancel, reschedule, QR pass, notifications, admin and doctor tools, payments.
- **Phase 2, records:** patient uploads, prescriptions and notes, consent-based sharing, follow-ups.
- **Phase 3, extras:** nearby chemists and labs, analytics.

**Out of scope**

- Clinical advice and diagnosis; video consultations; replacing a hospital's own EMR or HIS (integration is a later option).

## Assumptions

- **Clinics always confirm.** No instant booking; auto-confirm is an optional per-clinic setting.
- **Pending requests hold nothing.** Approving one declines the rest.
- **Hospitals set the rules:** booking window, lead time and cancellation cutoff.
- **Time:** stored in UTC, shown in the clinic's local time.
- **Records are in scope temporarily,** pending compliance review.
- **Money:** patients pay per appointment, hospitals subscribe; payment timing to be confirmed.
- **Sharing across hospitals** happens only with explicit patient consent.

## Constraints

- **Integrity:** the database is the final authority on slot ownership; Redis locks only reduce contention.
- **Compliance:** global. Designed to DPDP (India), HIPAA and GDPR; core DPDP duties apply from May 2027.
- **Residency:** data is sharded by region and stays in the patient's home region.
- **Privacy:** QR codes, emails and SMS carry no health data; every record access is audited.
- **Platform:** React Native, microservices on Kubernetes, PostgreSQL, Redis, ClickHouse for audit.
- **Scale:** built for millions of patients; the patient's QR pass must work offline.

> The team later revisited the platform constraints: [ADR-001](adr/001-one-modular-api.md) chose one modular API over microservices, [ADR-011](adr/011-no-redis-slot-locking.md) removed Redis locks entirely, and [ADR-019](adr/019-audit-log-in-postgres.md) moved audit to Postgres. The brief is kept as written.

## Success conditions

- **Zero double allocations:** no confirmed slot ever has two patients.
- **Consistent views:** a cancelled slot reopens and patient and clinic screens agree within seconds.
- **No orphaned requests:** every request is answered or expires within the clinic's window (default 24 hours), with admin reminders.
- **QR works at the door:** verifies even when the patient is offline, and stops working once cancelled.
- **Auditable:** all record access is logged and shared only with consent.
- **Proven in a pilot:** design-partner hospitals run the full loop before wider rollout.
