import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Trip Guides", href: "/guides" },
  { label: "About", href: "/about" },
  { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
  { label: "Contact", href: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--card-border)]/80 bg-[var(--card)]/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-[var(--muted)]">
          Personal Thailand trip-planning project with daily price tracking and original travel notes.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:text-[var(--accent)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
