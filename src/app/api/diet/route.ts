import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getDiet, isValidSatisfaction, setSatisfaction } from "@/lib/diet";

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
  return NextResponse.json(await getDiet());
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let satisfaction: unknown;
  try {
    satisfaction = (await request.json())?.satisfaction;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!isValidSatisfaction(satisfaction)) {
    return NextResponse.json(
      { error: "Expected { satisfaction: integer 0-10 }." },
      { status: 400 },
    );
  }

  await setSatisfaction(satisfaction);
  return NextResponse.json(await getDiet());
}
