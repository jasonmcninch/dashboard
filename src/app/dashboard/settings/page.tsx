import { cookies } from "next/headers";
import Link from "next/link";
import { SettingsForm } from "@/components/settings-form";
import { MananaMark } from "@/components/manana-mark";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getOverrides } from "@/lib/settings";

const CORAL = "#E8624A";

export const metadata = { title: "Settings — mañana" };

/**
 * The back office.
 *
 * A separate route rather than a modal over the dashboard: it's a form with forty-odd
 * fields, it wants its own scroll position, and being linkable means a bookmark goes
 * straight to it. The dashboard re-reads its labels on every request, so returning to
 * it shows the new wording with no cache to bust.
 */
export default async function SettingsPage() {
  const session = await verifySessionToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  const overrides = await getOverrides();

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <nav
        className="sticky top-0 z-50 flex items-center justify-between gap-2 px-4 py-5 sm:px-8"
        style={{ background: "var(--c-nav-grad)" }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-bold tracking-widest transition-opacity hover:opacity-70"
          style={{ color: CORAL }}
        >
          <MananaMark size={22} />
          mañana
        </Link>
        <div className="flex items-center gap-3">
          <span className="nav-avatar" title={session?.sub ?? undefined}>
            <span aria-hidden>
              {session?.sub?.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <span className="sr-only">Signed in as {session?.sub ?? "unknown"}</span>
          </span>
          <Link
            href="/dashboard"
            className="rounded-full px-4 py-1.5 text-[11px] transition-opacity hover:opacity-70"
            style={{
              border: "1px solid var(--c-border-dim)",
              color: "var(--c-text-dim)",
            }}
          >
            Done
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        <h1 className="mb-2 text-xl font-bold">Settings</h1>
        <p className="mb-8 text-[12px] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          Rename anything on the dashboard. Leave a field empty to go back to the
          wording it ships with — the grey text shows you what that is.
        </p>

        <SettingsForm initialOverrides={overrides} />
      </main>
    </div>
  );
}
