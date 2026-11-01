import "dotenv/config";
import { z } from "zod";

export const env = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    CLICKHOUSE_URL: z.string().url(),
    CLICKHOUSE_DATABASE: z.string().default("hackathon"),
    CLICKHOUSE_USER: z.string(),
    CLICKHOUSE_PASSWORD: z.string(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    TRUSTED_ORIGINS: z.string().default("hackathon://"),
  })
  .parse(process.env);
