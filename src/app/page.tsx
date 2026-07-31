"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { EASE_OUT } from "@/lib/motion";

const CORAL = "#E8624A";

// ── Parallax + fade-in wrapper for headings ───────────────────────────────────
function ParallaxHeader({
  children,
  yRange = 140,
}: {
  children: React.ReactNode;
  yRange?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`${yRange}px`, `-${yRange * 0.8}px`]);
  const opacity = useTransform(scrollYProgress, [0, 0.28], [0, 1]);
  const scale = useTransform(scrollYProgress, [0, 0.3], [0.88, 1]);

  return (
    <div ref={ref}>
      <motion.div style={{ y, opacity, scale }}>{children}</motion.div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function StatCard({
  value,
  label,
  arrow = false,
}: {
  value: string;
  label: string;
  arrow?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-[18px] px-4 py-3.5"
      style={{
        background: "var(--c-surface)",
        backdropFilter: "var(--c-blur)",
        WebkitBackdropFilter: "var(--c-blur)",
        boxShadow: "var(--c-shadow-sm)",
        border: "1px solid var(--c-border)",
      }}
    >
      <div>
        <div className="text-xl font-bold leading-none" style={{ color: "var(--c-text)" }}>{value}</div>
        <div className="mt-1 text-[11px]" style={{ color: "var(--c-text-dim)" }}>{label}</div>
      </div>
      {arrow && <span className="text-lg" style={{ color: "var(--c-text-faint)" }}>›</span>}
    </div>
  );
}

function SectionTag({ children }: { children: string }) {
  return (
    <p className="mb-4 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--c-text-faint)" }}>
      {children}
    </p>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 60, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: EASE_OUT } },
};

