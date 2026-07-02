"use client";

import { createAuthClient } from "better-auth/react";

// baseURL is omitted so the client uses the current origin — correct in both
// local dev and on the Vercel deployment.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
