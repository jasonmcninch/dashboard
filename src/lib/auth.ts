import { compare } from "bcryptjs";

// Node-runtime only (bcrypt). Middleware must import ./session.ts instead.

/**
 * Constant-time string comparison. A plain `===` on the username leaks, via
 * response timing, how many leading characters were correct.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  // Compare lengths into the accumulator rather than returning early.
  let mismatch = aBytes.length === bBytes.length ? 0 : 1;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i++) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return mismatch === 0;
}

/**
 * Checks a login against AUTH_USERNAME / AUTH_PASSWORD_HASH.
 *
 * The password is never stored anywhere — only its bcrypt hash, supplied via
 * env var (a Kubernetes Secret in production). Generate one with:
 *   npm run hash-password
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUser = process.env.AUTH_USERNAME;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;

  if (!expectedUser || !expectedHash) {
    throw new Error(
      "AUTH_USERNAME and AUTH_PASSWORD_HASH must both be set. " +
        "Run `npm run hash-password` to generate a hash.",
    );
  }

  // Next.js runs `$VAR` expansion over .env files, and a bcrypt hash is full of
  // `$` — an unescaped `$2b$12$Abc...` silently loads as `/Abc...`, which then
  // fails every login as if the password were wrong. Catch it here so the error
  // says what's actually broken. Quoting the value does NOT help; each `$` must
  // be backslash-escaped. Values from a Kubernetes Secret are unaffected.
  if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(expectedHash)) {
    throw new Error(
      "AUTH_PASSWORD_HASH is not a valid bcrypt hash (got " +
        `${expectedHash.length} chars starting "${expectedHash.slice(0, 4)}"). ` +
        "If it came from a .env file, escape every `$` as `\\$` — Next.js " +
        "expands `$VAR` even inside quotes. Re-run `npm run hash-password`.",
    );
  }

  // Always run the bcrypt comparison, even when the username is wrong, so a
  // bad username and a bad password take the same amount of time.
  const userOk = timingSafeEqual(username, expectedUser);
  const passOk = await compare(password, expectedHash);
  return userOk && passOk;
}
