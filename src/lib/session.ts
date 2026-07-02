export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

// Resolved in Phase 3 once better-auth is wired up. Until then there is no
// session, so every caller sees a logged-out state.
export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}
