import { gmailConfigFromEnv } from "./gmail";
import { LiveSource } from "./live";
import { MockSource } from "./mock";
import type { DashboardSource, MailSummary } from "./types";

export * from "./types";

/**
 * How clean and up to date mail is: the share of tracked messages that have been
 * read, across the inbox *and* the work folder together. 100% means nothing
 * unread in either.
 *
 * Both mailboxes are pooled rather than averaged, so the score reflects how much
 * mail is actually outstanding — 1 unread out of 200 shouldn't weigh the same as
 * 1 unread out of 2. A work folder that can't be found is left out entirely
 * rather than counted as clean.
 *
 * No messages at all counts as 100% rather than 0 — there is nothing outstanding,
 * so "0% clean" would be exactly backwards.
 */
export function mailCleanPct(mail: MailSummary): number {
  const total = mail.inboxTotal + (mail.workTotal ?? 0);
  if (total <= 0) return 100;

  const unread = mail.unread + (mail.workUnread ?? 0);
  const read = total - unread;
  // Clamp: unread can briefly exceed the total because the IMAP STATUS fields
  // aren't sampled atomically.
  return Math.max(0, Math.min(100, Math.round((read / total) * 100)));
}

/**
 * Picks the dashboard backend.
 *
 * Live as soon as any real integration is configured; mock otherwise, so a
 * fresh clone with no credentials still renders something rather than erroring.
 */
export function getDashboardSource(): DashboardSource {
  const anyIntegrationConfigured =
    gmailConfigFromEnv() !== null || Boolean(process.env.SLACK_USER_TOKEN);

  return anyIntegrationConfigured ? new LiveSource() : new MockSource();
}
