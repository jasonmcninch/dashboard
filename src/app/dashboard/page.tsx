import { ThemeToggle } from "@/components/theme-toggle";
import { MananaMark } from "@/components/manana-mark";
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
import { dayKey } from "@/lib/calendar";
import { getLabels } from "@/lib/settings";
import { DayBar } from "@/components/day-bar";
import { DaySwipe } from "@/components/day-swipe";
import { getDailyScore } from "@/lib/life-score";
import { parseDayParam, toDayParam } from "@/lib/day-view";
import { cookies } from "next/headers";
import Link from "next/link";

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

  // Finished: the mark alone, centred, in place of the ring, the number and the
  // caption. At 100% the ring is a plain closed circle and the number is always the
  // same three characters, so both say less plainly what the mark says.
  //
  // The visible text goes away but the accessible name must not: the caption and the
  // figure move into a visually-hidden label, so a screen reader still hears which
  // section this is and that it is complete.
  const done = pct === 100;

  const body = done ? (
    <div className="relative flex flex-col items-center justify-center">
      {/* A hidden copy of the unfinished layout, purely to reserve its height.
          `invisible` is visibility:hidden, which still takes up space — unlike
          `hidden`/display:none. Without it a completed box is shorter than its
          neighbours and the grid rows stop lining up, which is exactly what happened on
          the first attempt. Reserving the real thing beats hard-coding a pixel height
          that would drift the moment the type or ring size changes. */}
      <div className="invisible" aria-hidden>
        <ProgressRing pct={100} size={dense ? 44 : 52} delay={0} />
        <div className={dense ? "mt-2 text-xl font-bold" : "mt-3 text-2xl font-bold"}>
          100%
        </div>
        <div
          className={`text-center leading-snug ${dense ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]"}`}
        >
          {caption}
        </div>
      </div>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: CORAL }}
      >
        <MananaMark size={dense ? 44 : 52} />
      </span>
      <span className="sr-only">{caption}: complete</span>
    </div>
  ) : (
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const dayParam = (await searchParams).day;
  // Anything malformed, in the future, or older than the window falls back to today —
  // a hand-edited URL shouldn't be a broken page.
  const viewing = parseDayParam(
    Array.isArray(dayParam) ? dayParam[0] : dayParam,
  );
  const on = viewing ?? new Date();
  const isToday = viewing === null;

  const session = await verifySessionToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  // First letter of the username, for the nav avatar. Falls back to "?" rather than
  // rendering an empty circle if a session somehow carries no subject.
  const initial = session?.sub?.trim().charAt(0).toUpperCase() || "?";

  const source = getDashboardSource();
  // Wellness is local state, so it loads independently of the integrations —
  // a Gmail outage shouldn't take the checklist down with it.
  const [data, wellness, spiritual, diet, family, reminders, labels] =
    await Promise.all([
      source.load(),
      getWellness(on),
      getSpiritual(on),
      getDiet(dayKey(on)),
      getFamily(on),
      getReminders(),
      // Every renameable string on this page. Read per request, so returning from
      // the settings screen shows the new wording with no cache to invalidate.
      getLabels(),
    ]);
  const usingMockData = source.name === "mock";

  /**
   * Mail, Slack and the requests feed are read LIVE from the accounts — nothing about
   * them is stored per day, so on a past date they describe right now, not that day.
   * Rendering them under yesterday's heading would present today's inbox as history,
   * which is the one thing this view must not do. Same for reminders, which carry a
   * done flag and no date.
   */
  const liveOnly = !isToday;
  const notRecorded = (
    <p className="text-[12px]" style={{ color: "var(--c-text-dim)" }}>
      Read live from the account — not recorded per day, so there is nothing to show for
      a past date.
    </p>
  );

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
  // Only today's visit records anything. Viewing history must not rewrite it — and the
  // score computed from a past day's data is not what was recorded at the time anyway,
  // since mail counts are live and can't be replayed.
  if (isToday) await recordToday(lifeScore);
  const lifeHistory = await getLifeScoreHistory();
  const recordedScore = isToday ? null : await getDailyScore(on);

  // The dial shows THIS WEEK's average rather than the instantaneous score, matching
  // its label. The live figure is still what gets recorded above.
  // On a past day, show that day's recorded figure rather than this week's average.
  const weekScore = isToday
    ? (lifeHistory.weeks[0]?.score ?? lifeScore)
    : recordedScore;

  return (
    // No data-theme here: it lives on the root element so one attribute themes the
    // whole document, and the toggle in the nav flips it.
    <div
      className="min-h-screen"
      style={{
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between gap-2 px-4 py-5 sm:px-8"
        style={{ background: "var(--c-nav-grad)" }}
      >
        {/* Mark plus wordmark, both coral. The mark carries currentColor, so it takes
            the colour from this span rather than restating it. */}
        <span
          className="flex items-center gap-2 text-sm font-bold tracking-widest"
          style={{ color: CORAL }}
        >
          <MananaMark size={22} />
          mañana
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/dashboard/settings"
            className="nav-icon"
            aria-label="Preferences"
          >
            <SectionIcon>
              {/* Three faders, each with its knob at a different position — the
                  conventional "preferences" glyph, and a better fit than a gear for a
                  screen that is entirely adjustable values.

                  Each rail is drawn as two segments with a gap where its knob sits,
                  rather than one rail with a circle on top. A continuous line through
                  the middle of a small circle reads as a bead threaded onto a wire; a
                  gap reads as a knob riding a track. */}
              <path d="M3 6h9.6M17.4 6H21" />
              <circle cx="15" cy="6" r="2.4" />
              <path d="M3 12h3.1M10.9 12H21" />
              <circle cx="8.5" cy="12" r="2.4" />
              <path d="M3 18h10.6M18.4 18H21" />
              <circle cx="16" cy="18" r="2.4" />
            </SectionIcon>
          </Link>
          {/* An initial rather than the full name. The name was the widest thing in
              this row and the only part of it that grows with the account it belongs to,
              which is what tipped the nav over on a narrow phone. The full name is
              still available on hover and to a screen reader. */}
          <span className="nav-avatar ml-1" title={session?.sub ?? undefined}>
            <span aria-hidden>{initial}</span>
            <span className="sr-only">Signed in as {session?.sub ?? "unknown"}</span>
          </span>
          {/* Still a real form POST, so signing out works without JavaScript and can't
              be triggered by a stray GET. Only the label became a glyph. */}
          <form action="/api/auth/logout" method="POST" className="shrink-0">
            <button
              type="submit"
              className="nav-icon cursor-pointer border-0 bg-transparent"
              aria-label="Sign out"
              title="Sign out"
            >
              <SectionIcon>
                {/* A doorway with an arrow leaving through it. The frame is drawn open
                    on the side the arrow exits, so the two read as one action rather
                    than a box beside an arrow. */}
                <path d="M9.5 20.5H5.5a1.8 1.8 0 0 1-1.8-1.8V5.3a1.8 1.8 0 0 1 1.8-1.8h4" />
                <path d="M15.8 16.4 20.2 12l-4.4-4.4" />
                <path d="M20.2 12H9.6" />
              </SectionIcon>
            </button>
          </form>
        </div>
      </nav>

      {/* Listens on the document, renders nothing. */}
      <DaySwipe viewing={toDayParam(on)} />

      <main className="mx-auto max-w-3xl px-6 pb-24">
        {!isToday && <DayBar viewing={on} />}
        {usingMockData && (
          <p className="mb-6 text-sm" style={{ color: "var(--c-text-dim)" }}>
            Showing placeholder data — no accounts are connected yet.
          </p>
        )}

        {/* pointer-events off for a past day: every control on this page writes to
            "now", so a tap here would silently edit today while yesterday is displayed.
            A wrapper is blunt but it cannot be bypassed, where a readOnly prop threaded
            through eight components can be forgotten in one of them. Scrolling and the
            day navigation above are unaffected. */}
        <div
          style={isToday ? undefined : { pointerEvents: "none" }}
          aria-disabled={isToday ? undefined : true}
        >
        <PlanToast
          week={spiritual.week}
          topic={spiritual.topic}
          reminders={reminders}
        />

        {/* Pulled up 20px. The dial's SVG carries ~40 units of transparent margin
            inside its own box — the ring is 300 wide in a 380 box, room the blurred
            outer edge needs — so the gap to the nav reads far larger than the markup
            suggests. Negative margin here rather than less padding on <main>, which
            would move every section up, not just the dial. */}
        <div className="-mt-5">
          <LifeScoreModal
            pct={weekScore}
            weeks={lifeHistory.weeks}
            dialSecondLine={isToday ? undefined : "That Day"}
          />
        </div>

        {/* ── Summary ──
            Every section's headline number in one row, so the whole day reads at a
            glance without scrolling. Each is repeated in its own section below.
            Two-up on phones — four 25%-wide boxes would squeeze the ring and wrap
            the captions. */}
        <section className="mb-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Staggered left to right, starting after the dial's sweep has begun so
                the eye follows the page down rather than everything moving at once. */}
            {/* glowWhenIncomplete={isToday}: the glow means "this still needs you". On a
                past day nothing does — it is a record, not a to-do list — and for the
                live-only boxes a dash means "unknowable", not "unfinished". */}
            <ScoreBox dense glowWhenIncomplete={isToday} delay={0.5} pct={family.completedPct} caption={labels["summary.family"]} href="#family" />
            <ScoreBox dense glowWhenIncomplete={isToday} delay={0.58} pct={spiritual.completedPct} caption={labels["summary.spiritual"]} href="#spiritual" />
            <ScoreBox dense glowWhenIncomplete={isToday} delay={0.66} pct={wellness.completedPct} caption={labels["summary.wellness"]} href="#wellness" />
            <ScoreBox dense glowWhenIncomplete={isToday} delay={0.74} pct={dietPct} caption={labels["summary.diet"]} href="#diet" />
            <ScoreBox dense glowWhenIncomplete={isToday} delay={0.82} pct={liveOnly ? null : mailCleanPct(data.mail)} caption={labels["summary.email"]} href="#email" />
            <ScoreBox dense glowWhenIncomplete={isToday} delay={0.9} pct={liveOnly ? null : reminders.completedPct} caption={labels["summary.reminders"]} href="#reminders" />
          </div>
        </section>









        {/* ── Requests ── */}
        <section id="requests" data-section className="mb-12">
          <SectionTag icon={<ServiceBellIcon />}>{labels["section.requests"]}</SectionTag>
          <div className="space-y-2 rounded-2xl p-5" style={panel}>
            {liveOnly ? (
              notRecorded
            ) : data.requests.length === 0 ? (
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
          <SectionTag icon={<PeopleIcon />}>{labels["section.family"]}</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox pct={family.completedPct} caption={labels["panel.family"]} />
            <div className="rounded-2xl p-5" style={panel}>
              <FamilyChecklist initial={family} datePlaceholder={labels["family.date.placeholder"]} />
            </div>
          </div>
        </section>
        {/* ── Spiritual ── */}
        <section id="spiritual" data-section className="mb-12">
          <SectionTag icon={<BookIcon />}>{labels["section.spiritual"]}</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox pct={spiritual.completedPct} caption={labels["panel.spiritual"]} />
            <div className="rounded-2xl p-5" style={panel}>
              <SpiritualChecklist initial={spiritual} />
            </div>
          </div>
        </section>
        {/* ── Wellness ── */}
        <section id="wellness" data-section className="mb-12">
          <SectionTag icon={<BarbellIcon />}>{labels["section.wellness"]}</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox pct={wellness.completedPct} caption={labels["panel.wellness"]} />
            <div className="rounded-2xl p-5" style={panel}>
              <WellnessChecklist initial={wellness} goalLabel={labels["wellness.goalLabel"]} />
            </div>
          </div>
        </section>
        {/* ── Diet ── */}
        <section id="diet" data-section className="mb-12">
          <SectionTag icon={<HamburgerIcon />}>{labels["section.diet"]}</SectionTag>
          <div className="rounded-2xl p-5" style={panel}>
            <DietPanel initial={diet} title={labels["diet.title"]} />
          </div>
        </section>
        {/* ── Inbox ── */}
        <section id="email" data-section className="mb-12">
          <SectionTag icon={<EnvelopeIcon />}>{labels["section.email"]}</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox
              pct={liveOnly ? null : mailCleanPct(data.mail)}
              caption={labels["panel.email"]}
            />
            <div className="grid grid-cols-2 gap-3">
              <StatCard value={liveOnly ? null : data.mail.unread} label={labels["mail.unread"]} href={liveOnly ? null : data.mail.links.unreadInbox} />
              <StatCard value={liveOnly ? null : data.mail.inboxTotal} label={labels["mail.inbox"]} />
              <StatCard value={liveOnly ? null : data.mail.workUnread} label={labels["mail.work"]} href={liveOnly ? null : data.mail.links.unreadWork} />
              <StatCard value={liveOnly ? null : data.mail.trashed} label={labels["mail.trash"]} href={liveOnly ? null : data.mail.links.trash} />
            </div>
          </div>
        </section>
        {/* ── Slack ── */}
        <section id="slack" data-section className="mb-12">
          <SectionTag>{labels["section.slack"]}</SectionTag>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard value={liveOnly ? null : data.slack.unread} label={labels["slack.unread"]} />
            <StatCard value={liveOnly ? null : data.slack.received} label={labels["slack.received"]} />
            <StatCard value={liveOnly ? null : data.slack.awaiting} label={labels["slack.awaiting"]} />
          </div>
        </section>
        {/* ── Reminders ── */}
        <section id="reminders" data-section className="mb-12">
          <SectionTag icon={<BellRingIcon />}>{labels["section.reminders"]}</SectionTag>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <ScoreBox pct={reminders.completedPct} caption={labels["panel.reminders"]} />
            <div className="rounded-2xl p-5" style={panel}>
              {isToday ? (
                <RemindersPanel initial={reminders} />
              ) : (
                /* Reminders are the one section with no history: they carry a done flag
                   and no date, so there is nothing to replay. Saying so is the honest
                   option — rendering the current list under a past date would present
                   today's state as that day's. */
                <p className="text-[12px]" style={{ color: "var(--c-text-dim)" }}>
                  Not recorded per day — reminders have no history to show.
                </p>
              )}
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
        </div>
      </main>
    </div>
  );
}
