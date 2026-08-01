import type { Metadata } from "next";
import { Geist, Space_Mono } from "next/font/google";
import "./globals.css";
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  // The browser tab, and the name a bookmark or a home-screen shortcut takes. Applies
  // to the public landing page too, since that renders through this layout — which is
  // intended: the wordmark is mañana everywhere now, so the tab agreeing with it is the
  // point rather than a side effect.
  title: "mañana",
  description: "Jason McNinch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-theme lives on the root, not on each page, so one attribute themes the
    // whole document — including `body`, whose background comes from the shadcn
    // tokens. Rendered as the default and corrected before paint by the script below.
    <html
      lang="en"
      className="dark"
      data-theme={DEFAULT_THEME}
      // The init script below rewrites data-theme and the `dark` class before React
      // hydrates, so React compares its expected attributes against ones already
      // changed and reports a mismatch. That mismatch is the mechanism working, not a
      // bug: suppressing it is scoped to this element only, and children still get
      // the normal checks. Restoring the theme after hydration instead would trade
      // this warning for a visible flash of the wrong theme on every load.
      suppressHydrationWarning
    >
      <head>
        {/* Restores the saved theme before the first paint. Must be inline and
            synchronous — anything deferred, including a React effect, runs after the
            page has already been painted in the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${spaceMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
