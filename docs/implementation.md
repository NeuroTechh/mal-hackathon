# Core product

Reference: [production design](architecture/production-design.md). For how the code compares with the design, see [as built](architecture/as-built.md). One React Native app with Patient, Hospital and Doctor buttons. Identity selection is a development-only adapter, not authentication. The normal auth packages remain installed for later integration.

## Available flows

- Patient: family profiles, doctor search, concrete available times, appointment requests, status, withdrawal/cancellation, reschedule requests, PDF/JPEG/PNG attachments, QR pass, consultation summary.
- Hospital: request approval/decline, doctor creation/listing controls, confirmed-visit rescheduling, booking notice/window/cancellation rules, visits, shared attachments and QR check-in (camera or pasted code).
- Doctor: the seeded Dr. Ananya Rao workspace, weekly working hours materialized for the next 30 days, concrete 30-minute availability, slot blocking, assigned visits and shared attachments, notes/prescription advice and completion.

A reschedule keeps the original visit confirmed until the replacement is approved. Confirmation declines competing requests. PostgreSQL constraints prevent duplicate confirmations and overlapping confirmed visits. Mutating commands use versions and idempotency keys.

## Run locally

PostgreSQL and Redis run in Docker (`mal-booking-test-postgres` on 15432 and `mal-booking-test-redis` on 16379). The ignored backend `.env` selects them. No native database service is required. `npm run db:migrate` and `npm run db:seed` initialize data, then `npm run dev` starts the backend.

The backend is exposed using `ngrok http 3000`. The app's ignored `.env` contains `EXPO_PUBLIC_API_URL` set to the active HTTPS tunnel. Restart Metro after changing this URL. The ngrok URL may change when restarted. The debug app is installed on the connected Android phone; Metro runs on port 8081 over USB forwarding. Browser downloads may show ngrok's free-tier interstitial once; API requests include its bypass header.

`npm run android` in `app/` generates/builds the native development app. Camera and document picker require a fresh native build. Use **Switch role** to walk the same appointment through all three workspaces. A QR pass is valid within 24 hours of its visit; cancellation, rescheduling and completion invalidate the old pass.

## Current simplifications

Demo roles are disabled when `NODE_ENV=production`; this increment is for fictional local data. No production sign-in or payments, outbound notifications, regional deployment, full tenant isolation or compliance certification is implemented. The doctor workspace selects one seeded doctor and hospital management selects Harbour Family Clinic. Weekly hours apply to the next 30 days and preserve existing requests and confirmed visits. Automated expiry and ongoing horizon extension are still pending.

Files are stored in Docker PostgreSQL for now (5 MB cap) with MIME/signature validation and appointment-scoped access. Malware scanning, object storage/quarantine, full consent grants and a standalone upload library are pending. Patients have a persistent profile-specific record library and select records to share before submitting a request. Appointment uploads also remain in the patient library. Record bytes are retained separately from appointment sharing links; rescheduling carries forward the original sharing links. Prescriptions are plain advice text, not digitally signed clinical prescriptions. QR passes are unguessable opaque database tokens with online validation; signing, encrypted offline storage and email delivery are pending.

ClickHouse is configured but its image pull remains blocked by this machine's Docker certificate trust issue. Booking works independently; aggregate readiness stays unavailable until ClickHouse starts.

Concurrency, load, race-condition and security suites are deferred until the core product is ready, per the latest direction. See `testing-backlog.md`.

## Interface

Responsive Material components with a Zomato-inspired red, white and charcoal palette. Patient navigation uses Book, Visits, Records and Family tabs with icons. Hospital and doctor cards are tappable. Booking times are grouped by day with a persistent request action. Content wraps into columns on larger screens.

Hospital-first booking uses the local directory. Directions opens Google Maps using the hospital name/address (and an optional stored place ID). There are no Places API calls or required Maps keys. Backend access on the connected phone uses USB forwarding for ports 3000 and 8081; ngrok is stopped.

## Loading and defaults

Read data uses a shared TanStack Query cache, keyed by role and endpoint. Hospital/doctor navigation prefetches the next screen, directory cards prefetch likely next reads and images, and returning to a screen preserves cached content. Skeletons cover uncached initial reads. Successful writes invalidate read caches; booking conflicts also invalidate availability. Booking requests still wait for a server response, then seed the appointment list with the committed result. Manual refresh buttons are removed.

The default patient profile is Manan Gandhi, with Meghna Gandhi and Jigam Gandhi as family profiles. The migration preserves the original self-profile ID and is idempotent.

Hospital galleries support up to eight JPEG/PNG uploads (3 MB each) stored in Docker PostgreSQL. Hospital uploads override the bundled illustrative gallery. Asset paths, generation method and prompts are in `hospital-images.md`.
