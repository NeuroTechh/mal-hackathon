import { postgres, closeServices } from "../lib/services.js";
import { env } from "../lib/env.js";
if (env.NODE_ENV === "production")
  throw new Error("Sample data is development-only");
try {
  await postgres.query(`INSERT INTO booking.clinics VALUES
 ('10000000-0000-4000-8000-000000000001','Harbour Family Clinic','Mumbai','Asia/Kolkata'),
 ('10000000-0000-4000-8000-000000000002','Green Park Medical Centre','Mumbai','Asia/Kolkata') ON CONFLICT DO NOTHING`);
  await postgres.query(`INSERT INTO booking.doctors VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Dr. Ananya Rao','General physician','English, Hindi',800),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Dr. Kabir Mehta','Dermatology','English, Hindi, Marathi',1200),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Dr. Mira Shah','Paediatrics','English, Gujarati, Hindi',1000) ON CONFLICT DO NOTHING`);
  await postgres.query(`INSERT INTO booking.slots(tenant_id,doctor_id,starts_at,ends_at)
 SELECT d.tenant_id,d.id,t,t+interval '30 minutes' FROM booking.doctors d
 CROSS JOIN generate_series(1,7) day CROSS JOIN generate_series(0,5) n
 CROSS JOIN LATERAL (SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date + day + time '10:00' + n*interval '30 minutes') AT TIME ZONE 'Asia/Kolkata' AS t) times
 ON CONFLICT(doctor_id,starts_at) DO NOTHING`);
  await postgres.query(`INSERT INTO booking.staff SELECT 'demo-hospital',id FROM booking.clinics ON CONFLICT DO NOTHING`);
  await postgres.query(`INSERT INTO booking.staff SELECT 'demo-doctor',id FROM booking.clinics WHERE id='10000000-0000-4000-8000-000000000001' ON CONFLICT DO NOTHING`);
  // Explicit local operator action; staff roles can never be self-assigned through the API.
  if (process.env.SEED_STAFF_EMAIL) {
    const result = await postgres.query(
      `INSERT INTO booking.staff SELECT u.id,c.id FROM "user" u CROSS JOIN booking.clinics c WHERE u.email=$1 ON CONFLICT DO NOTHING`,
      [process.env.SEED_STAFF_EMAIL],
    );
    console.log(`Staff memberships added: ${result.rowCount}`);
  }
  console.log("Fictional clinics and next seven days of slots seeded");
} finally {
  await closeServices();
}
