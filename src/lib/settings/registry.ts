// Every renameable piece of text on the dashboard, in one place.
//
// Client-safe: no filesystem imports, so the settings form can import it directly.
//
// The registry is the contract between three things — the defaults the app ships
// with, the editor that lists what can be changed, and the lookup the dashboard uses
// at render time. Keeping them in one table means a new label can't appear in the
// editor without a default, or be given a default that nothing ever reads.
//
// Keys are dotted and stable. They're what lands in the saved JSON, so renaming one
// silently discards whatever the user had typed against the old name.

/** Longest label accepted. Bounds the stored file and keeps the layout intact. */
export const LABEL_MAX_LENGTH = 64;

export const LABEL_DEFAULTS = {
  // ── Section headings ────────────────────────────────────────────────────────
  "section.requests": "Asking you for something",
  "section.family": "Family",
  "section.spiritual": "Spiritual",
  "section.wellness": "Wellness",
  "section.diet": "Diet",
  "section.email": "Email",
  "section.slack": "Slack",
  "section.reminders": "Reminders & Promptings",

  // ── The summary row at the top ──────────────────────────────────────────────
  "summary.family": "Family",
  "summary.spiritual": "Spiritual",
  "summary.wellness": "Wellness",
  "summary.diet": "Diet",
  "summary.email": "Email",
  "summary.reminders": "Reminders",

  // ── Score captions inside each section ──────────────────────────────────────
  "panel.family": "Family",
  "panel.spiritual": "Spirituality",
  "panel.wellness": "This week",
  "panel.email": "Clean & Up To Date",
  "panel.reminders": "Reminders & Promptings",


  // ── Wellness ────────────────────────────────────────────────────────────────
  "wellness.mon.label": "Monday",
  "wellness.mon.kind": "lift",
  "wellness.tue.label": "Tuesday",
  "wellness.tue.kind": "cardio",
  "wellness.wed.label": "Wednesday",
  "wellness.wed.kind": "lift",
  "wellness.thu.label": "Thursday",
  "wellness.thu.kind": "cardio",
  "wellness.fri.label": "Friday",
  "wellness.fri.kind": "lift",
  "wellness.sat.label": "Saturday",
  "wellness.sat.kind": "bike",
  "wellness.goalLabel": "Goal",

  // ── Spiritual ───────────────────────────────────────────────────────────────
  "spiritual.bom": "Book of Mormon",
  "spiritual.personal": "Personal Study",
  "spiritual.family": "Family Book of Mormon",
  "spiritual.prayer": "Prayer",

  // ── Family ──────────────────────────────────────────────────────────────────
  "family.date": "Daddy-Daughter Date",
  "family.date.placeholder": "What's the big idea?",
  "family.kristenSpace": "Kristen: Give Space",
  "family.kristenValidate": "Kristen: Validate",
  "family.leadership": "Leadership",
  "family.leadership.subtext": "Plan & Execute a lesson and an activity",

  // ── Diet ────────────────────────────────────────────────────────────────────
  "diet.title": "Satisfaction Level",

  // ── Mail and Slack counters ─────────────────────────────────────────────────
  "mail.unread": "Unread",
  "mail.inbox": "In inbox",
  "mail.work": "Unread Work",
  "mail.trash": "In trash",
  "slack.unread": "Unread",
  "slack.received": "Received",
  "slack.awaiting": "Awaiting reply",
} as const;

export type LabelKey = keyof typeof LABEL_DEFAULTS;

/** Every label, with any saved overrides applied. */
export type Labels = Record<LabelKey, string>;

/**
 * How the editor groups the fields.
 *
 * Ordered to match the dashboard top to bottom, so finding a label means looking
 * where it appears on the page rather than hunting an alphabetical list.
 */
export const LABEL_GROUPS: {
  id: string;
  title: string;
  hint?: string;
  keys: LabelKey[];
}[] = [
  {
    id: "summary",
    title: "Summary row",
    hint: "Captions under the six boxes at the top.",
    keys: [
      "summary.family",
      "summary.spiritual",
      "summary.wellness",
      "summary.diet",
      "summary.email",
      "summary.reminders",
    ],
  },
  {
    id: "sections",
    title: "Section headings",
    hint: "The small uppercase heading above each section.",
    keys: [
      "section.requests",
      "section.family",
      "section.spiritual",
      "section.wellness",
      "section.diet",
      "section.email",
      "section.slack",
      "section.reminders",
    ],
  },
  {
    id: "panels",
    title: "Section score captions",
    hint: "The caption under each section's own percentage.",
    keys: [
      "panel.family",
      "panel.spiritual",
      "panel.wellness",
      "panel.email",
      "panel.reminders",
    ],
  },
  {
    id: "family",
    title: "Family rows",
    keys: [
      "family.date",
      "family.date.placeholder",
      "family.kristenSpace",
      "family.kristenValidate",
      "family.leadership",
      "family.leadership.subtext",
    ],
  },
  {
    id: "spiritual",
    title: "Spiritual rows",
    keys: [
      "spiritual.bom",
      "spiritual.personal",
      "spiritual.family",
      "spiritual.prayer",
    ],
  },
  {
    id: "wellness",
    title: "Wellness days",
    hint: "The day name and the activity shown beneath it.",
    keys: [
      "wellness.mon.label",
      "wellness.mon.kind",
      "wellness.tue.label",
      "wellness.tue.kind",
      "wellness.wed.label",
      "wellness.wed.kind",
      "wellness.thu.label",
      "wellness.thu.kind",
      "wellness.fri.label",
      "wellness.fri.kind",
      "wellness.sat.label",
      "wellness.sat.kind",
      "wellness.goalLabel",
    ],
  },
  {
    id: "diet",
    title: "Diet",
    keys: ["diet.title"],
  },
  {
    id: "counters",
    title: "Mail & Slack counters",
    keys: [
      "mail.unread",
      "mail.inbox",
      "mail.work",
      "mail.trash",
      "slack.unread",
      "slack.received",
      "slack.awaiting",
    ],
  },
];

/**
 * Field-level display names for the editor.
 *
 * Only where the key alone would be cryptic. Anything absent falls back to the
 * shipped default, which is usually the clearest description of the field there is.
 */
export const FIELD_NAMES: Partial<Record<LabelKey, string>> = {
  "family.date.placeholder": "Date note placeholder",
  "family.leadership.subtext": "Leadership subtext",
  "wellness.mon.kind": "Monday activity",
  "wellness.tue.kind": "Tuesday activity",
  "wellness.wed.kind": "Wednesday activity",
  "wellness.thu.kind": "Thursday activity",
  "wellness.fri.kind": "Friday activity",
  "wellness.sat.kind": "Saturday activity",
  "wellness.goalLabel": "Goal field label",
};

export function isLabelKey(value: unknown): value is LabelKey {
  return typeof value === "string" && value in LABEL_DEFAULTS;
}

/** Defaults with overrides applied. Unknown or blank overrides are ignored. */
export function mergeLabels(overrides: Record<string, string> | undefined): Labels {
  const merged = { ...LABEL_DEFAULTS } as Labels;
  if (!overrides) return merged;
  for (const [key, value] of Object.entries(overrides)) {
    // A blank override means "use the default", which is how the editor clears a
    // field — storing "" would render an empty heading instead.
    if (isLabelKey(key) && value.trim()) {
      merged[key] = value.trim().slice(0, LABEL_MAX_LENGTH);
    }
  }
  return merged;
}
