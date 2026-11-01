import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { env } from "./env.js";
import { postgres, redis } from "./services.js";

export const auth = betterAuth({
  database: postgres,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.TRUSTED_ORIGINS.split(",").map((origin) => origin.trim()),
  emailAndPassword: { enabled: true },
  plugins: [expo()],
  secondaryStorage: {
    get: async (key) => redis.get(key),
    getAndDelete: async (key) => redis.getDel(key),
    increment: async (key, ttl) =>
      Number(
        await redis.eval(
          "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
          { keys: [key], arguments: [String(ttl)] },
        ),
      ),
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, { EX: ttl });
      else await redis.set(key, value);
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
});