// ── Mountain range (light mode only) ─────────────────────────────────────────
function MountainRange() {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-10" style={{ height: "32vh" }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mountains.avif"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 60%",
            filter: "grayscale(100%) contrast(1.15) brightness(0.9)",
          }}
        />
        {/* Subtle top fade */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, var(--c-bg) 0%, transparent 12%)",
          }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [isDark, setIsDark] = useState(true);

  return (
    <div
      data-theme={isDark ? "dark" : "light"}
      className="min-h-screen overflow-x-hidden"
      style={{
        background: isDark
          ? "var(--c-bg)"
          : "radial-gradient(ellipse at 30% 10%, rgba(232,98,74,0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(180,190,255,0.04) 0%, transparent 50%), #f2f2f5",
        color: "var(--c-text)",
        fontFamily: "var(--font-mono)",
        paddingBottom: isDark ? 0 : "20vh",
      }}
    >
      {!isDark && <MountainRange />}

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-8 py-5"
        style={{ background: "var(--c-nav-grad)" }}
      >
        <span className="text-sm font-bold tracking-widest" style={{ color: CORAL }}>
          mcninch.live
        </span>
        <div className="flex items-center gap-3">
          {/* Theme toggle pill */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-7 w-14 items-center rounded-full px-1 transition-colors"
            style={{ background: isDark ? "#2a2a2a" : "#e0e0e0" }}
            aria-label="Toggle theme"
          >
            <motion.div
              animate={{ x: isDark ? 0 : 24 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="h-5 w-5 rounded-full"
              style={{ background: isDark ? "#ffffff" : "#111111" }}
            />
          </button>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs"
            style={{ background: "var(--c-surface)", color: "var(--c-text-dim)" }}
          >
            J
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 pb-10 pt-24">
        {isDark && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]"
            style={{ background: `radial-gradient(circle, ${CORAL} 0%, transparent 70%)` }}
          />
        )}

        <div className="relative z-10 max-w-2xl text-center">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mb-6 text-[10px] uppercase tracking-[0.25em]"
            style={{ color: "var(--c-text-faint)" }}
          >
            Coming soon
          </motion.p>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.1 }}
            className="text-[clamp(3rem,8vw,5.5rem)] font-bold leading-[1.05] tracking-tight"
          >
            Slightly
            <br />
            <span style={{ color: CORAL }}>in progress</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-md text-sm leading-relaxed"
            style={{ color: "var(--c-text-dim)" }}
          >
            for more info contact @jasonmcninch@gmail.com
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-full px-5 py-3 text-sm outline-none transition-colors sm:w-64"
              style={{
                border: "1px solid var(--c-border-dim)",
                background: "var(--c-surface)",
                color: "var(--c-text)",
              }}
            />
            <button
              className="w-full rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80 sm:w-auto"
              style={{ background: CORAL }}
            >
              Get notified
            </button>
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          transition={{ delay: 0.5, duration: 1.1, ease: EASE_OUT }}
          className="relative z-10 mt-20 w-full max-w-xl"
        >
          <div
            className="rounded-2xl p-6"
            style={{
              background: "var(--c-surface2)",
              backdropFilter: "var(--c-blur)",
              WebkitBackdropFilter: "var(--c-blur)",
              boxShadow: "var(--c-shadow)",
              border: "1px solid var(--c-border)",
            }}
          >
            <h2 className="mb-5 text-2xl font-bold" style={{ color: CORAL }}>
              Hey Handsome,
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-2">
                <SectionTag>Efficiency</SectionTag>
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "var(--c-surface)",
                    backdropFilter: "var(--c-blur)",
                    WebkitBackdropFilter: "var(--c-blur)",
                    boxShadow: "var(--c-shadow-sm)",
                    border: "1px solid var(--c-border)",
                  }}
                >
                  <div className="text-2xl font-bold">1,589</div>
                  <div className="mt-1 text-[11px]" style={{ color: "var(--c-text-dim)" }}>Actions taken</div>
                  <div className="mt-4 flex justify-center">
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="20" fill="none" stroke="var(--c-ring-track)" strokeWidth="3" />
                      <circle cx="26" cy="26" r="20" fill="none" stroke="var(--c-text)" strokeWidth="3"
                        strokeDasharray="100 126" strokeLinecap="round" transform="rotate(-90 26 26)" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <SectionTag>Email</SectionTag>
                <StatCard value="1,234" label="Sorted" />
                <StatCard value="854" label="Deleted" />
                <StatCard value="16" label="Awaiting" arrow />
              </div>
              <div className="space-y-2">
                <SectionTag>Slack</SectionTag>
                <StatCard value="45" label="Received" />
                <StatCard value="16" label="Awaiting" arrow />
              </div>
            </div>
          </div>
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 rounded-b-2xl"
            style={{ background: "linear-gradient(to bottom, transparent, var(--c-bg))" }}
          />
        </motion.div>
      </section>

      {/* ── Feature 1: Communications ── */}
      <section className="relative z-20 mx-auto max-w-3xl px-6 py-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <SectionTag>01 — Communications</SectionTag>
        </motion.div>
        <ParallaxHeader yRange={65}>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.1]">
            Inbox zero,
            <br />
            <span style={{ color: CORAL }}>automated.</span>
          </h2>
        </ParallaxHeader>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <p className="mt-4 max-w-md text-sm leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
            Emails sorted, deleted, and replied to before you even open the app.
            Slack triaged and drafted. You approve — or let it run.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            <StatCard value="1,234" label="Emails sorted" />
            <StatCard value="854" label="Deleted" />
            <StatCard value="16" label="Awaiting approval" arrow />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard value="45" label="Slack received" />
            <StatCard value="16" label="Slack awaiting" arrow />
          </div>
        </motion.div>
      </section>

      {/* ── Feature 2: Actions ── */}
      <section className="relative z-20 mx-auto max-w-3xl px-6 py-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <SectionTag>02 — Actions</SectionTag>
        </motion.div>
        <ParallaxHeader yRange={65}>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.1]">
            Approve once,
            <br />
            <span style={{ color: CORAL }}>deploy instantly.</span>
          </h2>
        </ParallaxHeader>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <p className="mt-4 max-w-md text-sm leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
            Someone asks for a design? The agent drafts the reply, queues the
            task, and waits for your tap — then builds it with Claude.
          </p>
          <div
            className="mt-10 space-y-2 rounded-2xl p-5"
            style={{
              background: "var(--c-surface2)",
              backdropFilter: "var(--c-blur)",
              WebkitBackdropFilter: "var(--c-blur)",
              boxShadow: "var(--c-shadow)",
              border: "1px solid var(--c-border)",
            }}
          >
            {[
              { from: "John Stamos", msg: "Can you build the onboarding flow?", approved: false },
              { from: "Sarah K.", msg: "Need the dashboard redesigned", approved: false },
              { from: "Mike R.", msg: "Reaching out — want to follow up...", approved: false },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{
                  background: "var(--c-surface)",
                  backdropFilter: "var(--c-blur)",
                  WebkitBackdropFilter: "var(--c-blur)",
                  boxShadow: "var(--c-shadow-sm)",
                  border: "1px solid var(--c-border)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold">{item.from}</div>
                  <div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--c-text-dim)" }}>{item.msg}</div>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold"
                  style={{ border: "1px solid var(--c-border-dim)", color: "var(--c-text-faint)" }}
                >
                  Awaiting →
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Feature 3: Wellness ── */}
      <section className="relative z-20 mx-auto max-w-3xl px-6 py-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <SectionTag>03 — Wellness</SectionTag>
        </motion.div>
        <ParallaxHeader yRange={65}>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.1]">
            Body and mind,
            <br />
            <span style={{ color: CORAL }}>tracked.</span>
          </h2>
        </ParallaxHeader>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <p className="mt-4 max-w-md text-sm leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
            Macros logged. Workouts tracked. Your agent knows your goals and
            keeps you honest — without the spreadsheets.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-5"
              style={{
                background: "var(--c-surface)",
                backdropFilter: "var(--c-blur)",
                WebkitBackdropFilter: "var(--c-blur)",
                boxShadow: "var(--c-shadow)",
                border: "1px solid var(--c-border)",
              }}
            >
              <SectionTag>Exercise</SectionTag>
              <div className="text-4xl font-bold">88%</div>
              <div className="mt-1 text-[11px]" style={{ color: "var(--c-text-dim)" }}>Workouts completed today</div>
              <div className="mt-5 flex justify-start">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="20" fill="none" stroke="var(--c-ring-track)" strokeWidth="3" />
                  <circle cx="26" cy="26" r="20" fill="none" stroke="var(--c-text)" strokeWidth="3"
                    strokeDasharray="110 126" strokeLinecap="round" transform="rotate(-90 26 26)" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <SectionTag>Workouts</SectionTag>
              {[
                { label: "Push ups", value: "90%" },
                { label: "Bench Press", value: "100%" },
                { label: "Incline Press", value: "99%" },
              ].map((w) => (
                <div
                  key={w.label}
                  className="flex items-center justify-between rounded-[18px] px-4 py-3"
                  style={{
                    background: "var(--c-surface)",
                    backdropFilter: "var(--c-blur)",
                    WebkitBackdropFilter: "var(--c-blur)",
                    boxShadow: "var(--c-shadow-sm)",
                    border: "1px solid var(--c-border)",
                  }}
                >
                  <span className="text-xs" style={{ color: "var(--c-text-dim)" }}>{w.label}</span>
                  <span className="text-sm font-bold" style={{ color: w.value === "100%" ? CORAL : "var(--c-text)" }}>
                    {w.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-20 px-6 py-28 text-center">
        <ParallaxHeader yRange={55}>
          <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05]">
            Ready to hand
            <br />
            <span style={{ color: CORAL }}>it all over?</span>
          </h2>
        </ParallaxHeader>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <p className="mx-auto mt-5 max-w-xs text-sm" style={{ color: "var(--c-text-faint)" }}>
            Join the waitlist. Be first when it launches.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-full px-5 py-3 text-sm outline-none transition-colors sm:w-64"
              style={{
                border: "1px solid var(--c-border-dim)",
                background: "var(--c-surface)",
                color: "var(--c-text)",
              }}
            />
            <button
              className="w-full rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80 sm:w-auto"
              style={{ background: CORAL }}
            >
              Get notified
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 px-6 py-8 text-center" style={{ borderTop: "1px solid var(--c-border)" }}>
        <p className="text-[11px]" style={{ color: "var(--c-text-faint)" }}>© 2026 mcninch.live</p>
      </footer>
    </div>
  );
}
