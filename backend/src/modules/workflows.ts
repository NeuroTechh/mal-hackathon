import { Router } from "express";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { postgres } from "../lib/services.js";
export const workflows = Router();
const id = z.string().uuid();
const doctorId = "20000000-0000-4000-8000-000000000001";
const tenantId = "10000000-0000-4000-8000-000000000001";
class Failure extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
workflows.use(async (req, res, next) => {
  if (
    ![
      "/records",
      "/profiles",
      "/workspace",
      "/visits",
      "/manage",
      "/scan",
    ].some((p) => req.path.startsWith(p))
  )
    return next();
  const db = await postgres.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('app.user_id',$1,true)", [
      res.locals.userId,
    ]);
    const role = res.locals.demoRole;
    const user = res.locals.userId;
    let prior;
    const key = req.header("Idempotency-Key");
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify([
          req.method,
          req.path,
          req.body,
          req.header("If-Match"),
        ]),
      )
      .digest("hex");
    if (req.method === "POST") {
      z.string().min(8).max(128).parse(key);
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        `${user}:${key}`,
      ]);
      prior = (
        await db.query(
          "SELECT * FROM booking.commands WHERE user_id=$1 AND key=$2",
          [user, key],
        )
      ).rows[0];
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new Failure(409, "IDEMPOTENCY_KEY_REUSED");
        await db.query("COMMIT");
        return res.json(prior.response);
      }
    }
    const patient = () => {
      if (role !== "patient") throw new Failure(403, "FORBIDDEN");
    };
    const hospital = () => {
      if (role !== "hospital") throw new Failure(403, "FORBIDDEN");
    };
    const doctor = () => {
      if (role !== "doctor") throw new Failure(403, "FORBIDDEN");
    };
    let result: unknown;
    const parts = req.path.split("/").filter(Boolean);
    if (parts[0] === "records") {
      patient();
      if (req.method === "POST") {
        const b = z
          .object({
            name: z.string().min(1).max(200),
            mime: z.enum(["application/pdf", "image/jpeg", "image/png"]),
            base64: z.string().max(7000000),
            profileId: id,
          })
          .parse(req.body);
        if (
          !(
            await db.query(
              "SELECT 1 FROM booking.profiles WHERE id=$1 AND user_id=$2",
              [b.profileId, user],
            )
          ).rowCount
        )
          throw new Failure(403, "FORBIDDEN");
        const bytes = Buffer.from(b.base64, "base64");
        const valid =
          b.mime === "application/pdf"
            ? bytes.subarray(0, 5).toString() === "%PDF-"
            : b.mime === "image/png"
              ? bytes
                  .subarray(0, 8)
                  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        if (!valid || bytes.length > 5242880)
          throw new Failure(400, "INVALID_FILE");
        await db.query(
          "INSERT INTO booking.files(user_id,profile_id,name,mime,content) VALUES($1,$2,$3,$4,$5)",
          [user, b.profileId, b.name, b.mime, bytes],
        );
      }
      if (parts[1]) {
        const file = (
          await db.query(
            "SELECT * FROM booking.files WHERE id=$1 AND user_id=$2",
            [id.parse(parts[1]), user],
          )
        ).rows[0];
        if (!file) throw new Failure(404, "NOT_FOUND");
        await db.query("COMMIT");
        res.type(file.mime).send(file.content);
        return;
      }
      result = (
        await db.query(
          "SELECT f.id,f.name,f.mime,f.profile_id,p.name patient_name FROM booking.files f LEFT JOIN booking.profiles p ON p.id=f.profile_id WHERE f.user_id=$1 ORDER BY f.name",
          [user],
        )
      ).rows;
    } else if(req.path==='/manage/photos'){
      hospital();const b=z.object({mime:z.enum(['image/jpeg','image/png']),base64:z.string().max(4500000)}).parse(req.body);
      const content=Buffer.from(b.base64,'base64');const valid=b.mime==='image/png'?content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):content[0]===255&&content[1]===216&&content[2]===255;
      if(!valid||content.length>3*1024*1024)throw new Failure(400,'INVALID_PHOTO');
      await db.query('SELECT id FROM booking.clinics WHERE id=$1 FOR UPDATE',[tenantId]);
      if((await db.query('SELECT count(*)::int n FROM booking.hospital_photos WHERE tenant_id=$1',[tenantId])).rows[0].n>=8)throw new Failure(409,'PHOTO_LIMIT');
      result=(await db.query('INSERT INTO booking.hospital_photos(tenant_id,mime,content) VALUES($1,$2,$3) RETURNING id',[tenantId,b.mime,content])).rows[0];
    } else if (req.path === "/manage/policy") {
      hospital();
      const b = z
        .object({
          leadHours: z.coerce.number().int().min(0).max(720),
          windowDays: z.coerce.number().int().min(1).max(365),
          cancellationHours: z.coerce.number().int().min(0).max(720),
        })
        .parse(req.body);
      result = (
        await db.query(
          "UPDATE booking.clinics SET lead_hours=$1,window_days=$2,cancellation_hours=$3 WHERE id=$4 RETURNING *",
          [b.leadHours, b.windowDays, b.cancellationHours, tenantId],
        )
      ).rows[0];
    } else if (req.path === "/manage/weekly") {
      doctor();
      const b = z
        .object({
          days: z.array(z.number().int().min(0).max(6)).max(7),
          start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        })
        .parse(req.body);
      if (b.end <= b.start) throw new Failure(400, "INVALID_TIME");
      await db.query("SELECT id FROM booking.doctors WHERE id=$1 FOR UPDATE", [
        doctorId,
      ]);
      await db.query(
        "SELECT id FROM booking.slots WHERE doctor_id=$1 FOR UPDATE",
        [doctorId],
      );
      await db.query(
        "UPDATE booking.doctors SET weekly_schedule=$1 WHERE id=$2",
        [JSON.stringify(b), doctorId],
      );
      // Block unused times outside the new template; preserve existing requests and visits.
      await db.query(
        `UPDATE booking.slots s SET blocked=true WHERE doctor_id=$1 AND starts_at>now() AND NOT EXISTS(SELECT 1 FROM booking.appointments a WHERE a.slot_id=s.id AND a.status IN ('pending','confirmed'))`,
        [doctorId],
      );
      await db.query(
        `INSERT INTO booking.slots(tenant_id,doctor_id,starts_at,ends_at)
      SELECT $1,$2,t,t+interval '30 minutes' FROM generate_series(1,30) day
      CROSS JOIN LATERAL generate_series((((now() AT TIME ZONE 'Asia/Kolkata')::date+day)+$3::time) AT TIME ZONE 'Asia/Kolkata',((((now() AT TIME ZONE 'Asia/Kolkata')::date+day)+$4::time) AT TIME ZONE 'Asia/Kolkata')-interval '30 minutes',interval '30 minutes') t
      WHERE extract(dow FROM t AT TIME ZONE 'Asia/Kolkata')::int=ANY($5::int[])
      ON CONFLICT(doctor_id,starts_at) DO UPDATE SET blocked=false`,
        [tenantId, doctorId, b.start, b.end, b.days],
      );
      result = b;
    } else if (req.path === "/profiles") {
      patient();
      if (req.method === "POST") {
        const b = z
          .object({
            name: z.string().trim().min(1).max(100),
            relationship: z.string().min(1).max(40),
          })
          .parse(req.body);
        await db.query(
          "INSERT INTO booking.profiles(user_id,name,relationship) VALUES($1,$2,$3)",
          [user, b.name, b.relationship],
        );
      }
      result = (
        await db.query(
          "SELECT * FROM booking.profiles WHERE user_id=$1 ORDER BY relationship DESC",
          [user],
        )
      ).rows;
    } else if (req.path === "/workspace") {
      if (!["hospital", "doctor"].includes(role))
        throw new Failure(403, "FORBIDDEN");
      result = {
        policy: (
          await db.query(
            "SELECT lead_hours,window_days,cancellation_hours FROM booking.clinics WHERE id=$1",
            [tenantId],
          )
        ).rows[0],
        weekly: (
          await db.query(
            "SELECT weekly_schedule FROM booking.doctors WHERE id=$1",
            [doctorId],
          )
        ).rows[0].weekly_schedule,
        doctors: (
          await db.query(
            "SELECT * FROM booking.doctors WHERE tenant_id=$1 ORDER BY name",
            [tenantId],
          )
        ).rows,
        slots: (
          await db.query(
            `SELECT s.*, (SELECT a.status FROM booking.appointments a WHERE a.slot_id=s.id AND a.status IN ('pending','confirmed') ORDER BY CASE WHEN a.status='confirmed' THEN 0 ELSE 1 END LIMIT 1) booking_status FROM booking.slots s WHERE s.doctor_id=$1 AND s.starts_at>now() ORDER BY s.starts_at`,
            [doctorId],
          )
        ).rows,
        visits: (
          await db.query(
            `SELECT a.*,d.name doctor_name,c.name clinic_name,c.timezone FROM booking.appointments a JOIN booking.doctors d ON d.id=a.doctor_id JOIN booking.clinics c ON c.id=a.tenant_id WHERE ${role === "doctor" ? "a.doctor_id=$1" : "a.tenant_id=$1"} ORDER BY starts_at`,
            [role === "doctor" ? doctorId : tenantId],
          )
        ).rows,
      };
    } else if (req.path === "/manage/doctors") {
      hospital();
      const b = z
        .object({
          name: z.string().min(1).max(100),
          specialty: z.string().min(1).max(100),
          fee: z.coerce.number().int().min(0),
        })
        .parse(req.body);
      result = (
        await db.query(
          "INSERT INTO booking.doctors(id,tenant_id,name,specialty,languages,fee) VALUES($1,$2,$3,$4,'English, Hindi',$5) RETURNING *",
          [randomUUID(), tenantId, b.name, b.specialty, b.fee],
        )
      ).rows[0];
    } else if (
      parts[0] === "manage" &&
      parts[1] === "doctors" &&
      parts[3] === "toggle"
    ) {
      hospital();
      result = (
        await db.query(
          "UPDATE booking.doctors SET active=NOT active WHERE id=$1 AND tenant_id=$2 RETURNING *",
          [id.parse(parts[2]), tenantId],
        )
      ).rows[0];
    } else if (req.path === "/manage/slots") {
      doctor();
      const b = z
        .object({
          startsAt: z.string().datetime(),
          endsAt: z.string().datetime(),
        })
        .parse(req.body);
      if (
        new Date(b.startsAt) <= new Date() ||
        new Date(b.endsAt) <= new Date(b.startsAt)
      )
        throw new Failure(400, "INVALID_TIME");
      const overlap = await db.query(
        "SELECT 1 FROM booking.slots WHERE doctor_id=$1 AND tstzrange(starts_at,ends_at,'[)') && tstzrange($2::timestamptz,$3::timestamptz,'[)')",
        [doctorId, b.startsAt, b.endsAt],
      );
      if (overlap.rowCount) throw new Failure(409, "OVERLAPPING_SLOT");
      result = (
        await db.query(
          "INSERT INTO booking.slots(tenant_id,doctor_id,starts_at,ends_at) VALUES($1,$2,$3,$4) RETURNING *",
          [tenantId, doctorId, b.startsAt, b.endsAt],
        )
      ).rows[0];
    } else if (parts[0] === "manage" && parts[1] === "slots") {
      doctor();
      const slot = (
        await db.query(
          "SELECT * FROM booking.slots WHERE id=$1 AND doctor_id=$2 FOR UPDATE",
          [id.parse(parts[2]), doctorId],
        )
      ).rows[0];
      if (!slot) throw new Failure(404, "NOT_FOUND");
      if (
        (
          await db.query(
            "SELECT 1 FROM booking.appointments WHERE slot_id=$1 AND status IN ('confirmed','pending')",
            [slot.id],
          )
        ).rowCount
      )
        throw new Failure(409, "SLOT_HAS_REQUESTS");
      result = (
        await db.query(
          "UPDATE booking.slots SET blocked=NOT blocked WHERE id=$1 RETURNING *",
          [slot.id],
        )
      ).rows[0];
    } else if (req.path === "/scan") {
      hospital();
      const token = z.string().min(10).max(100).parse(req.body.token);
      const a = (
        await db.query(
          "SELECT * FROM booking.appointments WHERE pass_token=$1 AND tenant_id=$2 FOR UPDATE",
          [token, tenantId],
        )
      ).rows[0];
      if (!a || a.status !== "confirmed")
        throw new Failure(409, "PASS_INVALID");
      if (Math.abs(Date.now() - new Date(a.starts_at).getTime()) > 24 * 3600000)
        throw new Failure(409, "PASS_OUTSIDE_VISIT_WINDOW");
      const already = Boolean(a.checked_in_at);
      if (!already)
        await db.query(
          "UPDATE booking.appointments SET checked_in_at=now() WHERE id=$1",
          [a.id],
        );
      result = {
        patient: a.patient_name,
        alreadyCheckedIn: already,
        message: already ? "Already checked in" : "Checked in successfully",
      };
    } else if (parts[0] === "visits") {
      const visitId = id.parse(parts[1]);
      const initial = (
        await db.query("SELECT * FROM booking.appointments WHERE id=$1", [
          visitId,
        ])
      ).rows[0];
      if (!initial) throw new Failure(404, "NOT_FOUND");
      // Match the booking command's lock ordering.
      await db.query("SELECT id FROM booking.slots WHERE id=$1 FOR UPDATE", [
        initial.slot_id,
      ]);
      const a = (
        await db.query(
          "SELECT * FROM booking.appointments WHERE id=$1 FOR UPDATE",
          [visitId],
        )
      ).rows[0];
      const canRead =
        (role === "patient" && a.user_id === user) ||
        (role === "hospital" && a.tenant_id === tenantId) ||
        (role === "doctor" && a.doctor_id === doctorId);
      if (!canRead) throw new Failure(403, "FORBIDDEN");
      if (req.method === "GET") {
        if (parts[2] === "files" && parts[3]) {
          const file = (
            await db.query(
              "SELECT f.* FROM booking.files f WHERE f.id=$1 AND (f.appointment_id=$2 OR EXISTS(SELECT 1 FROM booking.record_links l WHERE l.record_id=f.id AND l.appointment_id=$2))",
              [id.parse(parts[3]), a.id],
            )
          ).rows[0];
          if (!file) throw new Failure(404, "NOT_FOUND");
          await db.query("COMMIT");
          res.type(file.mime);
          res.setHeader("Content-Disposition", 'attachment; filename="record"');
          res.send(file.content);
          return;
        }
        result = {
          ...a,
          files: (
            await db.query(
              "SELECT f.id,f.name,f.mime FROM booking.files f WHERE f.appointment_id=$1 OR EXISTS(SELECT 1 FROM booking.record_links l WHERE l.record_id=f.id AND l.appointment_id=$1)",
              [a.id],
            )
          ).rows,
        };
      } else {
        if (
          a.version !==
          z.coerce.number().int().positive().parse(req.header("If-Match"))
        )
          throw new Failure(409, "STALE_VERSION");
        if (parts[2] === "complete") {
          doctor();
          if (a.status !== "confirmed") throw new Failure(409, "INVALID_STATE");
          const b = z
            .object({
              notes: z.string().trim().min(1).max(10000),
              prescription: z.string().max(10000).default(""),
            })
            .parse(req.body);
          await db.query(
            "UPDATE booking.appointments SET notes=$1,prescription=$2,status='completed' WHERE id=$3",
            [b.notes, b.prescription, a.id],
          );
        } else if (parts[2] === "files") {
          patient();
          if (!["pending", "confirmed"].includes(a.status))
            throw new Failure(409, "INVALID_STATE");
          const b = z
            .object({
              name: z.string().min(1).max(200),
              mime: z.enum(["application/pdf", "image/jpeg", "image/png"]),
              base64: z.string().max(7_000_000),
            })
            .parse(req.body);
          const bytes = Buffer.from(b.base64, "base64");
          const valid =
            b.mime === "application/pdf"
              ? bytes.subarray(0, 5).toString() === "%PDF-"
              : b.mime === "image/png"
                ? bytes
                    .subarray(0, 8)
                    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
                : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
          if (!valid || bytes.length > 5 * 1024 * 1024)
            throw new Failure(400, "INVALID_FILE");
          await db.query(
            "INSERT INTO booking.files(appointment_id,user_id,name,mime,content) VALUES($1,$2,$3,$4,$5)",
            [a.id, user, b.name, b.mime, bytes],
          );
          await db.query(
            "UPDATE booking.appointments SET patient_name=patient_name WHERE id=$1",
            [a.id],
          );
        } else if (parts[2] === "reschedule") {
          if (role !== "patient" && role !== "hospital")
            throw new Failure(403, "FORBIDDEN");
          if (a.status !== "confirmed") throw new Failure(409, "INVALID_STATE");
          const slotId = id.parse(req.body.slotId);
          const slot = (
            await db.query(
              "SELECT * FROM booking.slots WHERE id=$1 AND doctor_id=$2 AND NOT blocked AND starts_at>now() FOR UPDATE",
              [slotId, a.doctor_id],
            )
          ).rows[0];
          if (!slot || slot.id === a.slot_id)
            throw new Failure(409, "SLOT_TAKEN");
          if (
            (
              await db.query(
                "SELECT 1 FROM booking.appointments WHERE previous_id=$1 AND status='pending'",
                [a.id],
              )
            ).rowCount
          )
            throw new Failure(409, "RESCHEDULE_PENDING");
          if (role === "hospital")
            await db.query(
              "UPDATE booking.appointments SET status='cancelled' WHERE id=$1",
              [a.id],
            );
          const replacement = (
            await db.query(
              `INSERT INTO booking.appointments(tenant_id,doctor_id,slot_id,user_id,starts_at,ends_at,patient_name,previous_id,status) SELECT tenant_id,doctor_id,id,$2,starts_at,ends_at,$3,$4,$5 FROM booking.slots WHERE id=$1 RETURNING id`,
              [
                slotId,
                a.user_id,
                a.patient_name,
                a.id,
                role === "hospital" ? "confirmed" : "pending",
              ],
            )
          ).rows[0];
          if (role === "hospital")
            await db.query(
              "UPDATE booking.appointments SET status='declined' WHERE slot_id=$1 AND status='pending'",
              [slotId],
            );
          await db.query(
            "INSERT INTO booking.record_links SELECT $1,record_id FROM booking.record_links WHERE appointment_id=$2 ON CONFLICT DO NOTHING",
            [replacement.id, a.id],
          );
        } else throw new Failure(404, "NOT_FOUND");
        result = (
          await db.query("SELECT * FROM booking.appointments WHERE id=$1", [
            a.id,
          ])
        ).rows[0];
      }
    } else throw new Failure(404, "NOT_FOUND");
    if (req.method === "POST")
      await db.query("INSERT INTO booking.commands VALUES($1,$2,$3,$4)", [
        user,
        key,
        fingerprint,
        JSON.stringify(result ?? {}),
      ]);
    await db.query("COMMIT");
    res.json(result ?? {});
  } catch (e) {
    await db.query("ROLLBACK");
    if (e instanceof Failure) {
      res.status(e.status).json({ code: e.code });
      return;
    }
    if (["23505", "23P01", "40P01"].includes((e as { code: string }).code)) {
      res.status(409).json({ code: "CONFLICT" });
      return;
    }
    next(e);
  } finally {
    db.release();
  }
});
