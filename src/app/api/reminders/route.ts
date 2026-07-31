import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import {
  addReminder,
  deleteReminder,
  getReminders,
  REMINDER_MAX_COUNT,
  setReminderDone,
} from "@/lib/reminders";

/** Defense in depth — the proxy gates this path too, but this writes to disk. */
async function requireSession() {
  const session = await verifySessionToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  return session !== null;
}

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json(await getReminders());
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { action } = body;

  if (action === "add") {
    if (typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json(
        { error: "Expected { action: 'add', text: non-empty string }." },
        { status: 400 },
      );
    }
    const created = await addReminder(body.text);
    if (!created) {
      return NextResponse.json(
        { error: `Reminder limit reached (${REMINDER_MAX_COUNT}).` },
        { status: 409 },
      );
    }
    return NextResponse.json(await getReminders());
  }

  if (action === "toggle") {
    if (typeof body.id !== "string" || typeof body.done !== "boolean") {
      return NextResponse.json(
        { error: "Expected { action: 'toggle', id, done: boolean }." },
        { status: 400 },
      );
    }
    // A 404 rather than a silent success: the client's list is stale, and it
    // should refetch rather than keep showing a reminder that no longer exists.
    if (!(await setReminderDone(body.id, body.done))) {
      return NextResponse.json({ error: "No such reminder." }, { status: 404 });
    }
    return NextResponse.json(await getReminders());
  }

  if (action === "delete") {
    if (typeof body.id !== "string") {
      return NextResponse.json(
        { error: "Expected { action: 'delete', id }." },
        { status: 400 },
      );
    }
    if (!(await deleteReminder(body.id))) {
      return NextResponse.json({ error: "No such reminder." }, { status: 404 });
    }
    return NextResponse.json(await getReminders());
  }

  return NextResponse.json(
    { error: "Expected action 'add', 'toggle', or 'delete'." },
    { status: 400 },
  );
}
