import { fetchGmailDashboard, gmailConfigFromEnv } from "./gmail";
import { classifyRequests } from "./requests-heuristic";
import type {
  ActionRequest,
  ConnectionStatus,
  DashboardData,
  DashboardSource,
  MailSummary,
} from "./types";

// Gmail counts are cached briefly: the dashboard is a server component, so
// without this every page load — and every refresh — opens a fresh IMAP
// connection, and Gmail starts refusing them.
const CACHE_TTL_MS = 60_000;

type CacheEntry<T> = { at: number; value: T };
let mailCache: CacheEntry<MailSummary> | null = null;
let requestCache: CacheEntry<ActionRequest[]> | null = null;

const fresh = (entry: CacheEntry<unknown> | null) =>
  entry !== null && Date.now() - entry.at < CACHE_TTL_MS;

const EMPTY_MAIL: MailSummary = {
  unread: 0,
  inboxTotal: 0,
  workUnread: null,
  workTotal: null,
  trashed: 0,
  awaiting: null,
  links: { unreadInbox: null, unreadWork: null, trash: null },
};

export class LiveSource implements DashboardSource {
  readonly name = "live";

  async load(): Promise<DashboardData> {
    const connections: ConnectionStatus[] = [];
    const gmail = gmailConfigFromEnv();

    let mail = EMPTY_MAIL;
    let requests: ActionRequest[] = [];

    if (!gmail) {
      connections.push({
        id: "gmail",
        label: "Gmail",
        state: "not_configured",
        detail: "Set IMAP_USER and IMAP_APP_PASSWORD to connect",
      });
    } else if (fresh(mailCache) && fresh(requestCache)) {
      mail = mailCache!.value;
      requests = requestCache!.value;
      connections.push({
        id: "gmail",
        label: "Gmail",
        state: "connected",
        detail: `${gmail.user} · cached`,
      });
    } else {
      try {
        // One connection for both: connecting costs ~1.3s, and two concurrent
        // IMAP sessions on the same account also risks Gmail throttling us.
        const { summary, messages } = await fetchGmailDashboard(gmail);
        const now = Date.now();

        mail = summary;
        mailCache = { at: now, value: mail };

        requests = classifyRequests(messages, gmail.accountIndex);
        requestCache = { at: now, value: requests };

        connections.push({
          id: "gmail",
          label: "Gmail",
          state: "connected",
          // Surface a missing work folder here rather than leaving the Work card
          // showing a bare "—" with no explanation.
          detail:
            mail.workUnread === null
              ? `${gmail.user} · no "${gmail.workFolder}" label found`
              : gmail.user,
        });
      } catch (error) {
        // Serve a degraded dashboard rather than a 500. Stale numbers beat an
        // error page, so fall back to the last good read if we have one.
        const message = error instanceof Error ? error.message : String(error);
        if (mailCache) mail = mailCache.value;
        if (requestCache) requests = requestCache.value;
        connections.push({
          id: "gmail",
          label: "Gmail",
          state: "error",
          detail: message.includes("AUTHENTICATIONFAILED")
            ? "Gmail rejected the app password — regenerate it"
            : `Couldn't reach Gmail: ${message}`,
        });
      }
    }

    connections.push({
      id: "slack",
      label: "Slack",
      state: "blocked",
      detail: "Awaiting RedX workspace admin approval",
    });

    connections.push({
      id: "anthropic",
      label: "Request detection",
      state: "connected",
      detail: "Pattern matching — free, no API key. Misses indirect asks.",
    });

    return {
      mail,
      // No Slack access yet, so report zeros rather than inventing traffic.
      slack: { unread: 0, received: 0, awaiting: 0 },
      requests,
      connections,
    };
  }
}
