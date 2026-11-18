import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const defaultNeonUrl =
  "postgresql://neondb_owner:npg_nW1YXcMSmKE5@ep-soft-frost-atx0u8e5-pooler.c-9.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

let rawDatabaseUrl = process.env.DATABASE_URL;
if (
  !rawDatabaseUrl ||
  rawDatabaseUrl.includes("user:pass@127.0.0.1") ||
  rawDatabaseUrl.includes("user:pass@localhost")
) {
  rawDatabaseUrl = defaultNeonUrl;
}

const connectionString = rawDatabaseUrl
  .replace("@localhost:", "@127.0.0.1:")
  .replace("@localhost/", "@127.0.0.1/");

const sql = neon(connectionString);

export const db = drizzle(sql, { schema, casing: "snake_case" });
export { schema };
