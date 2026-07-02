"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { loginSchema, signupSchema } from "@/lib/validators";
import { Label } from "@/components/ui";

const inputCls =
  "w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = isSignup
      ? signupSchema.safeParse({ name, email, password })
      : loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }

    setBusy(true);
    try {
      const res = isSignup
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });

      if (res.error) {
        setError(
          res.error.message ||
            (isSignup
              ? "Couldn't create your account."
              : "Wrong email or password."),
        );
        setBusy(false);
        return;
      }
      router.push("/links");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="finder font-display text-2xl font-bold tracking-tight">
        {isSignup ? "Create your account" : "Log in"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {isSignup
          ? "You only need an account for your link page."
          : "Welcome back."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {isSignup && (
          <div>
            <Label htmlFor="name">Name</Label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={inputCls}
            />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputCls}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={inputCls}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40"
        >
          {busy
            ? "Please wait…"
            : isSignup
              ? "Create account"
              : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-accent">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
