"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Overview", href: "/" },
  { label: "Flights", href: "/flights" },
  { label: "Hotels", href: "/hotels" },
];

interface NavPillsProps {
  className?: string;
}

const baseClass =
  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function NavPills({ className = "" }: NavPillsProps) {
  const pathname = usePathname();

  return (
    <nav className={`flex flex-wrap gap-3 ${className}`}>
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`${baseClass} ${
              isActive
                ? "border-transparent bg-[var(--accent)] text-white shadow"
                : "border-[var(--card-border)] text-slate-600 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
