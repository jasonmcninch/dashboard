import { DietPanel } from "@/components/diet-panel";
import { LifeScoreModal } from "@/components/life-score-modal";
import { ProgressRing } from "@/components/progress-ring";
import { FamilyChecklist } from "@/components/family-checklist";
import { PlanToast } from "@/components/plan-toast";
import { RemindersPanel } from "@/components/reminders-panel";
import { SpiritualChecklist } from "@/components/spiritual-checklist";
import { WellnessChecklist } from "@/components/wellness-checklist";
import { getDashboardSource, mailCleanPct } from "@/lib/data";
import { getDiet } from "@/lib/diet";
import { getFamily } from "@/lib/family";
import { getHistory as getLifeScoreHistory, recordToday } from "@/lib/life-score";
import { getReminders } from "@/lib/reminders";
import type { ActionRequest, ConnectionStatus } from "@/lib/data";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getSpiritual } from "@/lib/spiritual";
import { getWellness } from "@/lib/wellness";
import { cookies } from "next/headers";

const CORAL = "#E8624A";

const surface = {
  background: "var(--c-surface)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow-sm)",
  border: "1px solid var(--c-border)",
} as const;

const panel = {
  background: "var(--c-surface2)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow)",
  border: "1px solid var(--c-border)",
} as const;

function SectionTag({
  children,
  icon,
}: {
  children: string;
  icon?: React.ReactNode;
}) {
  return (
    <p
      className="mb-4 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]"
      style={{ color: "var(--c-text-faint)" }}
    >
      {icon}
      {children}
    </p>
  );
}

/**
 * Section icons.
 *
 * Sized in `em` and stroked with `currentColor` so each one tracks the label's
 * font size and colour rather than carrying its own. Stroke width is set in the
 * shared wrapper to keep the whole set optically consistent — the labels are
 * 10px, so anything heavier reads as a blob.
 */
function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="1.6em"
      height="1.6em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

function BarbellIcon() {
  return (
    <SectionIcon>
      {/* bar */}
      <path d="M7 12h10" />
      {/* inner collars */}
      <path d="M7 8.5v7M17 8.5v7" />
      {/* outer plates */}
      <path d="M4.5 6.5v11M19.5 6.5v11" />
      {/* end caps */}
      <path d="M2.5 9.5v5M21.5 9.5v5" />
    </SectionIcon>
  );
}

function EnvelopeIcon() {
  return (
    <SectionIcon>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      {/* flap drawn as an open V so it stays legible at 10px */}
      <path d="M3.5 7l8.5 6 8.5-6" />
    </SectionIcon>
  );
}

function BookIcon() {
  return (
    <SectionIcon>
      {/* open book: spine plus two leaves */}
      <path d="M12 6.5v13" />
      <path d="M12 6.5C10 5 6.5 4.5 3.5 5v12.5c3-.5 6.5 0 8.5 1.5" />
      <path d="M12 6.5C14 5 17.5 4.5 20.5 5v12.5c-3-.5-6.5 0-8.5 1.5" />
    </SectionIcon>
  );
}

function HamburgerIcon() {
  return (
    <SectionIcon>
      {/* top bun */}
      <path d="M4 11a8 4 0 0 1 16 0" />
      {/* filling */}
      <path d="M3.5 14h17" />
      {/* bottom bun: flat top, curved base */}
      <path d="M4 17h16" />
      <path d="M20 17a8 3 0 0 1-16 0" />
    </SectionIcon>
  );
}

function PeopleIcon() {
  return (
    <SectionIcon>
      {/* two figures: heads and shoulders */}
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9.5" r="2.25" />
      <path d="M16 14.5a4.5 4.5 0 0 1 4.5 4.5" />
    </SectionIcon>
  );
}

function BellRingIcon() {
  return (
    <SectionIcon>
      {/* bell body */}
      <path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5.5 1.5 5.5h-13S7 14 7 10Z" />
      {/* clapper */}
      <path d="M10.25 18.5a2 2 0 0 0 3.5 0" />
    </SectionIcon>
  );
}

function ServiceBellIcon() {
  return (
    <SectionIcon>
      {/* dome */}
      <path d="M4 16a8 8 0 0 1 16 0" />
      {/* base */}
      <path d="M2.5 16h19" />
      {/* handle */}
      <path d="M12 8V6.5" />
      <circle cx="12" cy="5" r="1.25" />
    </SectionIcon>
  );
}

