import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getWellness, isDayKey, setDay, setGoal } from "@/lib/wellness";

/**
 * The proxy already gates this path, but check again here.
 *
 * Defense in depth: a future change to the proxy matcher shouldn't silently
 * expose an endpoint that writes to disk.
 */
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
  return NextResponse.json(await getWellness());
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

  const { day } = body;
  if (!isDayKey(day)) {
    return NextResponse.json(
      { error: "Expected day to be one of mon|tue|wed|thu|fri|sat." },
      { status: 400 },
    );
  }

  // Which field is present decides the operation. `goal` is checked first so a
  // request carrying both doesn't silently drop it.
  if (typeof body.goal === "string") {
    await setGoal(day, body.goal);
    return NextResponse.json(await getWellness());
  }

  if (typeof body.done === "boolean") {
    await setDay(day, body.done);
    return NextResponse.json(await getWellness());
  }

  return NextResponse.json(
    { error: "Expected either { day, done: boolean } or { day, goal: string }." },
    { status: 400 },
  );
}
