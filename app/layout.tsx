import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { EffectsProvider } from "@/components/effects-provider";
import { SystemStatusLine } from "@/components/layout/system-status-line";
import { BuildMarker } from "@/components/layout/build-marker";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
  // "optional" (not the default "swap") is the actual fix for the table
  // jitter: next/font's automatic fallback ("JetBrains Mono Fallback",
  // based on local Arial) matches vertical metrics (ascent/descent/
  // line-gap) well, but Arial is proportional and JetBrains Mono is
  // monospace — their character WIDTHS never match, metric-adjusted or
  // not. With "swap", the moment the real font finishes loading, every
  // string on the page reflows from Arial-proportional widths to
  // monospace widths in one shot — a real, one-time layout shift wide
  // enough to nudge unrelated elements (like the table's own position,
  // even though table-layout: fixed keeps its *columns* stable) by a few
  // pixels. "optional" gives the (self-hosted, normally near-instant)
  // font a short window to load with no swap at all; if it somehow
  // misses that window this one time, the page just keeps the fallback
  // rather than swapping later and shifting layout.
  display: "optional",
});

export const metadata: Metadata = {
  title: "CRM платформа",
  description: "Внутрішня CRM платформа",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full antialiased text-base">
        <ThemeProvider>
          <EffectsProvider>
            {/* CustomCursor removed from render entirely (not just gated off
                via effects intensity) per explicit request while the
                Scoreboard jitter is under investigation — see
                components/layout/custom-cursor.tsx, kept in the repo so
                it's a one-line re-add once resolved. */}
            <SystemStatusLine />
            <BuildMarker />
            <div className="relative z-10 h-full">{children}</div>
          </EffectsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
