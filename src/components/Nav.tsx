import { getSessionUser } from "@/lib/session";
import { NavBar } from "@/components/NavBar";

// Server component: resolves the current user, then hands off to the
// client NavBar for active-link styling and the auth menu.
export async function Nav() {
  const user = await getSessionUser();
  return <NavBar user={user} />;
}
