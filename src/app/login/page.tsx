"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EASE_OUT } from "@/lib/motion";

const CORAL = "#E8624A";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Something went wrong. Try again.");
        setPassword("");
        return;
      }

      // Only relative paths — an attacker-supplied ?next=https://evil.example
      // would otherwise turn this into an open redirect.
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  const inputStyle = {
    border: "1px solid var(--c-border-dim)",
    background: "var(--c-surface)",
    color: "var(--c-text)",
  } as const;

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm">
      <div
        className="rounded-2xl p-8"
        style={{
          background: "var(--c-surface2)",
          backdropFilter: "var(--c-blur)",
          WebkitBackdropFilter: "var(--c-blur)",
          boxShadow: "var(--c-shadow)",
          border: "1px solid var(--c-border)",
        }}
      >
        <p
          className="mb-2 text-[10px] uppercase tracking-[0.25em]"
          style={{ color: "var(--c-text-faint)" }}
        >
          Private
        </p>
        <h1 className="mb-7 text-2xl font-bold leading-tight">
          Welcome back,
          <br />
          <span style={{ color: CORAL }}>Jason.</span>
        </h1>

        <label className="mb-1.5 block text-[11px]" style={{ color: "var(--c-text-dim)" }}>
          Username
        </label>
        <input
          name="username"
          autoComplete="username"
          autoFocus
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded-full px-5 py-3 text-sm outline-none"
          style={inputStyle}
        />

        <label className="mb-1.5 block text-[11px]" style={{ color: "var(--c-text-dim)" }}>
          Password
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-full px-5 py-3 text-sm outline-none"
          style={inputStyle}
        />

        {error && (
          <p
            role="alert"
            className="mt-4 text-[11px] leading-relaxed"
            style={{ color: CORAL }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-7 w-full rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: CORAL }}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    // Theme comes from the root element, set before paint by the layout's script.
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]"
        style={{ background: `radial-gradient(circle, ${CORAL} 0%, transparent 70%)` }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="relative z-10 flex w-full justify-center"
      >
        {/* useSearchParams needs a Suspense boundary during prerender. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
