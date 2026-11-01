import { workflows } from "./workflows.js";
import { env } from "../lib/env.js";
import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { createHash } from "node:crypto";
import { z } from "zod";
import { auth } from "../lib/auth.js";
import { postgres } from "../lib/services.js";

export const bookings = Router();
class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
const uuid = z.string().uuid();
const select = `SELECT a.*, d.name AS doctor_name, d.specialty, c.name AS clinic_name, c.timezone
 FROM booking.appointments a JOIN booking.doctors d ON d.id=a.doctor_id JOIN booking.clinics c ON c.id=a.tenant_id`;
bookings.get("/doctors", async (req, res) => {
  const search = String(req.query.q ?? "").slice(0, 100);
  const { rows } = await postgres.query(
    `SELECT d.*, c.name AS clinic_name, c.city, c.timezone
 FROM booking.doctors d JOIN booking.clinics c ON c.id=d.tenant_id
 WHERE d.active AND concat_ws(' ',d.name,d.specialty,c.city,c.name) ILIKE $1 ORDER BY d.name LIMIT 100`,
    [`%${search}%`],
  );
  res.json(rows);
});
bookings.get('/doctors/:id',async(req,res)=>{
 const id=uuid.parse(req.params.id);const doctor=(await postgres.query(`SELECT d.*,c.name clinic_name,c.city,c.timezone FROM booking.doctors d JOIN booking.clinics c ON c.id=d.tenant_id WHERE d.id=$1 AND d.active`,[id])).rows[0];if(!doctor){res.status(404).json({code:'NOT_FOUND'});return;}res.json(doctor);
});
bookings.get("/doctors/:id/slots", async (req, res) => {
  const id = uuid.parse(req.params.id);
  const { rows } = await postgres.query(
    `SELECT s.* FROM booking.slots s WHERE doctor_id=$1 AND NOT blocked AND starts_at > now()
 AND NOT EXISTS(SELECT 1 FROM booking.appointments a WHERE a.status='confirmed' AND a.doctor_id=s.doctor_id
 AND tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) ORDER BY starts_at LIMIT 100`,
    [id],
  );
  res.json(rows);
});
bookings.use(async (req, res, next) => {
  const role =
    req.header("X-Demo-Role") ??
    (req.method === "GET" &&
    (/\/visits\/.*\/files\//.test(req.path) || /^\/records\//.test(req.path))
      ? (req.query.demoRole as string)
      : undefined);
  if (
    env.NODE_ENV !== "production" &&
    ["patient", "hospital", "doctor"].includes(role ?? "")
  ) {
    res.locals.userId = `demo-${role}`;
    res.locals.demoRole = role;
    return next();
  }
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    res.status(401).json({ code: "UNAUTHORIZED" });
    return;
  }
  res.locals.userId = session.user.id;
  next();
});
bookings.use(workflows);
bookings.get("/access", async (_req, res) => {
  const { rows } = await postgres.query(
    "SELECT tenant_id FROM booking.staff WHERE user_id=$1",
    [res.locals.userId],
  );
  res.json({ clinicStaff: rows.length > 0 });
});
bookings.get("/appointments", async (req, res) => {
  const clinic = req.query.view === "clinic";
  const db = await postgres.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('app.user_id',$1,true)", [
      res.locals.userId,
    ]);
    const { rows } = await db.query(
      `${select} WHERE ${clinic ? "EXISTS(SELECT 1 FROM booking.staff s WHERE s.user_id=$1 AND s.tenant_id=a.tenant_id)" : "a.user_id=$1"} ORDER BY a.created_at DESC LIMIT 100`,
      [res.locals.userId],
    );
    await db.query("COMMIT");
    res.json(rows);
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
});
bookings.post(
  [
    "/appointment-requests",
    "/appointments/:id/:action",
    "/requests/:id/:action",
  ],
  async (req, res) => {
    const userId = res.locals.userId as string;
    const key = z.string().min(8).max(128).parse(req.header("Idempotency-Key"));
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([req.path, req.body, req.header("If-Match")]))
      .digest("hex");
    const db = await postgres.connect();
    try {
      await db.query("BEGIN");
      await db.query("SELECT set_config('app.user_id',$1,true)", [userId]);
      // Serialize retries of the same command before checking the durable response.
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        `${userId}:${key}`,
      ]);
      const prior = await db.query(
        "SELECT * FROM booking.commands WHERE user_id=$1 AND key=$2",
        [userId, key],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].fingerprint !== fingerprint)
          throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED");
        await db.query("COMMIT");
        res.json(prior.rows[0].response);
        return;
      }
      let appointmentId: string;
      if (req.path === "/appointment-requests") {
        const { slotId, patientName, recordIds } = z
          .object({
            slotId: uuid,
            patientName: z.string().min(1).max(100).default("Self"),
            recordIds: z.array(uuid).max(20).default([]),
          })
          .parse(req.body);
        if (res.locals.demoRole && res.locals.demoRole !== "patient")
          throw new ApiError(403, "FORBIDDEN");
        const slot = (
          await db.query("SELECT * FROM booking.slots WHERE id=$1 FOR UPDATE", [
            slotId,
          ])
        ).rows[0];
        if (!slot || slot.blocked) throw new ApiError(404, "SLOT_NOT_FOUND");
        if (new Date(slot.starts_at) <= new Date())
          throw new ApiError(409, "WINDOW_EXCEEDED");
        const clinic = (
          await db.query("SELECT * FROM booking.clinics WHERE id=$1", [
            slot.tenant_id,
          ])
        ).rows[0];
        const hours =
          (new Date(slot.starts_at).getTime() - Date.now()) / 3600000;
        if (hours < clinic.lead_hours || hours > clinic.window_days * 24)
          throw new ApiError(409, "WINDOW_EXCEEDED");
        const taken = await db.query(
          "SELECT id FROM booking.appointments WHERE doctor_id=$1 AND status='confirmed' AND tstzrange(starts_at,ends_at,'[)') && tstzrange($2::timestamptz,$3::timestamptz,'[)')",
          [slot.doctor_id, slot.starts_at, slot.ends_at],
        );
        if (taken.rowCount) throw new ApiError(409, "SLOT_TAKEN");
        const result = await db.query(
          `INSERT INTO booking.appointments(tenant_id,doctor_id,slot_id,user_id,starts_at,ends_at,patient_name)
    SELECT tenant_id,doctor_id,id,$2,starts_at,ends_at,$3 FROM booking.slots WHERE id=$1 RETURNING id`,
          [slot.id, userId, patientName],
        );
        appointmentId = result.rows[0].id;
        if (recordIds.length) {
          const owned = (
            await db.query(
              "SELECT id FROM booking.files WHERE id=ANY($1::uuid[]) AND user_id=$2",
              [recordIds, userId],
            )
          ).rows;
          if (owned.length !== new Set(recordIds).size)
            throw new ApiError(403, "FORBIDDEN");
          for (const recordId of new Set(recordIds))
            await db.query("INSERT INTO booking.record_links VALUES($1,$2)", [
              appointmentId,
              recordId,
            ]);
        }
      } else {
        appointmentId = uuid.parse(req.params.id);
        const action = z
          .enum(["confirm", "decline", "cancel"])
          .parse(req.params.action);
        const version = z.coerce
          .number()
          .int()
          .positive()
          .parse(req.header("If-Match"));
        const initial = (
          await db.query("SELECT * FROM booking.appointments WHERE id=$1", [
            appointmentId,
          ])
        ).rows[0];
        if (!initial) throw new ApiError(404, "NOT_FOUND");
        // Every writer locks the slot first, then the request; approvals cannot deadlock on competitors.
        await db.query("SELECT id FROM booking.slots WHERE id=$1 FOR UPDATE", [
          initial.slot_id,
        ]);
        const a = (
          await db.query(
            "SELECT * FROM booking.appointments WHERE id=$1 FOR UPDATE",
            [appointmentId],
          )
        ).rows[0];
        const staff = (
          await db.query(
            "SELECT 1 FROM booking.staff WHERE user_id=$1 AND tenant_id=$2",
            [userId, a.tenant_id],
          )
        ).rowCount;
        if (action === "cancel" ? a.user_id !== userId && !staff : !staff)
          throw new ApiError(403, "FORBIDDEN");
        if (res.locals.demoRole === "doctor")
          throw new ApiError(403, "FORBIDDEN");
        if (a.version !== version) throw new ApiError(409, "STALE_VERSION");
        if (
          action === "cancel"
            ? !["pending", "confirmed"].includes(a.status)
            : a.status !== "pending"
        )
          throw new ApiError(409, "INVALID_STATE");
        if (action !== "cancel" && new Date(a.expires_at) <= new Date())
          throw new ApiError(409, "REQUEST_EXPIRED");
        if (action === "confirm" && new Date(a.starts_at) <= new Date())
          throw new ApiError(409, "WINDOW_EXCEEDED");
        if (action === "cancel" && res.locals.demoRole === "patient") {
          const policy = (
            await db.query(
              "SELECT cancellation_hours FROM booking.clinics WHERE id=$1",
              [a.tenant_id],
            )
          ).rows[0];
          if (
            (new Date(a.starts_at).getTime() - Date.now()) / 3600000 <
            policy.cancellation_hours
          )
            throw new ApiError(409, "CUTOFF_PASSED");
        }
        const status = {
          confirm: "confirmed",
          decline: "declined",
          cancel: "cancelled",
        }[action];
        if (action === "confirm" && a.previous_id) {
          const old = (
            await db.query(
              "SELECT * FROM booking.appointments WHERE id=$1 FOR UPDATE",
              [a.previous_id],
            )
          ).rows[0];
          if (!old || old.status !== "confirmed")
            throw new ApiError(409, "INVALID_STATE");
          await db.query(
            "UPDATE booking.appointments SET status='cancelled' WHERE id=$1",
            [old.id],
          );
        }
        await db.query(
          "UPDATE booking.appointments SET status=$1 WHERE id=$2",
          [status, appointmentId],
        );
        if (action === "confirm")
          await db.query(
            "UPDATE booking.appointments SET status='declined' WHERE slot_id=$1 AND id<>$2 AND status='pending'",
            [a.slot_id, appointmentId],
          );
      }
      const result = (
        await db.query(`${select} WHERE a.id=$1`, [appointmentId])
      ).rows[0];
      await db.query("INSERT INTO booking.commands VALUES($1,$2,$3,$4)", [
        userId,
        key,
        fingerprint,
        JSON.stringify(result),
      ]);
      await db.query("COMMIT");
      res.json(result);
    } catch (error) {
      await db.query("ROLLBACK");
      if (error instanceof ApiError) {
        res.status(error.status).json({ code: error.code });
        return;
      }
      if (["23505", "23P01"].includes((error as { code: string }).code)) {
        res.status(409).json({ code: "SLOT_TAKEN_OR_ALREADY_REQUESTED" });
        return;
      }
      throw error;
    } finally {
      db.release();
    }
  },
);
