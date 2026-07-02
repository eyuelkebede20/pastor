import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let target: string | undefined;
  try {
    const rows = await db
      .select({ targetUrl: schema.shortLinks.targetUrl })
      .from(schema.shortLinks)
      .where(eq(schema.shortLinks.slug, slug))
      .limit(1);
    target = rows[0]?.targetUrl;
  } catch {
    target = undefined;
  }

  if (!target) {
    return NextResponse.redirect(new URL("/?notfound=1", req.url), 302);
  }

  // Fire-and-forget click count; never block the redirect on it.
  db.update(schema.shortLinks)
    .set({ clicks: sql`${schema.shortLinks.clicks} + 1` })
    .where(eq(schema.shortLinks.slug, slug))
    .catch(() => {});

  return NextResponse.redirect(target, 302);
}
