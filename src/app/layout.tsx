import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";
import { ThemeProvider, type Theme } from "@/components/theme/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SM-AI | Social Media Management",
  description:
    "A-Z platform for social media planning and management (Plataforma A-Z para planeamento e gestão de social media).",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const themeCookie = cookieStore.get("theme")?.value as Theme | undefined;
  const theme: Theme = themeCookie ?? "system";
  // Server can't detect system preference — no class by default (light), client hydration corrects
  const initialClass = theme === "dark" ? "dark" : "";

  return (
    <html lang={locale} className={initialClass} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider defaultTheme={theme}>
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
