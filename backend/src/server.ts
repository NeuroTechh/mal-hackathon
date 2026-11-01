import { app } from "./app.js";
import { env } from "./lib/env.js";
import { redis, closeServices } from "./lib/services.js";

await redis.connect();
const server = app.listen(env.PORT, "0.0.0.0", () =>
  console.log(`API listening on ${env.PORT}`),
);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await closeServices();
    clearTimeout(timeout);
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
