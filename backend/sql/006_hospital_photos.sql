CREATE TABLE IF NOT EXISTS booking.hospital_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES booking.clinics,
 mime text NOT NULL CHECK(mime IN ('image/jpeg','image/png')),content bytea NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hospital_photos_tenant ON booking.hospital_photos(tenant_id);
