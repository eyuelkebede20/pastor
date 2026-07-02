"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/lib/session";
import { authClient } from "@/lib/auth-client";

const TABS = [
  { href: "/qr/generate", label: "Generate" },
  { href: "/qr/scan", label: "Scan" },
  { href: "/links", label: "My Links" },
];

function FinderMark() {
  // The wordmark's little finder square — same glyph as section headings.
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 border-2 border-accent bg-accent"
      style={{ boxShadow: "inset 0 0 0 2px var(--surface)", boxSizing: "border-box" }}
    />
  );
}

export function NavBar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
        >
          <FinderMark />
          Pastor
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {TABS.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-[8px] px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-bg text-sm font-semibold uppercase text-ink"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (user.name || user.email || "?").charAt(0)
                )}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 rounded-[8px] border border-border bg-surface p-1 shadow-sm"
                >
                  <div className="truncate px-3 py-2 text-xs text-muted">
                    {user.email}
                  </div>
                  <Link
                    href="/links"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-[6px] px-3 py-2 text-sm hover:bg-bg"
                  >
                    My Links
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setMenuOpen(false);
                      await authClient.signOut();
                      window.location.href = "/";
                    }}
                    className="block w-full rounded-[6px] px-3 py-2 text-left text-sm text-danger hover:bg-bg"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-[8px] bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90"
            >
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
