import { readFile } from "node:fs/promises";
import { postgres } from "../lib/services.js";
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../lib/auth.js";
import { closeServices } from "../lib/services.js";

try {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  await postgres.query(
    await readFile(
      new URL("../../sql/001_booking.sql", import.meta.url),
      "utf8",
    ),
  );
  await postgres.query(
    await readFile(
      new URL("../../sql/002_workflows.sql", import.meta.url),
      "utf8",
    ),
  );
  await postgres.query(
    await readFile(
      new URL("../../sql/003_product.sql", import.meta.url),
      "utf8",
    ),
  );
  await postgres.query(await readFile(new URL("../../sql/004_hospital_locations.sql", import.meta.url), "utf8"));
  await postgres.query(await readFile(new URL("../../sql/005_default_family.sql", import.meta.url), "utf8"));
  await postgres.query(await readFile(new URL("../../sql/006_hospital_photos.sql", import.meta.url), "utf8"));
  console.log("Auth and booking schemas migrated");
} finally {
  await closeServices();
}
