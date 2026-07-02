"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { profileSchema, usernameSchema } from "@/lib/validators";
import { requireUser } from "@/lib/session";

export async function checkUsername(raw: string): Promise<{
  available: boolean;
  normalized?: string;
  reason?: string;
}> {
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    return { available: false, reason: parsed.error.issues[0]?.message };
  }
  const existing = await db
    .select({ username: schema.profiles.username })
    .from(schema.profiles)
    .where(eq(schema.profiles.username, parsed.data))
    .limit(1);
  return existing.length
    ? { available: false, reason: "That username is taken." }
    : { available: true, normalized: parsed.data };
}

export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function createProfile(input: {
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}): Promise<ProfileResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const existing = await db
    .select({ userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);
  if (existing.length) {
    return { ok: false, error: "You already have a profile." };
  }

  try {
    await db.insert(schema.profiles).values({
      userId: user.id,
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || null,
      avatarUrl: parsed.data.avatarUrl || null,
    });
  } catch {
    return { ok: false, error: "That username was just taken. Try another." };
  }

  revalidatePath("/links");
  return { ok: true };
}

export async function updateProfile(input: {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}): Promise<ProfileResult> {
  const user = await requireUser();
  const parsed = profileSchema
    .omit({ username: true })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const rows = await db
    .update(schema.profiles)
    .set({
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || null,
      avatarUrl: parsed.data.avatarUrl || null,
    })
    .where(eq(schema.profiles.userId, user.id))
    .returning({ username: schema.profiles.username });

  if (rows.length) {
    revalidatePath("/links");
    revalidatePath(`/u/${rows[0].username}`);
  }
  return { ok: true };
}