/**
 * A single count.
 *
 * With an `href` the whole card becomes a link and shows a chevron; without one
 * it's inert and shows none. The chevron is therefore an honest affordance —
 * it appears only where there's somewhere to go, so a card for an unconnected
 * account never looks tappable.
 */
function StatCard({
  value,
  label,
  href,
}: {
  /** null renders as a dash — "we don't know" rather than a misleading zero. */
  value: number | string | null;
  label: string;
  href?: string | null;
}) {
  const body = (
    <>
      <div>
        <div className="text-xl font-bold leading-none">
          {value === null
            ? "—"
            : typeof value === "number"
              ? value.toLocaleString()
              : value}
        </div>
        <div className="mt-1 text-[11px]" style={{ color: "var(--c-text-dim)" }}>
          {label}
        </div>
      </div>
      {href && (
        <span className="text-lg" style={{ color: "var(--c-text-faint)" }} aria-hidden>
          ›
        </span>
      )}
    </>
  );

  const shell = "flex items-center justify-between rounded-[18px] px-4 py-3.5";

  if (!href) {
    return (
      <div className={shell} style={surface}>
        {body}
      </div>
    );
  }

  return (
    <a
      href={href}
      // New tab: the dashboard is a glance-and-go surface, and replacing it with
      // Gmail would lose the rest of the page.
      target="_blank"
      rel="noopener noreferrer"
      // The whole card is the target rather than just the chevron — a 16px glyph
      // is far too small to hit reliably on a phone.
      className={`${shell} transition-opacity hover:opacity-80`}
      style={surface}
      aria-label={`${label}: ${value ?? "unknown"} — open in Gmail`}
    >
      {body}
    </a>
  );
}

/**
 * Ring + percentage + caption.
 *
 * Shared by every section and by the summary row at the top, so all five read as
 * the same kind of measurement rather than five lookalike one-offs.
 *
 * `dense` drops the minimum width and tightens the padding for the summary row,
 * where four sit side by side; the in-section boxes stand alone and want the
 * larger presentation.
 */
function ScoreBox({
  pct,
  caption,
  dense = false,
  delay = 0,
  glowWhenIncomplete = false,
  href,
}: {
  /** null renders as "—" with an empty ring: nothing recorded yet. */
  pct: number | null;
  caption: React.ReactNode;
  dense?: boolean;
  /** Staggers this box's ring against the others in a row. */
  delay?: number;
  /** Ring the box in accent colour unless it's finished. */
  glowWhenIncomplete?: boolean;
  /** In-page anchor to jump to. Renders the box as a link when set. */
  href?: string;
}) {
  // Unrated counts as unfinished. A section you haven't logged today needs your
  // attention just as much as one sitting at 60% — arguably more.
  const incomplete = pct === null || pct < 100;
  const glow = glowWhenIncomplete && incomplete;
  const shell = `neu-box ${
    dense
      ? "flex flex-col items-center justify-center rounded-2xl px-3 py-4"
      : "flex flex-col items-center justify-center rounded-2xl px-6 py-6 sm:min-w-[9.5rem]"
  }${glow ? " score-glow" : ""}${href ? " neu-press cursor-pointer" : ""}`;

  const body = (
    <>
      <ProgressRing pct={pct} size={dense ? 44 : 52} delay={delay} />
      <div className={dense ? "mt-2 text-xl font-bold" : "mt-3 text-2xl font-bold"}>
        {pct === null ? "—" : `${pct}%`}
      </div>
      <div
        className={`text-center leading-snug ${dense ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]"}`}
        style={{ color: "var(--c-text-dim)" }}
      >
        {caption}
      </div>
    </>
  );

  // A plain anchor, not a router push: an in-page hash is exactly what anchors are
  // for, and CSS `scroll-behavior: smooth` handles the animation without shipping any
  // JavaScript to do it.
  if (href) {
    return (
      <a href={href} className={shell} aria-label={`Jump to ${caption}`}>
        {body}
      </a>
    );
  }

  return <div className={shell}>{body}</div>;
}

const CONNECTION_DOT: Record<ConnectionStatus["state"], string> = {
  connected: "#4ADE80",
  not_configured: "rgba(255,255,255,0.25)",
  blocked: "#FBBF24",
  error: CORAL,
};

