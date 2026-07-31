"use client";

import { useState } from "react";
import {
  FIELD_NAMES,
  LABEL_DEFAULTS,
  LABEL_GROUPS,
  LABEL_MAX_LENGTH,
  type LabelKey,
} from "@/lib/settings/registry";

const CORAL = "#E8624A";

const panel = {
  background: "var(--c-surface2)",
  backdropFilter: "var(--c-blur)",
  WebkitBackdropFilter: "var(--c-blur)",
  boxShadow: "var(--c-shadow)",
  border: "1px solid var(--c-border)",
} as const;

/** What the editor calls a field. Falls back to the shipped wording. */
function fieldName(key: LabelKey): string {
  return FIELD_NAMES[key] ?? LABEL_DEFAULTS[key];
}

/**
 * The label editor.
 *
 * Holds the whole form as one draft and saves it in a single request. Per-field
 * autosave was the alternative and is worse here: renaming a section usually means
 * touching several related fields, and a save per keystroke would write the file
 * dozens of times while producing intermediate states nobody asked to keep.
 *
 * An empty field is not an empty label — it means "use the shipped default". The
 * placeholder shows what that default is, so a cleared field still tells you what
 * will appear on the page.
 */
export function SettingsForm({
  initialOverrides,
}: {
  /** Only the keys that differ from the defaults. */
  initialOverrides: Record<string, string>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(initialOverrides);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const changedCount = Object.entries(draft).filter(
    ([key, value]) => value.trim() && value.trim() !== LABEL_DEFAULTS[key as LabelKey],
  ).length;

  async function save() {
    setStatus("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: draft }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? String(response.status));
      }
      const body = await response.json();
      setDraft(body.overrides ?? {});
      setStatus("saved");
      setMessage("Saved. The dashboard will show the new wording.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? `Couldn't save: ${error.message}`
          : "Couldn't save those changes.",
      );
    }
  }

  function resetAll() {
    // Clears every override by sending blanks for everything currently set — the
    // store treats a blank as "restore the default".
    const cleared: Record<string, string> = {};
    for (const key of Object.keys(draft)) cleared[key] = "";
    setDraft(cleared);
    setStatus("idle");
    setMessage("Cleared — press Save changes to restore every default.");
  }

  return (
    <div>
      <div
        className="sticky top-[72px] z-40 mb-6 flex items-center justify-between gap-3 rounded-[18px] px-4 py-3"
        style={panel}
      >
        <span className="text-[11px]" style={{ color: "var(--c-text-dim)" }}>
          {changedCount === 0
            ? "Nothing renamed yet"
            : `${changedCount} label${changedCount === 1 ? "" : "s"} renamed`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-full px-3 py-1.5 text-[11px] transition-opacity hover:opacity-70"
            style={{
              border: "1px solid var(--c-border-dim)",
              color: "var(--c-text-dim)",
            }}
          >
            Reset all
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={status === "saving"}
            className="rounded-full px-4 py-1.5 text-[11px] font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: CORAL, color: "#fff" }}
          >
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mb-6 text-[11px]"
          style={{ color: status === "error" ? CORAL : "var(--c-text-dim)" }}
        >
          {message}
        </p>
      )}

      <div className="space-y-8">
        {LABEL_GROUPS.map((group) => (
          <section key={group.id}>
            <p
              className="mb-1 text-[10px] uppercase tracking-[0.2em]"
              style={{ color: "var(--c-text-faint)" }}
            >
              {group.title}
            </p>
            {group.hint && (
              <p className="mb-3 text-[11px]" style={{ color: "var(--c-text-dim)" }}>
                {group.hint}
              </p>
            )}

            <div className="space-y-2 rounded-[18px] p-4" style={panel}>
              {group.keys.map((key) => {
                const value = draft[key] ?? "";
                const isChanged = value.trim() && value.trim() !== LABEL_DEFAULTS[key];
                return (
                  <div key={key} className="flex items-center gap-3">
                    <label
                      htmlFor={`label-${key}`}
                      className="w-[38%] shrink-0 text-[11px]"
                      style={{ color: "var(--c-text-dim)" }}
                    >
                      {fieldName(key)}
                    </label>
                    <input
                      id={`label-${key}`}
                      type="text"
                      value={value}
                      maxLength={LABEL_MAX_LENGTH}
                      // The default, so a blank field still says what will render.
                      placeholder={LABEL_DEFAULTS[key]}
                      onChange={(event) => {
                        setDraft((previous) => ({
                          ...previous,
                          [key]: event.target.value,
                        }));
                        setStatus("idle");
                      }}
                      className="w-full rounded-full px-3 py-1.5 text-[12px] outline-none"
                      style={{
                        border: `1px solid ${isChanged ? `${CORAL}66` : "var(--c-border-dim)"}`,
                        background: "var(--c-surface)",
                        color: "var(--c-text)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
