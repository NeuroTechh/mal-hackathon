ALTER TABLE booking.clinics ADD COLUMN IF NOT EXISTS lead_hours integer NOT NULL DEFAULT 0 CHECK(lead_hours>=0);
ALTER TABLE booking.clinics ADD COLUMN IF NOT EXISTS window_days integer NOT NULL DEFAULT 30 CHECK(window_days BETWEEN 1 AND 365);
ALTER TABLE booking.clinics ADD COLUMN IF NOT EXISTS cancellation_hours integer NOT NULL DEFAULT 0 CHECK(cancellation_hours>=0);
ALTER TABLE booking.doctors ADD COLUMN IF NOT EXISTS weekly_schedule jsonb NOT NULL DEFAULT '{"days":[1,2,3,4,5],"start":"10:00","end":"13:00"}';
ALTER TABLE booking.files ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE booking.files ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES booking.profiles;
CREATE TABLE IF NOT EXISTS booking.record_links(appointment_id uuid NOT NULL REFERENCES booking.appointments,record_id uuid NOT NULL REFERENCES booking.files,PRIMARY KEY(appointment_id,record_id));
INSERT INTO booking.record_links SELECT appointment_id,id FROM booking.files WHERE appointment_id IS NOT NULL ON CONFLICT DO NOTHING;
