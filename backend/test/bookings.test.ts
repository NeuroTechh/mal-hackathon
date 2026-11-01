import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.js";
import { postgres, redis, closeServices } from "../src/lib/services.js";
test("requests, idempotency, authorization and concurrent approval", async () => {
  await redis.connect();
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const users: string[] = [];
  const tenant = randomUUID(),
    doctor = randomUUID(),
    slot = randomUUID();
  async function account() {
    const r = await fetch(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:8081",
      },
      body: JSON.stringify({
        email: `${randomUUID()}@example.com`,
        password: randomUUID(),
        name: "Test",
      }),
    });
    assert.equal(r.status, 200);
    const b = (await r.json()) as any;
    users.push(b.user.id);
    return {
      id: b.user.id,
      cookie: r.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; "),
    };
  }
  async function post(
    path: string,
    cookie: string,
    body = {},
    version?: number,
    key = randomUUID(),
  ) {
    const r = await fetch(`${base}/v1${path}`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        ...(version ? { "If-Match": String(version) } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: (await r.json()) as any };
  }
  try {
    const a = await account(),
      b = await account(),
      staff = await account();
    await postgres.query(
      "INSERT INTO booking.clinics VALUES($1,'Test','Test','Asia/Kolkata')",
      [tenant],
    );
    await postgres.query(
      "INSERT INTO booking.doctors VALUES($1,$2,'Test','General','English',0)",
      [doctor, tenant],
    );
    await postgres.query("INSERT INTO booking.staff VALUES($1,$2)", [
      staff.id,
      tenant,
    ]);
    await postgres.query(
      "INSERT INTO booking.slots(id,tenant_id,doctor_id,starts_at,ends_at) VALUES($1,$2,$3,now()+interval '2 days',now()+interval '2 days 30 minutes')",
      [slot, tenant, doctor],
    );
    const key = randomUUID();
    const r1 = await post(
      "/appointment-requests",
      a.cookie,
      { slotId: slot },
      undefined,
      key,
    );
    assert.equal(r1.status, 200);
    assert.equal(r1.body.status, "pending");
    assert.equal(
      (
        await post(
          "/appointment-requests",
          a.cookie,
          { slotId: slot },
          undefined,
          key,
        )
      ).body.id,
      r1.body.id,
    );
    assert.equal(
      (
        await post(
          "/appointment-requests",
          a.cookie,
          { slotId: randomUUID() },
          undefined,
          key,
        )
      ).status,
      409,
    );
    const r2 = await post("/appointment-requests", b.cookie, { slotId: slot });
    assert.equal(r2.status, 200);
    assert.equal(
      (await post(`/requests/${r1.body.id}/confirm`, a.cookie, {}, 1)).status,
      403,
    );
    assert.ok(
      [403, 404].includes(
        (await post(`/appointments/${r1.body.id}/cancel`, b.cookie, {}, 1))
          .status,
      ),
    );
    const results = await Promise.all([
      post(`/requests/${r1.body.id}/confirm`, staff.cookie, {}, 1),
      post(`/requests/${r2.body.id}/confirm`, staff.cookie, {}, 1),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    const rows = (await (
      await fetch(`${base}/v1/appointments?view=clinic`, {
        headers: { Cookie: staff.cookie },
      })
    ).json()) as any[];
    assert.equal(rows.filter((r) => r.status === "confirmed").length, 1);
    assert.equal(rows.filter((r) => r.status === "declined").length, 1);
    const winner = rows.find((r) => r.status === "confirmed");
    assert.equal(
      (await post(`/appointments/${winner.id}/cancel`, staff.cookie, {}, 1))
        .status,
      409,
    );
    assert.equal(
      (
        await post(
          `/appointments/${winner.id}/cancel`,
          staff.cookie,
          {},
          winner.version,
        )
      ).body.status,
      "cancelled",
    );
    assert.equal(
      (await post("/appointment-requests", a.cookie, { slotId: slot })).status,
      200,
    );
    assert.ok(
      (
        await postgres.query(
          "SELECT 1 FROM booking.outbox WHERE tenant_id=$1",
          [tenant],
        )
      ).rowCount! >= 6,
    );
  } finally {
    try {
      const db = await postgres.connect();
      try {
        await db.query("BEGIN");
        await db.query("SELECT set_config('app.user_id',$1,true)", [
          users[2] ?? "",
        ]);
        for (const table of [
          "outbox",
          "appointments",
          "slots",
          "staff",
          "doctors",
        ])
          await db.query(`DELETE FROM booking.${table} WHERE tenant_id=$1`, [
            tenant,
          ]);
        await db.query("DELETE FROM booking.clinics WHERE id=$1", [tenant]);
        await db.query(
          "DELETE FROM booking.commands WHERE user_id=ANY($1::text[])",
          [users],
        );
        await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [users]);
        await db.query("COMMIT");
      } catch (e) {
        await db.query("ROLLBACK");
        console.error("Test fixture cleanup failed", e);
      } finally {
        db.release();
      }
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
      await closeServices();
    }
  }
});
