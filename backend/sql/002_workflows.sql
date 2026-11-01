ALTER TABLE booking.doctors ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE booking.slots ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;
ALTER TABLE booking.appointments ADD COLUMN IF NOT EXISTS patient_name text NOT NULL DEFAULT 'Self';
ALTER TABLE booking.appointments ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE booking.appointments ADD COLUMN IF NOT EXISTS prescription text NOT NULL DEFAULT '';
ALTER TABLE booking.appointments ADD COLUMN IF NOT EXISTS previous_id uuid REFERENCES booking.appointments;
ALTER TABLE booking.appointments ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
ALTER TABLE booking.appointments ADD COLUMN IF NOT EXISTS pass_token text UNIQUE;
ALTER TABLE booking.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE booking.appointments ADD CONSTRAINT appointments_status_check CHECK(status IN ('pending','confirmed','declined','cancelled','expired','completed'));
CREATE TABLE IF NOT EXISTS booking.profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES "user",name text NOT NULL,relationship text NOT NULL);
CREATE TABLE IF NOT EXISTS booking.files(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),appointment_id uuid NOT NULL REFERENCES booking.appointments,user_id text NOT NULL,name text NOT NULL,mime text NOT NULL,content bytea NOT NULL);
CREATE OR REPLACE FUNCTION booking.record_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.status<>OLD.status AND NOT ((OLD.status='pending' AND NEW.status IN ('confirmed','declined','cancelled','expired')) OR (OLD.status='confirmed' AND NEW.status IN ('cancelled','completed'))) THEN
   RAISE EXCEPTION 'Invalid appointment transition' USING ERRCODE='23514';
  END IF;
  NEW.version:=OLD.version+1;
 END IF;
 IF NEW.status='confirmed' AND NEW.pass_token IS NULL THEN NEW.pass_token:=encode(gen_random_bytes(24),'hex'); END IF;
 IF NEW.status NOT IN ('confirmed') THEN NEW.pass_token:=NULL; END IF;
 INSERT INTO booking.outbox(tenant_id,appointment_id,event,version) VALUES(NEW.tenant_id,NEW.id,NEW.status,NEW.version);
 RETURN NEW;
END $$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Demo identities are fixed server-side. No login or session is required in development.
INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES
 ('demo-patient','Manan Gandhi','patient@demo.local',true,now(),now()),
 ('demo-hospital','Hospital team','hospital@demo.local',true,now(),now()),
 ('demo-doctor','Dr. Ananya Rao','doctor@demo.local',true,now(),now()) ON CONFLICT DO NOTHING;
INSERT INTO booking.profiles(user_id,name,relationship) SELECT 'demo-patient','Manan Gandhi','Self' WHERE NOT EXISTS(SELECT 1 FROM booking.profiles WHERE user_id='demo-patient');
INSERT INTO booking.staff SELECT 'demo-hospital',id FROM booking.clinics ON CONFLICT DO NOTHING;
INSERT INTO booking.staff SELECT 'demo-doctor',id FROM booking.clinics WHERE id='10000000-0000-4000-8000-000000000001' ON CONFLICT DO NOTHING;
