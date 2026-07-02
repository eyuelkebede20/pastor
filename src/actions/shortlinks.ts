"use server";

import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { shortenSchema } from "@/lib/validators";
import { newSlug } from "@/lib/slugs";
import { getSessionUser } from "@/lib/session";
import { getBaseUrl, getClientIp } from "@/lib/base-url";

const ANON_DAILY_LIMIT = 30;

export type ShortenResult =
  | { ok: true; slug: string; shortUrl: string }
  | { ok: false; error: string };

// Creates a short link. Works anonymously (rate-limited per IP per day) or for
// a signed-in user. Used by the generator's "Shorten & get QR" action.
export async function createShortLink(input: {
  url: string;
}): Promise<ShortenResult> {
  const parsed = shortenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid URL." };
  }
  const targetUrl = parsed.data.url;

  const user = await getSessionUser();

  if (!user) {
    const ip = await getClientIp();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.shortLinks)
      .where(
        and(
          isNull(schema.shortLinks.userId),
          eq(schema.shortLinks.ownerIp, ip),
          gte(schema.shortLinks.createdAt, since),
        ),
      );
    if (count >= ANON_DAILY_LIMIT) {
      return {
        ok: false,
        error: "You've hit today's limit for anonymous short links. Log in for more.",
      };
    }
  }

  const slug = await createUniqueShortLink({
    targetUrl,
    userId: user?.id ?? null,
    ownerIp: user ? null : await getClientIp(),
  });
  if (!slug) {
    return { ok: false, error: "Couldn't create a short link. Please try again." };
  }

  const base = await getBaseUrl();
  return { ok: true, slug, shortUrl: `${base}/r/${slug}` };
}

// Inserts a short_links row, retrying on the (unlikely) slug collision.
export async function createUniqueShortLink(row: {
  targetUrl: string;
  userId: string | null;
  ownerIp: string | null;
}): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    try {
      await db.insert(schema.shortLinks).values({
        slug,
        targetUrl: row.targetUrl,
        userId: row.userId,
        ownerIp: row.ownerIp,
      });
      return slug;
    } catch {
      // Primary-key collision — try a fresh slug.
    }
  }
  return null;
}
