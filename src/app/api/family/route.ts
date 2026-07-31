import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import {
  getFamily,
  isFamilyItemKey,
  setFamilyDone,
  setFamilyNote,
} from "@/lib/family";

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
  return NextResponse.json(await getFamily());
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

  const { action, item } = body;
  if (!isFamilyItemKey(item)) {
    return NextResponse.json(
      { error: "Unknown item." },
      { status: 400 },
    );
  }

  if (action === "toggle") {
    if (typeof body.done !== "boolean") {
      return NextResponse.json(
        { error: "Expected { action: 'toggle', item, done: boolean }." },
        { status: 400 },
      );
    }
    await setFamilyDone(item, body.done);
    return NextResponse.json(await getFamily());
  }

  if (action === "note") {
    if (typeof body.note !== "string") {
      return NextResponse.json(
        { error: "Expected { action: 'note', item, note: string }." },
        { status: 400 },
      );
    }
    if (item !== "date") {
      return NextResponse.json(
        { error: "Only the date row takes a note." },
        { status: 400 },
      );
    }
    await setFamilyNote(item, body.note);
    return NextResponse.json(await getFamily());
  }

  return NextResponse.json(
    { error: "Expected action 'toggle' or 'note'." },
    { status: 400 },
  );
}
