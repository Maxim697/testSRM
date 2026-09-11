import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Source Sans 3 — softer and warmer than Inter's geometric forms, still
// built for dense UI: proper tabular figures, good legibility at 12-13px.
// Picked over Instrument Sans / Public Sans (the other two candidates)
// for one hard requirement neither of those actually meets: this app's
// UI text is heavily Cyrillic (Ukrainian), and only Source Sans 3 ships a
// cyrillic subset — the other two are Latin-only, which would silently
// fall back to a different font for most of the interface. One family
// for every theme; it's part of the design system, not a per-theme knob.
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "cyrillic"],
  // "optional": the font gets a short window to load with no swap at all;
  // if it somehow misses that window this one time, the page just keeps
  // the (metric-matched) fallback rather than swapping later and
  // reflowing anything.
  display: "optional",
});

export const metadata: Metadata = {
  title: "CRM платформа",
  description: "Внутрішня CRM платформа",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${sourceSans.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased text-base">
        <ThemeProvider>
          <div className="relative z-10 h-full">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
