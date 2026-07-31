import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import {
  getSpiritual,
  isItemKey,
  isReadingItemKey,
  isValidReading,
  setDone,
  setReading,
  setTopic,
} from "@/lib/spiritual";

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
  return NextResponse.json(await getSpiritual());
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

  if (action === "toggle") {
    if (!isItemKey(item) || typeof body.done !== "boolean") {
      return NextResponse.json(
        { error: "Expected { action: 'toggle', item, done: boolean }." },
        { status: 400 },
      );
    }
    await setDone(item, body.done);
    return NextResponse.json(await getSpiritual());
  }

  if (action === "position") {
    const reading = { book: body.book, chapter: body.chapter };
    if (!isReadingItemKey(item) || !isValidReading(reading)) {
      return NextResponse.json(
        {
          error:
            "Expected { action: 'position', item: 'bom'|'family', book, chapter } " +
            "with a chapter that exists in that book.",
        },
        { status: 400 },
      );
    }
    await setReading(item, reading);
    return NextResponse.json(await getSpiritual());
  }

  if (action === "topic") {
    if (typeof body.text !== "string") {
      return NextResponse.json(
        { error: "Expected { action: 'topic', text: string }." },
        { status: 400 },
      );
    }
    // Over-long input is truncated by setTopic rather than rejected — the client
    // caps the field too, so a long value means a paste, not an attack, and
    // silently keeping the first 200 chars beats losing the whole thing.
    await setTopic(body.text);
    return NextResponse.json(await getSpiritual());
  }

  return NextResponse.json(
    { error: "Expected action 'toggle', 'position', or 'topic'." },
    { status: 400 },
  );
}
