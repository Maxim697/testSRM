import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "CRM платформа",
  description: "Внутрішня CRM платформа",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased text-base">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
