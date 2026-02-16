import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Travel Deal Tracker",
  description:
    "Daily flight + hotel intelligence for the Vancouver to Thailand corridor.",
  icons: {
    icon: [
      { url: "/yourfuture-favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: ["/yourfuture-favicon.svg"],
    apple: [{ url: "/yourfuture-favicon.svg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          data-noptimize="1"
          data-cfasync="false"
          data-wpfc-render="false"
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  var script = document.createElement("script");
  script.async = 1;
  script.src = "https://tp-em.com/NDk5MTQ4.js?t=499148";
  document.head.appendChild(script);
})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const stored = localStorage.getItem("tdd-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();`,
          }}
        />
        <div className="page-shell">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,_rgba(245,194,91,0.12),_transparent_55%)]" />
          <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-[rgba(255,255,255,0.6)] to-transparent" />
          <div className="relative">
            {children}
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
