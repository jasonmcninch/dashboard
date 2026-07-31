import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getLabels, getOverrides, setLabels } from "@/lib/settings";

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
  return NextResponse.json({
    labels: await getLabels(),
    overrides: await getOverrides(),
  });
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const edits = (body as { labels?: unknown })?.labels;
  if (typeof edits !== "object" || edits === null || Array.isArray(edits)) {
    return NextResponse.json(
      { error: "Expected { labels: { [key]: string } }." },
      { status: 400 },
    );
  }

  // Coerce here rather than trusting the shape: every value reaching the store must
  // be a string, and a number or null arriving from a hand-rolled request would
  // otherwise be written straight through.
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(edits as Record<string, unknown>)) {
    clean[key] = typeof value === "string" ? value : "";
  }

  const { labels, rejected } = await setLabels(clean);
  if (rejected.length) {
    return NextResponse.json(
      { error: `Unknown label keys: ${rejected.join(", ")}` },
      { status: 400 },
    );
  }
  return NextResponse.json({ labels, overrides: await getOverrides() });
}
