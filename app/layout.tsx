import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { EffectsProvider } from "@/components/effects-provider";
import { SystemStatusLine } from "@/components/layout/system-status-line";
import { CustomCursor } from "@/components/layout/custom-cursor";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
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
            <CustomCursor />
            <SystemStatusLine />
            <div className="relative z-10 h-full">{children}</div>
          </EffectsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
