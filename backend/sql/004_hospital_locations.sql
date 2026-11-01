ALTER TABLE booking.clinics ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE booking.clinics ADD COLUMN IF NOT EXISTS google_place_id text;
CREATE UNIQUE INDEX IF NOT EXISTS hospital_google_place ON booking.clinics(google_place_id) WHERE google_place_id IS NOT NULL;
