import { JsonStore } from "../json-store";
import {
  isLabelKey,
  LABEL_MAX_LENGTH,
  mergeLabels,
  type LabelKey,
  type Labels,
} from "./registry";

export * from "./registry";

// Persistence for the label overrides.
//
// Only DIFFERENCES from the shipped defaults are stored. That way changing a default
// in the registry reaches everyone who hadn't overridden it, instead of being masked
// by a copy of the old wording written out at first save.

type SettingsFile = {
  /** label key -> replacement text. Absent means "use the default". */
  labels: Record<string, string>;
};

const store = new JsonStore<SettingsFile>(
  "settings.json",
  () => ({ labels: {} }),
  (parsed) =>
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as SettingsFile).labels === "object",
);

/** Every label, defaults with the user's overrides applied. */
export async function getLabels(): Promise<Labels> {
  const file = await store.read();
  return mergeLabels(file.labels);
}

/** Just the overrides, for the editor to show what's been changed. */
export async function getOverrides(): Promise<Record<string, string>> {
  const file = await store.read();
  return file.labels;
}

/**
 * Applies a batch of edits and returns the resulting labels.
 *
 * A batch rather than one key per call: the editor saves a whole form, and writing
 * each field separately would mean one disk write per field and a half-applied state
 * if any failed partway.
 */
export async function setLabels(
  edits: Record<string, string>,
): Promise<{ labels: Labels; rejected: string[] }> {
  const rejected: string[] = [];

  await store.update((file) => {
    const labels = (file.labels ??= {});
    for (const [key, raw] of Object.entries(edits)) {
      if (!isLabelKey(key)) {
        // Report rather than ignore: a typo'd key would otherwise vanish silently and
        // look like a save that didn't take.
        rejected.push(key);
        continue;
      }
      const value = typeof raw === "string" ? raw.trim().slice(0, LABEL_MAX_LENGTH) : "";
      // Blank clears the override, restoring the default. Storing "" would render an
      // empty heading, which is never what someone clearing a field means.
      if (value) labels[key as LabelKey] = value;
      else delete labels[key as LabelKey];
    }
  });

  return { labels: await getLabels(), rejected };
}
