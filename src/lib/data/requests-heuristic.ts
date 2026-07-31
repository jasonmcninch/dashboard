import { gmailSearchUrl, type InboxMessage } from "./gmail";
import type { ActionRequest } from "./types";

// Zero-cost stand-in for model classification: decide whether a message is
// someone asking Jason for something, using sender heuristics and asking
// language. It cannot read intent, so it errs toward precision — a missed ask is
// annoying, but a feed full of newsletters is worse and gets ignored entirely.

/** Phrases that signal a direct ask. Ordered roughly strongest-first. */
const ASK_PATTERNS: { pattern: RegExp; kind: ActionRequest["kind"] }[] = [
  // Design work
  { pattern: /\b(can|could|would) you (please )?(design|mock ?up|wireframe|lay ?out)\b/i, kind: "design" },
  { pattern: /\b(need|want|looking for) (your |some )?(help with (the )?)?(design|mock ?up|wireframe|logo|branding)\b/i, kind: "design" },
  { pattern: /\bdesign (this|that|the|a|an|it)\b/i, kind: "design" },

  // Feedback / review
  { pattern: /\b(feedback|thoughts|eyes) on\b/i, kind: "feedback" },
  { pattern: /\b(can|could|would) you (please )?(review|look (over|at)|take a look)\b/i, kind: "feedback" },
  { pattern: /\b(need|want) your (feedback|review|input|eyes)\b/i, kind: "feedback" },
  { pattern: /\breview (this|that|the|my|attached)\b/i, kind: "feedback" },

  // Advice
  { pattern: /\b(any )?advice on\b/i, kind: "advice" },
  { pattern: /\bhow (should|would) (i|we|you)\b/i, kind: "advice" },
  { pattern: /\b(what|which) (do|would) you (recommend|suggest)\b/i, kind: "advice" },
  { pattern: /\b(can|could) you (help|advise|walk me through)\b/i, kind: "advice" },

  // Opinion
  { pattern: /\byour (opinion|take|read) on\b/i, kind: "opinion" },
  { pattern: /\bwhat do you think\b/i, kind: "opinion" },
  { pattern: /\b(which|what) (one )?(do you )?prefer\b/i, kind: "opinion" },

  // Generic asks — weaker, so classified as "other"
  { pattern: /\b(can|could|would) you (please )?\w+/i, kind: "other" },
  { pattern: /\bare you able to\b/i, kind: "other" },
  { pattern: /\bdo you have (time|a (minute|moment|sec))\b/i, kind: "other" },
  { pattern: /\bwould you mind\b/i, kind: "other" },
  { pattern: /\b(any chance|wondering if) you\b/i, kind: "other" },
  { pattern: /\bwould love your\b/i, kind: "other" },
  { pattern: /\b(let me know|circling back|following up) (if|on|about)\b/i, kind: "other" },
  { pattern: /\b(please|pls) (send|share|confirm|advise|review|sign)\b/i, kind: "other" },
];

/**
 * Subject-line markers of automated mail that slips past header checks —
 * receipts, alerts, and the like. Matching any of these disqualifies a message.
 */
const NOISE_SUBJECT = /\b(unsubscribe|receipt|invoice|order #|verify your|confirm your (email|subscription)|password reset|security alert|your (statement|invoice)|newsletter|digest|webinar|sale ends|% off|black friday)\b/i;

/** Strips Re:/Fwd: chains so the summary reads cleanly. */
function cleanSubject(subject: string): string {
  return subject.replace(/^((re|fwd|fw)\s*:\s*)+/i, "").trim();
}

/**
 * Pulls the sentence containing the ask, so the card shows what they want rather
 * than just the subject line. Falls back to the subject when nothing usable is
 * found (very short bodies, HTML-only mail that stripped badly).
 */
function extractAskSentence(text: string, pattern: RegExp): string | null {
  const match = pattern.exec(text);
  if (!match) return null;

  // Widen from the match out to sentence boundaries.
  const start = text.lastIndexOf(".", match.index) + 1;
  const endPeriod = text.indexOf(".", match.index + match[0].length);
  const endQuestion = text.indexOf("?", match.index + match[0].length);
  const candidates = [endPeriod, endQuestion].filter((i) => i !== -1);
  const end = candidates.length ? Math.min(...candidates) + 1 : text.length;

  const sentence = text.slice(start, end).trim();
  if (sentence.length < 12 || sentence.length > 200) return null;
  return sentence;
}

export type ClassifiedRequest = ActionRequest & { uid: number };

/**
 * Builds a Gmail deep link to one message. Uses an `rfc822msgid:` search rather
 * than a thread id — the RFC822 Message-ID is the only identifier IMAP gives us
 * that Gmail's web UI can also resolve.
 */
function gmailLink(
  accountIndex: number,
  messageId: string | undefined,
  subject: string,
): string {
  if (messageId) {
    const bare = messageId.replace(/^<|>$/g, "");
    return gmailSearchUrl(accountIndex, `rfc822msgid:${bare}`);
  }
  // No Message-ID (rare, but legal) — fall back to a subject search.
  return gmailSearchUrl(accountIndex, `subject:"${subject}"`);
}

export function classifyRequests(
  messages: InboxMessage[],
  accountIndex: number,
  limit = 8,
): ClassifiedRequest[] {
  const found: ClassifiedRequest[] = [];

  for (const message of messages) {
    if (message.isBulk) continue;
    if (NOISE_SUBJECT.test(message.subject)) continue;

    const haystack = `${message.subject}. ${message.snippet}`;

    const hit = ASK_PATTERNS.find((entry) => entry.pattern.test(haystack));
    if (!hit) continue;

    const subject = cleanSubject(message.subject);
    const sentence = extractAskSentence(haystack, hit.pattern);

    found.push({
      id: `gmail-${message.uid}`,
      uid: message.uid,
      source: "email",
      from: message.from,
      summary: sentence ?? subject ?? "(no subject)",
      kind: hit.kind,
      href: gmailLink(accountIndex, message.messageId, message.subject),
      receivedAt: message.receivedAt,
    });

    if (found.length >= limit) break;
  }

  return found;
}