function ConnectionRow({ connection }: { connection: ConnectionStatus }) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] px-4 py-3" style={surface}>
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: CONNECTION_DOT[connection.state] }}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="text-xs font-bold">{connection.label}</div>
        {connection.detail && (
          <div
            className="mt-0.5 text-[11px] leading-relaxed"
            style={{ color: "var(--c-text-dim)" }}
          >
            {connection.detail}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestRow({ request }: { request: ActionRequest }) {
  const isPlaceholder = request.href === "#";
  return (
    <div className="flex items-center gap-4 rounded-xl px-4 py-3" style={surface}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">{request.from}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider"
            style={{ border: "1px solid var(--c-border-dim)", color: "var(--c-text-faint)" }}
          >
            {request.source}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--c-text-dim)" }}>
          {request.summary}
        </div>
      </div>
      {isPlaceholder ? (
        <span
          className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold"
          style={{ border: "1px solid var(--c-border-dim)", color: "var(--c-text-faint)" }}
        >
          Awaiting →
        </span>
      ) : (
        <a
          href={request.href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold transition-opacity hover:opacity-80"
          style={{ background: CORAL, color: "#fff" }}
        >
          Open →
        </a>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await verifySessionToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  const source = getDashboardSource();
  // Wellness is local state, so it loads independently of the integrations —
  // a Gmail outage shouldn't take the checklist down with it.
  const [data, wellness, spiritual, diet, family, reminders] =
    await Promise.all([
      source.load(),
      getWellness(),
      getSpiritual(),
      getDiet(),
      getFamily(),
      getReminders(),
    ]);
  const usingMockData = source.name === "mock";

  // The diet slider already stores a percentage. Stays null when unrated so the
  // box shows "—" rather than implying a zero.
  const dietPct = diet.satisfaction;

  // One number for the whole page: the mean of every section that has a score.
  //
  // Unrated sections are left out of the average rather than counted as 0 — a day
  // you haven't rated your diet yet shouldn't drag the total down. If nothing at
  // all is scoreable the dial shows "—".
  const sectionScores = [
    family.completedPct,
    spiritual.completedPct,
    wellness.completedPct,
    dietPct,
    mailCleanPct(data.mail),
    reminders.completedPct,
  ].filter((score): score is number => score !== null);

  const lifeScore = sectionScores.length
    ? Math.round(
        sectionScores.reduce((sum, score) => sum + score, 0) /
          sectionScores.length,
      )
    : null;

  // Snapshot today's figure, then read back the weekly averages. Sequential because
  // the history has to include the value just written — the current week's average
  // would otherwise lag a page load behind.
  await recordToday(lifeScore);
  const lifeHistory = await getLifeScoreHistory();

  // The dial shows THIS WEEK's average rather than the instantaneous score, matching
  // its label. The live figure is still what gets recorded above.
  const weekScore = lifeHistory.weeks[0]?.score ?? lifeScore;

  return (
    <div
      data-theme="dark"
      className="min-h-screen"
      style={{
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-8 py-5"
        style={{ background: "var(--c-nav-grad)" }}
      >
        <span className="text-sm font-bold tracking-widest" style={{ color: CORAL }}>
          mcninch.live
        </span>
        <div className="flex items-center gap-4">
          <span className="text-[11px]" style={{ color: "var(--c-text-dim)" }}>
            {session?.sub}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-full px-4 py-1.5 text-[11px] transition-opacity hover:opacity-70"
              style={{ border: "1px solid var(--c-border-dim)", color: "var(--c-text-dim)" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        {usingMockData && (
          <p className="mb-6 text-sm" style={{ color: "var(--c-text-dim)" }}>
            Showing placeholder data — no accounts are connected yet.
          </p>
        )}

        <PlanToast
          week={spiritual.week}
          topic={spiritual.topic}
          reminders={reminders}
        />

        <LifeScoreModal pct={weekScore} weeks={lifeHistory.weeks} />

        {/* ── Summary ──
            Every section's headline number in one row, so the whole day reads at a
            glance without scrolling. Each is repeated in its own section below.
            Two-up on phones — four 25%-wide boxes would squeeze the ring and wrap
            the captions. */}
        <section className="mb-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Staggered left to right, starting after the dial's sweep has begun so
                the eye follows the page down rather than everything moving at once. */}
            <ScoreBox dense glowWhenIncomplete delay={0.5} pct={family.completedPct} caption="Family" href="#family" />
            <ScoreBox dense glowWhenIncomplete delay={0.58} pct={spiritual.completedPct} caption="Spiritual" href="#spiritual" />
            <ScoreBox dense glowWhenIncomplete delay={0.66} pct={wellness.completedPct} caption="Wellness" href="#wellness" />
            <ScoreBox dense glowWhenIncomplete delay={0.74} pct={dietPct} caption="Diet" href="#diet" />
            <ScoreBox dense glowWhenIncomplete delay={0.82} pct={mailCleanPct(data.mail)} caption="Email" href="#email" />
            <ScoreBox dense glowWhenIncomplete delay={0.9} pct={reminders.completedPct} caption="Reminders" href="#reminders" />
          </div>
        </section>









        {/* ── Requests ── */}
        <section id="requests" data-section className="mb-12">
          <SectionTag icon={<ServiceBellIcon />}>Asking you for something</SectionTag>
          <div className="space-y-2 rounded-2xl p-5" style={panel}>
            {data.requests.length === 0 ? (
              <p className="py-6 text-center text-[11px]" style={{ color: "var(--c-text-faint)" }}>
                Nothing waiting on you.
              </p>
            ) : (
              data.requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))
            )}
          </div>
        </section>

        {/* ── Family ── */}
        <section id="family" data-section className="mb-12">
          <SectionTag icon={<PeopleIcon />}>Family</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox pct={family.completedPct} caption="Family" />
            <div className="rounded-2xl p-5" style={panel}>
              <FamilyChecklist initial={family} />
            </div>
          </div>
        </section>
        {/* ── Spiritual ── */}
        <section id="spiritual" data-section className="mb-12">
          <SectionTag icon={<BookIcon />}>Spiritual</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox pct={spiritual.completedPct} caption="Spirituality" />
            <div className="rounded-2xl p-5" style={panel}>
              <SpiritualChecklist initial={spiritual} />
            </div>
          </div>
        </section>
        {/* ── Wellness ── */}
        <section id="wellness" data-section className="mb-12">
          <SectionTag icon={<BarbellIcon />}>Wellness</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox pct={wellness.completedPct} caption="This week" />
            <div className="rounded-2xl p-5" style={panel}>
              <WellnessChecklist initial={wellness} />
            </div>
          </div>
        </section>
        {/* ── Diet ── */}
        <section id="diet" data-section className="mb-12">
          <SectionTag icon={<HamburgerIcon />}>Diet</SectionTag>
          <div className="rounded-2xl p-5" style={panel}>
            <DietPanel initial={diet} />
          </div>
        </section>
        {/* ── Inbox ── */}
        <section id="email" data-section className="mb-12">
          <SectionTag icon={<EnvelopeIcon />}>Email</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox
              pct={mailCleanPct(data.mail)}
              caption={
                <>
                  Clean &amp;
                  <br />
                  Up To Date
                </>
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <StatCard value={data.mail.unread} label="Unread" href={data.mail.links.unreadInbox} />
              <StatCard value={data.mail.inboxTotal} label="In inbox" />
              <StatCard value={data.mail.workUnread} label="Unread Work" href={data.mail.links.unreadWork} />
              <StatCard value={data.mail.trashed} label="In trash" href={data.mail.links.trash} />
            </div>
          </div>
        </section>
        {/* ── Slack ── */}
        <section id="slack" data-section className="mb-12">
          <SectionTag>Slack</SectionTag>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard value={data.slack.unread} label="Unread" />
            <StatCard value={data.slack.received} label="Received" />
            <StatCard value={data.slack.awaiting} label="Awaiting reply" />
          </div>
        </section>
        {/* ── Reminders ── */}
        <section id="reminders" data-section className="mb-12">
          <SectionTag icon={<BellRingIcon />}>Reminders &amp; Promptings</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox pct={reminders.completedPct} caption="Reminders &amp; Promptings" />
            <div className="rounded-2xl p-5" style={panel}>
              <RemindersPanel initial={reminders} />
            </div>
          </div>
        </section>

        {/* ── Connections ── */}
        <section>
          <SectionTag>Connections</SectionTag>
          <div className="space-y-2">
            {data.connections.map((connection) => (
              <ConnectionRow key={connection.id} connection={connection} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
