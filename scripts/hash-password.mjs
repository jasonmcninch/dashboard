#!/usr/bin/env node
// Generates the AUTH_PASSWORD_HASH and SESSION_SECRET values for .env.local.
// The password is read straight from the TTY in raw mode with echo suppressed,
// so it never lands in shell history or a process listing.

import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { stdin, stdout } from "node:process";

/**
 * Prompts for a secret, echoing `*` per character.
 *
 * Uses raw-mode stdin rather than readline: readline's own terminal handling
 * repaints the line and can swallow a prompt written just before question(),
 * which showed up as the script appearing to hang with no prompt at all.
 */
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      reject(
        new Error(
          "This needs an interactive terminal (so your password isn't echoed).\n" +
            "Run it directly in Terminal or iTerm, not through a pipe or an agent.",
        ),
      );
      return;
    }

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    const finish = (fn, arg) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      stdout.write("\n");
      fn(arg);
    };

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return finish(resolve, value);
        if (ch === "\u0003") return finish(() => process.exit(130)); // Ctrl-C
        if (ch === "\u0004") return finish(resolve, value); // Ctrl-D
        if (ch === "\u007f" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        // Ignore other control characters (arrow keys arrive as escape sequences).
        if (ch < " ") continue;
        value += ch;
        stdout.write("*");
      }
    };

    stdin.on("data", onData);
  });
}

let password;
try {
  password = await promptHidden("New dashboard password (12+ chars): ");
} catch (error) {
  // Print the message plainly — a stack trace here just buries the fix.
  console.error(`\n${error.message}`);
  process.exit(1);
}

if (password.length < 12) {
  console.error(`\nToo short — got ${password.length} characters, need at least 12.`);
  process.exit(1);
}

const confirm = await promptHidden("Confirm password: ");
if (password !== confirm) {
  console.error("\nPasswords don't match. Nothing was changed — run it again.");
  process.exit(1);
}

// Cost 12: ~250ms per verification. Slow enough to make offline cracking
// expensive, fast enough that logging in doesn't feel broken.
const passwordHash = await hash(password, 12);
const sessionSecret = randomBytes(48).toString("base64");

// Next.js expands `$VAR` when it reads .env files — and quoting does not turn
// that off — so a raw bcrypt hash like `$2b$12$Abc...` loads as `/Abc...` and
// every login fails as though the password were wrong. Escape each `$` for the
// .env form. The kubectl form goes straight to the container env, no expansion.
const escapedHash = passwordHash.replaceAll("$", "\\$");

console.log(`
Done. Copy the 3 lines below into .env.local, replacing what's there.
Keep the backslashes exactly as shown — they are required, not a typo.

────────────────────────────────────────────────────────────────────────
AUTH_USERNAME=Jason
AUTH_PASSWORD_HASH=${escapedHash}
SESSION_SECRET=${sessionSecret}
────────────────────────────────────────────────────────────────────────

Then restart the dev server and sign in at http://localhost:3000/login

For production later, this is the Kubernetes Secret (no escaping needed):

  kubectl create secret generic mcninch-auth -n jason \\
    --from-literal=AUTH_USERNAME=Jason \\
    --from-literal=AUTH_PASSWORD_HASH='${passwordHash}' \\
    --from-literal=SESSION_SECRET='${sessionSecret}'
`);
