import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const rawDatabaseUrl =
  process.env.DATABASE_URL ?? "postgres://user:pass@127.0.0.1:5432/pastor";
const connectionString = rawDatabaseUrl
  .replace("@localhost:", "@127.0.0.1:")
  .replace("@localhost/", "@127.0.0.1/");

// Global singleton to prevent pool exhaustion during development hot-reloads
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    ssl:
      connectionString.includes("sslmode=require") ||
      connectionString.includes("ssl=true")
        ? { rejectUnauthorized: false }
        : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });
export { schema };
