import express from "express";
import { directory } from "./modules/directory.js";
import { ZodError } from "zod";
import { bookings } from "./modules/bookings.js";
import cors from "cors";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { env } from "./lib/env.js";
import { postgres, redis, clickhouse } from "./lib/services.js";

export const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: env.TRUSTED_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json({ limit: "8mb" }));
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/health/ready", async (_req, res) => {
  const results = await Promise.allSettled([
    postgres.query("SELECT 1"),
    redis.ping(),
    clickhouse.query({ query: "SELECT 1" }).then((r) => r.json()),
  ]);
  const services = Object.fromEntries(
    ["postgres", "redis", "clickhouse"].map((name, i) => [
      name,
      results[i].status === "fulfilled",
    ]),
  );
  const ready = Object.values(services).every(Boolean);
  res
    .status(ready ? 200 : 503)
    .json({ status: ready ? "ready" : "unavailable", services });
});
app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ user: session.user });
});
app.use("/v1", directory);
app.use("/v1", bookings);
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({ code: "INVALID_INPUT" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  },
);
