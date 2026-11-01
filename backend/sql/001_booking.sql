CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA IF NOT EXISTS booking;
CREATE TABLE IF NOT EXISTS booking.clinics (
 id uuid PRIMARY KEY, name text NOT NULL, city text NOT NULL, timezone text NOT NULL DEFAULT 'Asia/Kolkata'
);
CREATE TABLE IF NOT EXISTS booking.doctors (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES booking.clinics,
 name text NOT NULL, specialty text NOT NULL, languages text NOT NULL, fee integer NOT NULL CHECK (fee >= 0),
 UNIQUE(id, tenant_id)
);
CREATE TABLE IF NOT EXISTS booking.staff (
 user_id text NOT NULL REFERENCES "user"(id), tenant_id uuid NOT NULL REFERENCES booking.clinics,
 PRIMARY KEY(user_id, tenant_id)
);
CREATE TABLE IF NOT EXISTS booking.slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, doctor_id uuid NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 CHECK(ends_at > starts_at), FOREIGN KEY(doctor_id,tenant_id) REFERENCES booking.doctors(id,tenant_id),
 UNIQUE(id,tenant_id,doctor_id,starts_at,ends_at), UNIQUE(doctor_id,starts_at)
);
CREATE TABLE IF NOT EXISTS booking.appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, doctor_id uuid NOT NULL,
 slot_id uuid NOT NULL, user_id text NOT NULL REFERENCES "user"(id),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','declined','cancelled','expired')),
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
 FOREIGN KEY(slot_id,tenant_id,doctor_id,starts_at,ends_at) REFERENCES booking.slots(id,tenant_id,doctor_id,starts_at,ends_at),
 EXCLUDE USING gist (doctor_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (status = 'confirmed')
);
CREATE UNIQUE INDEX IF NOT EXISTS one_confirmation ON booking.appointments(slot_id) WHERE status='confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS one_active_request ON booking.appointments(user_id,slot_id) WHERE status IN ('pending','confirmed');
CREATE TABLE IF NOT EXISTS booking.commands (
 user_id text NOT NULL REFERENCES "user"(id), key text NOT NULL, fingerprint text NOT NULL, response jsonb NOT NULL,
 PRIMARY KEY(user_id,key)
);
CREATE TABLE IF NOT EXISTS booking.outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, appointment_id uuid NOT NULL,
 event text NOT NULL, version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz
);
CREATE OR REPLACE FUNCTION booking.record_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NOT ((OLD.status='pending' AND NEW.status IN ('confirmed','declined','cancelled','expired')) OR
          (OLD.status='confirmed' AND NEW.status='cancelled')) THEN
   RAISE EXCEPTION 'Invalid appointment transition' USING ERRCODE='23514';
  END IF;
  NEW.version := OLD.version + 1;
 END IF;
 INSERT INTO booking.outbox(tenant_id,appointment_id,event,version)
 VALUES(NEW.tenant_id,NEW.id,NEW.status,NEW.version);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS appointment_transition ON booking.appointments;
CREATE TRIGGER appointment_transition BEFORE INSERT OR UPDATE ON booking.appointments FOR EACH ROW EXECUTE FUNCTION booking.record_transition();
ALTER TABLE booking.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking.appointments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointment_access ON booking.appointments;
CREATE POLICY appointment_access ON booking.appointments USING (
 user_id=current_setting('app.user_id',true) OR EXISTS(
 SELECT 1 FROM booking.staff s WHERE s.user_id=current_setting('app.user_id',true) AND s.tenant_id=appointments.tenant_id)
);
-- Availability reads must see occupied slots; API responses never expose these rows publicly.
DROP POLICY IF EXISTS confirmed_availability ON booking.appointments;
CREATE POLICY confirmed_availability ON booking.appointments FOR SELECT USING(status='confirmed');
