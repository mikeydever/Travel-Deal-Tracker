import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Travel Deal Tracker",
  description:
    "Daily flight + hotel intelligence for the Vancouver to Thailand corridor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <div className="min-h-screen bg-slate-50/60">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(31,122,140,0.1),_transparent)]" />
          <div className="pointer-events-none fixed inset-y-0 left-0 -z-10 w-40 bg-gradient-to-r from-white/70 to-transparent" />
          <div className="pointer-events-none fixed inset-y-0 right-0 -z-10 w-40 bg-gradient-to-l from-white/70 to-transparent" />
          <div className="relative">{children}</div>
        </div>
      </body>
    </html>
  );
}
