import { ImapFlow } from "imapflow";
import type { MailSummary } from "./types";

// Gmail over IMAP with an app password. Chosen over the Gmail API on purpose:
// Gmail's read scopes are "restricted", so an unverified personal OAuth app has
// refresh tokens that expire every 7 days. IMAP needs no re-auth.

export type GmailConfig = {
  user: string;
  appPassword: string;
  host: string;
  port: number;
  /** Folder/label counted as work mail. */
  workFolder: string;
  /** Position of this account among those signed into the browser (u/N). */
  accountIndex: number;
};

/** Reads Gmail credentials from the environment, or null if not configured. */
export function gmailConfigFromEnv(): GmailConfig | null {
  const user = process.env.IMAP_USER;
  const appPassword = process.env.IMAP_APP_PASSWORD;
  if (!user || !appPassword) return null;
  return {
    user,
    appPassword,
    host: process.env.IMAP_HOST ?? "imap.gmail.com",
    port: Number(process.env.IMAP_PORT ?? 993),
    workFolder: process.env.IMAP_WORK_FOLDER ?? "REDX",
    // Not derivable from the account itself — it depends on the browser opening
    // the link, so it has to be configured.
    accountIndex: Number(process.env.GMAIL_ACCOUNT_INDEX ?? 0),
  };
}

/**
 * A Gmail web URL for a search query.
 *
 * The `u/N` segment must be a NUMERIC account index — the position of the account
 * among those signed into the browser. Putting an email address there instead
 * returns Gmail's "Temporary Error (404)" page; it looks like a plausible way to
 * disambiguate accounts, and it is not.
 *
 * 0 is the first signed-in account. If that opens the wrong mailbox, set
 * GMAIL_ACCOUNT_INDEX to the right position.
 */
export function gmailSearchUrl(accountIndex: number, query: string): string {
  return `https://mail.google.com/mail/u/${accountIndex}/#search/${encodeURIComponent(query)}`;
}

/** Quotes a label for use in a Gmail search, which needs quotes around spaces. */
export function gmailLabelQuery(folder: string): string {
  // Gmail search uses `-` for nested labels where IMAP uses `/`.
  const label = folder.replace(/\//g, "-");
  return /\s/.test(label) ? `label:"${label}"` : `label:${label}`;
}

function client(config: GmailConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.appPassword },
    // imapflow logs the full IMAP dialogue at info level by default, which is
    // noisy and includes mailbox names. Keep only genuine errors.
    logger: false,
  });
}

/**
 * Gmail exposes its special folders under a localised `[Gmail]/…` prefix, so
 * matching on the literal English name breaks for non-English accounts. Find
 * them by their SPECIAL-USE flag instead.
 */
async function findSpecialMailboxes(connection: ImapFlow) {
  const boxes = await connection.list();
  const byFlag = (flag: string) =>
    boxes.find((box) => box.specialUse === flag)?.path;
  return {
    all: byFlag("\\All"),
    trash: byFlag("\\Trash"),
  };
}

async function statusOf(
  connection: ImapFlow,
  path: string | undefined,
  query: { messages?: boolean; unseen?: boolean },
): Promise<{ messages?: number; unseen?: number } | null> {
  if (!path) return null;
  try {
    return await connection.status(path, query);
  } catch {
    // A missing or inaccessible mailbox shouldn't fail the whole dashboard.
    return null;
  }
}

/**
 * Runs `work` against a live connection and always tears it down.
 *
 * Connecting to Gmail costs ~1.3s, so callers that need both counts and messages
 * should share one connection rather than opening two.
 */
async function withConnection<T>(
  config: GmailConfig,
  work: (connection: ImapFlow) => Promise<T>,
): Promise<T> {
  const connection = client(config);
  await connection.connect();
  try {
    return await work(connection);
  } finally {
    // logout() ends the IMAP session and closes the socket. Without it the
    // connection leaks and Gmail starts refusing new ones.
    await connection.logout().catch(() => connection.close());
  }
}

async function readMailSummary(
  connection: ImapFlow,
  workFolder: string,
  accountIndex: number,
): Promise<MailSummary> {
  const inbox = await connection.status("INBOX", {
    messages: true,
    unseen: true,
  });
  const boxes = await connection.list();
  const trashPath = boxes.find((box) => box.specialUse === "\\Trash")?.path;

  // Match the configured name case-insensitively: Gmail reports the label's exact
  // casing, and a mismatched env value would otherwise silently read as "missing".
  const workPath = boxes.find(
    (box) => box.path.toLowerCase() === workFolder.toLowerCase(),
  )?.path;

  // One STATUS call for both work numbers rather than two.
  const work = workPath
    ? await statusOf(connection, workPath, { messages: true, unseen: true })
    : null;

  return {
    unread: inbox.unseen ?? 0,
    inboxTotal: inbox.messages ?? 0,
    workUnread: work?.unseen ?? null,
    workTotal: work?.messages ?? null,
    trashed:
      (await statusOf(connection, trashPath, { messages: true }))?.messages ?? 0,
    awaiting: null, // not knowable over IMAP — see MailSummary
    links: {
      unreadInbox: gmailSearchUrl(accountIndex, "is:unread in:inbox"),
      // Only link the work card when the label actually exists — a search for a
      // missing label silently returns nothing, which looks like a broken link.
      unreadWork: workPath
        ? gmailSearchUrl(accountIndex, `is:unread ${gmailLabelQuery(workPath)}`)
        : null,
      trash: gmailSearchUrl(accountIndex, "in:trash"),
    },
  };
}

