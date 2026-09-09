import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
    <html lang="uk" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased text-base">
        <ThemeProvider>
          <div className="relative z-10 h-full">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
