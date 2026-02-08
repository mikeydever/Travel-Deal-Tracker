"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClientReady } from "@/hooks/useClientReady";

const NAV_LINKS = [
  { label: "Overview", href: "/" },
  { label: "Flights", href: "/flights" },
  { label: "Hotels", href: "/hotels" },
  { label: "Experiences", href: "/experiences" },
  { label: "Itinerary", href: "/itinerary" },
];

interface NavPillsProps {
  className?: string;
}

const baseClass =
  "inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

export function NavPills({ className = "" }: NavPillsProps) {
  const pathname = usePathname();
  const mounted = useClientReady();

  return (
    <nav className={`flex flex-wrap gap-3 ${className}`}>
      {NAV_LINKS.map((link) => {
        const isActive = mounted && pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`${baseClass} ${
              isActive
                ? "border-transparent bg-[var(--accent)] text-black shadow-[var(--shadow-soft)]"
                : "border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
