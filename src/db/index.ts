import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const rawDatabaseUrl =
  process.env.DATABASE_URL ?? "postgres://user:pass@127.0.0.1:5432/pastor";
const connectionString = rawDatabaseUrl
  .replace("@localhost:", "@127.0.0.1:")
  .replace("@localhost/", "@127.0.0.1/");

const sql = neon(connectionString);

export const db = drizzle(sql, { schema, casing: "snake_case" });
export { schema };

