// ── Dashboard data contracts ──────────────────────────────────────────────────
// The dashboard renders against these shapes only. Swapping the mock provider
// for real Gmail (IMAP) and Slack (Web API) means implementing DashboardSource
// and nothing else — no component touches a provider directly.

/** A counted bucket rendered as a StatCard. */
export type Stat = {
  value: number;
  label: string;
  /** Renders a chevron and makes the card a link target. */
  actionable?: boolean;
};

export type MailSummary = {
  /** Unread messages in the inbox. */
  unread: number;
  /** Total messages sitting in the inbox. */
  inboxTotal: number;
  /**
   * Unread messages in the work folder (the `REDX` label by default, configurable
   * via IMAP_WORK_FOLDER).
   *
   * `null` when that folder can't be found on the account — showing 0 would be
   * indistinguishable from "the folder is empty", and those need different fixes.
   */
  workUnread: number | null;

  /** Total messages in the work folder. Needed to weight the clean percentage. */
  workTotal: number | null;

  /**
   * Deep links into the mail client for each count, so a card can be tapped to
   * go straight to those messages. `null` where there's nowhere meaningful to go
   * (no account configured, or the work label wasn't found).
   */
  links: {
    unreadInbox: string | null;
    unreadWork: string | null;
    trash: string | null;
  };
  /** Messages currently in Trash. */
  trashed: number;
  /**
   * Messages needing a reply from you.
   *
   * `null` when unknown — IMAP has no notion of "someone is waiting on me", so
   * this stays null until the request-classification pass is wired up. The UI
   * renders null as a dash rather than inventing a zero.
   */
  awaiting: number | null;
};

export type SlackSummary = {
  /** Unread DMs + mentions across the workspace. */
  unread: number;
  /** Messages received (this period). */
  received: number;
  /** Threads flagged as needing a reply from you. */
  awaiting: number;
};

/**
 * A message that asks Jason for something — a design, feedback, advice, an
 * opinion. Produced by classifying inbound mail/Slack, not by a keyword match.
 */
export type ActionRequest = {
  id: string;
  /** Where it came from. */
  source: "email" | "slack";
  /** Display name of the person who asked. */
  from: string;
  /** One-line summary of what they want. Model-generated. */
  summary: string;
  /** What kind of ask this is, for grouping and filtering. */
  kind: "design" | "feedback" | "advice" | "opinion" | "other";
  /** Deep link straight to the source message. */
  href: string;
  receivedAt: string;
  /** Set when a human has actioned or dismissed it. */
  resolved?: boolean;
};

/** Scheduled days. The plan runs Monday–Saturday; Sunday is the rest day. */
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

/** What kind of session a given day calls for. */
export type WorkoutKind = "lift" | "cardio" | "bike";

export type WellnessDay = {
  day: DayKey;
  /** Full day name, used as the row header. */
  label: string;
  /**
   * The activity shown under the day name. Free text rather than WorkoutKind: it's
   * renameable in settings, so "lift" is a default, not a closed set.
   */
  kind: string;
  done: boolean;
  /** True for the row matching today, so the UI can highlight it. */
  isToday: boolean;
  /**
   * Whether this day counts toward the percentage — true from Monday through today,
   * false for days still ahead this week. The server decides so that the client's
   * optimistic recount lands on the same number.
   */
  counted: boolean;
  /**
   * Standing goal for this weekday. Persists until changed rather than clearing with
   * the weekly checkbox, so Monday's goal is still there next Monday.
   */
  goal: string;
};

export type Wellness = {
  /** ISO week the checklist currently covers, e.g. "2026-W31". */
  week: string;
  days: WellnessDay[];
  /** Completed days ÷ days elapsed so far this week, as a percentage. */
  completedPct: number;
};

/**
 * What the dashboard pulls from external accounts.
 *
 * Wellness is deliberately absent: it's local state owned by `lib/wellness`, not
 * something fetched from a third party, so the page loads it separately.
 */
export type DashboardData = {
  mail: MailSummary;
  slack: SlackSummary;
  requests: ActionRequest[];
  /** Per-integration health, so the UI can show "not connected" honestly. */
  connections: ConnectionStatus[];
};

export type ConnectionStatus = {
  id: "gmail" | "slack" | "anthropic";
  label: string;
  state: "connected" | "not_configured" | "error" | "blocked";
  /** Shown under the label when state isn't `connected`. */
  detail?: string;
};

/**
 * Implemented once per backend. The mock provider satisfies this today; the
 * Gmail and Slack providers will satisfy it without any UI change.
 */
export interface DashboardSource {
  readonly name: string;
  load(): Promise<DashboardData>;
}
