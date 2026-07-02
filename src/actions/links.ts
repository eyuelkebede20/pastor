"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { linkSchema } from "@/lib/validators";
import { requireUser } from "@/lib/session";
import { createUniqueShortLink } from "@/actions/shortlinks";

const MAX_LINKS = 50;

export type LinkResult = { ok: true } | { ok: false; error: string };

async function getUsername(userId: string): Promise<string | null> {
  const rows = await db
    .select({ username: schema.profiles.username })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId))
    .limit(1);
  return rows[0]?.username ?? null;
}

async function revalidate(userId: string) {
  revalidatePath("/links");
  const username = await getUsername(userId);
  if (username) revalidatePath(`/u/${username}`);
}

export async function addLink(input: {
  title: string;
  url: string;
}): Promise<LinkResult> {
  const user = await requireUser();
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the link." };
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.links)
    .where(eq(schema.links.userId, user.id));
  if (count >= MAX_LINKS) {
    return { ok: false, error: `You've reached the ${MAX_LINKS}-link limit.` };
  }

  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`coalesce(max(${schema.links.position}), -1)::int` })
    .from(schema.links)
    .where(eq(schema.links.userId, user.id));

  // Every link routes through an auto-created short link so clicks are counted
  // in one place.
  const slug = await createUniqueShortLink({
    targetUrl: parsed.data.url,
    userId: user.id,
    ownerIp: null,
  });

  await db.insert(schema.links).values({
    userId: user.id,
    title: parsed.data.title,
    url: parsed.data.url,
    position: maxPos + 1,
    shortSlug: slug,
  });

  await revalidate(user.id);
  return { ok: true };
}

export async function editLink(input: {
  id: string;
  title: string;
  url: string;
}): Promise<LinkResult> {
  const user = await requireUser();
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the link." };
  }

  const rows = await db
    .update(schema.links)
    .set({ title: parsed.data.title, url: parsed.data.url })
    .where(and(eq(schema.links.id, input.id), eq(schema.links.userId, user.id)))
    .returning({ shortSlug: schema.links.shortSlug });

  // Keep the short link's target in sync with the link's URL.
  const slug = rows[0]?.shortSlug;
  if (slug) {
    await db
      .update(schema.shortLinks)
      .set({ targetUrl: parsed.data.url })
      .where(eq(schema.shortLinks.slug, slug));
  }

  await revalidate(user.id);
  return { ok: true };
}

export async function toggleLink(input: {
  id: string;
  isActive: boolean;
}): Promise<LinkResult> {
  const user = await requireUser();
  await db
    .update(schema.links)
    .set({ isActive: input.isActive })
    .where(and(eq(schema.links.id, input.id), eq(schema.links.userId, user.id)));
  await revalidate(user.id);
  return { ok: true };
}

export async function deleteLink(input: { id: string }): Promise<LinkResult> {
  const user = await requireUser();
  const rows = await db
    .delete(schema.links)
    .where(and(eq(schema.links.id, input.id), eq(schema.links.userId, user.id)))
    .returning({ shortSlug: schema.links.shortSlug });

  const slug = rows[0]?.shortSlug;
  if (slug) {
    await db.delete(schema.shortLinks).where(eq(schema.shortLinks.slug, slug));
  }

  await revalidate(user.id);
  return { ok: true };
}

export async function moveLink(input: {
  id: string;
  direction: "up" | "down";
}): Promise<LinkResult> {
  const user = await requireUser();

  const ordered = await db
    .select({ id: schema.links.id, position: schema.links.position })
    .from(schema.links)
    .where(eq(schema.links.userId, user.id))
    .orderBy(asc(schema.links.position));

  const index = ordered.findIndex((l) => l.id === input.id);
  if (index === -1) return { ok: false, error: "Link not found." };

  const swapWith = input.direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= ordered.length) return { ok: true };

  const a = ordered[index];
  const b = ordered[swapWith];

  await Promise.all([
    db
      .update(schema.links)
      .set({ position: b.position })
      .where(and(eq(schema.links.id, a.id), eq(schema.links.userId, user.id))),
    db
      .update(schema.links)
      .set({ position: a.position })
      .where(and(eq(schema.links.id, b.id), eq(schema.links.userId, user.id))),
  ]);

  await revalidate(user.id);
  return { ok: true };
}
