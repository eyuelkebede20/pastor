import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// A placeholder keeps module import from throwing during `next build` when the
// database URL isn't present. Any real query at runtime still needs the real
// DATABASE_URL to be set.
// Normalize @localhost to @127.0.0.1 to avoid cPanel/CloudLinux IPv6 (::1) pg_hba.conf rejection
const rawDatabaseUrl =
  process.env.DATABASE_URL ?? "postgres://user:pass@127.0.0.1:5432/pastor";
const connectionString = rawDatabaseUrl
  .replace("@localhost:", "@127.0.0.1:")
  .replace("@localhost/", "@127.0.0.1/");

const sql = neon(connectionString);

export const db = drizzle(sql, { schema, casing: "snake_case" });
export { schema };
