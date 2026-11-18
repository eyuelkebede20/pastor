import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const info: Record<string, any> = {};

  info.nodeVersion = process.version;
  info.cwd = process.cwd();

  // Check env files
  const rootDir = path.resolve(process.cwd(), "..");
  info.envFiles = {
    cwdEnv: fs.existsSync(path.join(process.cwd(), ".env")),
    rootEnv: fs.existsSync(path.join(rootDir, ".env")),
  };

  // Check env vars
  const dbUrl = process.env.DATABASE_URL;
  info.envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    HAS_BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_SECRET_LEN: process.env.BETTER_AUTH_SECRET?.length || 0,
    HAS_DATABASE_URL: !!dbUrl,
    DATABASE_URL_PREVIEW: dbUrl
      ? `${dbUrl.split("@")[0].split(":")[0]}://***@${dbUrl.split("@")[1] || "no-at-sign"}`
      : "MISSING",
  };

  // Check DNS resolution for Neon
  try {
    const neonHost = "ep-soft-frost-atx0u8e5-pooler.c-9.us-east-1.aws.neon.tech";
    const addresses = await dns.lookup(neonHost);
    info.neonDns = { success: true, addresses };
  } catch (err: any) {
    info.neonDns = { success: false, error: err.message, code: err.code };
  }

  // Check Neon HTTPS reachability
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://ep-soft-frost-atx0u8e5-pooler.c-9.us-east-1.aws.neon.tech/sql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "SELECT 1" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    info.neonHttp = { success: true, status: res.status };
  } catch (err: any) {
    info.neonHttp = { success: false, error: err.message };
  }

  // Check local 127.0.0.1:5432 port
  try {
    const localPool = new Pool({
      host: "127.0.0.1",
      port: 5432,
      connectionTimeoutMillis: 2000,
    });
    await localPool.connect().then(c => c.release());
    await localPool.end();
    info.localPg = { success: true, message: "Port 5432 reachable" };
  } catch (err: any) {
    info.localPg = { success: false, error: err.message };
  }

  // Check current Drizzle DB Query
  try {
    const start = Date.now();
    const res = await db.execute(sql`SELECT 1 as num`);
    info.dbQuery = { success: true, durationMs: Date.now() - start, res };
  } catch (err: any) {
    info.dbQuery = { success: false, error: err.message };
  }

  return NextResponse.json(info);
}
