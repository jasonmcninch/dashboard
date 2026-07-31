import { jwtVerify, SignJWT } from "jose";

// Edge-safe: this module is imported by middleware, so it must not pull in
// bcrypt or any Node built-in. Credential checking lives in ./auth.ts instead.

export const SESSION_COOKIE = "mcninch_session";

/** How long a login lasts before you have to sign in again. */
const SESSION_TTL = "7d";

export type SessionPayload = {
  /** Username the session was issued to. */
  sub: string;
};

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    // Failing loudly beats signing sessions with a weak or absent key — an
    // attacker who can guess the secret can mint their own session cookie.
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. " +
        "Generate one with: openssl rand -base64 48",
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());
}

/** Returns the payload for a valid token, or null for anything else. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? { sub: payload.sub } : null;
  } catch {
    // Expired, tampered with, or signed by a different secret.
    return null;
  }
}
