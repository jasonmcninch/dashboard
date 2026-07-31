import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

/** Rejects a login without telling the caller which field was wrong. */
const INVALID = NextResponse.json(
  { error: "Invalid username or password." },
  { status: 401 },
);

export async function POST(request: Request) {
  let username: unknown;
  let password: unknown;

  try {
    const body = await request.json();
    username = body?.username;
    password = body?.password;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  let ok: boolean;
  try {
    ok = await verifyCredentials(username, password);
  } catch (error) {
    // Misconfiguration (missing env vars), not a failed login — don't report it
    // as bad credentials, or a broken deploy looks like a forgotten password.
    console.error("Auth is misconfigured:", error);
    return NextResponse.json(
      { error: "Login is not configured on this server." },
      { status: 500 },
    );
  }

  if (!ok) return INVALID.clone();

  const token = await createSessionToken(username);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true, // not readable from JavaScript
    sameSite: "lax", // survives the post-login redirect, blocks cross-site POSTs
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
