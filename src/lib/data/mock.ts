import type { DashboardData, DashboardSource } from "./types";

// Numbers carried over from the landing-page mock so the dashboard looks
// like the design while the real integrations are still being wired up.
const MOCK: DashboardData = {
  mail: {
    unread: 16,
    inboxTotal: 1250,
    workUnread: 3,
    workTotal: 42,
    trashed: 854,
    awaiting: 16,
    // No links in mock mode: there's no real account to open.
    links: { unreadInbox: null, unreadWork: null, trash: null },
  },
  slack: { unread: 16, received: 45, awaiting: 16 },
  requests: [
    {
      id: "mock-1",
      source: "slack",
      from: "John Stamos",
      summary: "Can you build the onboarding flow?",
      kind: "design",
      href: "#",
      receivedAt: "2026-07-31T14:02:00.000Z",
    },
    {
      id: "mock-2",
      source: "email",
      from: "Sarah K.",
      summary: "Needs the dashboard redesigned before the Q3 review.",
      kind: "design",
      href: "#",
      receivedAt: "2026-07-31T11:20:00.000Z",
    },
    {
      id: "mock-3",
      source: "slack",
      from: "Mike R.",
      summary: "Following up on his earlier note — wants your read on the pricing page.",
      kind: "opinion",
      href: "#",
      receivedAt: "2026-07-30T22:47:00.000Z",
    },
  ],
  connections: [
    {
      id: "gmail",
      label: "Gmail",
      state: "not_configured",
      detail: "Add IMAP_USER and IMAP_APP_PASSWORD to connect",
    },
    {
      id: "slack",
      label: "Slack",
      state: "blocked",
      detail: "Awaiting RedX workspace admin approval",
    },
    {
      id: "anthropic",
      label: "Request summaries",
      state: "not_configured",
      detail: "Add ANTHROPIC_API_KEY to enable",
    },
  ],
};

export class MockSource implements DashboardSource {
  readonly name = "mock";

  async load(): Promise<DashboardData> {
    return MOCK;
  }
}
