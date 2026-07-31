import { JsonStore } from "../json-store";

// Reminders differ from every other checklist here: the rows are created by the
// user rather than defined in code, and they persist until ticked rather than
// resetting on a clock. So they carry their own ids and a done flag, with no
// period key.

export const REMINDER_MAX_LENGTH = 200;
export const REMINDER_MAX_COUNT = 100;

export type Reminder = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
};

type RemindersFile = { reminders: Reminder[] };

const store = new JsonStore<RemindersFile>(
  "reminders.json",
  () => ({ reminders: [] }),
  (parsed) =>
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as RemindersFile).reminders),
);

export type Reminders = {
  items: Reminder[];
  /** Completed ÷ total, as a percentage. 100% when the list is empty. */
  completedPct: number;
};

export async function getReminders(): Promise<Reminders> {
  const file = await store.read();
  const items = file.reminders;
  return {
    items,
    // An empty list is "nothing outstanding", so 100% — same reasoning as the
    // empty-inbox case, where 0% would read exactly backwards.
    completedPct: items.length
      ? Math.round((items.filter((r) => r.done).length / items.length) * 100)
      : 100,
  };
}

export async function addReminder(text: string): Promise<Reminder | null> {
  const trimmed = text.trim().slice(0, REMINDER_MAX_LENGTH);
  if (!trimmed) return null;

  return store.update((file) => {
    // Bounded so a stuck client can't grow the file without limit.
    if (file.reminders.length >= REMINDER_MAX_COUNT) return null;

    const reminder: Reminder = {
      // Server-generated: timestamp plus randomness, because two reminders added
      // in the same millisecond would otherwise collide on id.
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      text: trimmed,
      done: false,
      createdAt: new Date().toISOString(),
    };
    // Newest first, matching the order they appear in the UI.
    file.reminders.unshift(reminder);
    return reminder;
  });
}

export async function setReminderDone(
  id: string,
  done: boolean,
): Promise<boolean> {
  return store.update((file) => {
    const reminder = file.reminders.find((r) => r.id === id);
    if (!reminder) return false;
    reminder.done = done;
    return true;
  });
}

export async function deleteReminder(id: string): Promise<boolean> {
  return store.update((file) => {
    const index = file.reminders.findIndex((r) => r.id === id);
    if (index === -1) return false;
    file.reminders.splice(index, 1);
    return true;
  });
}
