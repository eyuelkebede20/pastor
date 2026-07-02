import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// A placeholder keeps module import from throwing during `next build` when the
// database URL isn't present. Any real query at runtime still needs the real
// DATABASE_URL to be set.
const connectionString =
  process.env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/pastor";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema, casing: "snake_case" });
export { schema };