/** A single inbox message, reduced to what the request classifier needs. */
export type InboxMessage = {
  uid: number;
  from: string;
  fromAddress: string;
  subject: string;
  receivedAt: string;
  /** RFC822 Message-ID, used to build a Gmail deep link. */
  messageId: string | undefined;
  /** Leading plain text of the body, truncated. */
  snippet: string;
  /** True when the message looks like a mailing list or automated notification. */
  isBulk: boolean;
};

/** How much body text to keep. Enough to find an ask, small enough to stay cheap. */
const SNIPPET_LIMIT = 1200;

function decodeBodyPart(part: unknown): string {
  if (!part) return "";
  const buffer = part as Buffer;
  if (typeof buffer?.toString !== "function") return "";
  return buffer
    .toString("utf8")
    .replace(/<[^>]+>/g, " ") // crude tag strip for HTML-only mail
    .replace(/&nbsp;?/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SNIPPET_LIMIT);
}

/**
 * Reads the most recent `limit` messages from the inbox.
 *
 * Fetches newest-first by sequence number rather than pulling the whole mailbox —
 * an inbox of 236 is fine either way, but 15k in All Mail would not be.
 */
async function readRecentInbox(
  connection: ImapFlow,
  limit: number,
): Promise<InboxMessage[]> {
  {
    const lock = await connection.getMailboxLock("INBOX");
    try {
      const total =
        typeof connection.mailbox === "object" ? connection.mailbox.exists : 0;
      if (!total) return [];

      const start = Math.max(1, total - limit + 1);
      const messages: InboxMessage[] = [];

      for await (const message of connection.fetch(`${start}:${total}`, {
        envelope: true,
        headers: ["list-unsubscribe", "precedence", "auto-submitted"],
        // Part "1", not "text": BODY[TEXT] makes Gmail assemble the entire body
        // including HTML alternatives and inline attachments — measured at 15.5MB
        // and 20s for 17 messages. Part 1 is the first MIME part, normally the
        // text/plain alternative: 49KB and 0.5s for the same messages.
        bodyParts: ["1"],
      })) {
        const envelope = message.envelope;
        const sender = envelope?.from?.[0];
        const headers = decodeBodyPart(message.headers).toLowerCase();
        const fromAddress = sender?.address ?? "";

        messages.push({
          uid: message.uid,
          from: sender?.name?.trim() || fromAddress || "Unknown sender",
          fromAddress,
          subject: envelope?.subject ?? "(no subject)",
          receivedAt: (envelope?.date ?? new Date(0)).toISOString(),
          messageId: envelope?.messageId,
          snippet: decodeBodyPart(message.bodyParts?.get("1")),
          isBulk:
            headers.includes("list-unsubscribe") ||
            headers.includes("precedence: bulk") ||
            headers.includes("auto-submitted") ||
            /no-?reply|do-?not-?reply|notifications?@|automated@/i.test(fromAddress),
        });
      }

      // Newest first.
      return messages.reverse();
    } finally {
      lock.release();
    }
  }
}

/**
 * Everything the dashboard needs from Gmail, over a single connection.
 *
 * Deliberately one call rather than two exported functions: connecting costs
 * ~1.3s, so reading counts and messages separately doubled the page's cold load.
 */
export async function fetchGmailDashboard(
  config: GmailConfig,
  messageLimit = 60,
): Promise<{ summary: MailSummary; messages: InboxMessage[] }> {
  return withConnection(config, async (connection) => {
    const summary = await readMailSummary(connection, config.workFolder, config.accountIndex);
    const messages = await readRecentInbox(connection, messageLimit);
    return { summary, messages };
  });
}

/**
 * Moves a message to Trash by UID.
 *
 * Deliberately a move, not an expunge: Gmail keeps it recoverable for 30 days,
 * which is the right default for something a dashboard button can trigger.
 */
export async function trashMessage(
  config: GmailConfig,
  uid: number,
): Promise<void> {
  await withConnection(config, async (connection) => {
    const lock = await connection.getMailboxLock("INBOX");
    try {
      const special = await findSpecialMailboxes(connection);
      if (!special.trash) throw new Error("Could not locate the Trash mailbox");
      await connection.messageMove(String(uid), special.trash, { uid: true });
    } finally {
      lock.release();
    }
  });
}
