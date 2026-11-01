import { createClient as createClickHouseClient } from "@clickhouse/client";
import { Pool } from "pg";
import { createClient } from "redis";
import { env } from "./env.js";

export const postgres = new Pool({ connectionString: env.DATABASE_URL });
export const redis = createClient({ url: env.REDIS_URL });
redis.on("error", (error) => console.error("Redis error", error));
export const clickhouse = createClickHouseClient({
  url: env.CLICKHOUSE_URL,
  database: env.CLICKHOUSE_DATABASE,
  username: env.CLICKHOUSE_USER,
  password: env.CLICKHOUSE_PASSWORD,
});

export async function closeServices() {
  await Promise.allSettled([
    postgres.end(),
    clickhouse.close(),
    redis.isOpen ? redis.quit() : Promise.resolve(),
  ]);
}
