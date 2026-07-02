import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

// Reads the better-auth session on the server. Returns null when logged out.
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const { id, name, email, image } = session.user;
    return { id, name, email, image };
  } catch {
    // No DB / not configured yet — treat as logged out rather than crashing.
    return null;
  }
}

// Convenience for server actions & protected pages.
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
