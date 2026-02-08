import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExperiencesClient } from "@/components/ExperiencesClient";
import { THAI_HUB_CITIES } from "@/config/travel";
import { SCOUT_CATEGORIES } from "@/config/scout";
import { getExperienceDeals } from "@/data/experienceDeals";

export const dynamic = "force-dynamic";

const buildHref = (params: {
  city?: string;
  category?: string;
  top?: boolean;
}) => {
  const search = new URLSearchParams();
  if (params.city && params.city !== "all") search.set("city", params.city);
  if (params.category && params.category !== "all") search.set("category", params.category);
  if (params.top) search.set("top", "1");
  const query = search.toString();
  return query ? `/experiences?${query}` : "/experiences";
};

export default async function ExperiencesPage({
  searchParams,
}: {
  searchParams?: { city?: string; category?: string; top?: string };
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const takeFirst = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const selectedCity = takeFirst(resolvedParams?.city) ?? "all";
  const selectedCategory = takeFirst(resolvedParams?.category) ?? "all";
  const topOnly = takeFirst(resolvedParams?.top) === "1";

  const deals = await getExperienceDeals({
    city: selectedCity === "all" ? undefined : selectedCity,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    topOnly,
  });

  const cities = ["all", ...THAI_HUB_CITIES];
  const categories = ["all", ...SCOUT_CATEGORIES];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Experiences</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Daily scout of tours & attractions
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--muted)]">
              Curated from trusted sources, ranked by freshness and confidence. Tap a card to see the
              source offer.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <ThemeToggle />
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-6 py-4 text-sm text-[var(--muted)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Scout cadence</p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">Daily</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Allowlist domains only.</p>
            </div>
          </div>
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Filters</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Find the right vibe</h2>
          </div>
          <a
            href={buildHref({ city: selectedCity, category: selectedCategory, top: !topOnly })}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
              topOnly
                ? "border-transparent bg-[var(--accent)] text-black"
                : "border-[var(--card-border)] text-[var(--muted)]"
            }`}
          >
            Top deals
          </a>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {cities.map((city) => (
            <a
              key={city}
              href={buildHref({ city, category: selectedCategory, top: topOnly })}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                selectedCity === city
                  ? "border-transparent bg-[var(--accent)] text-black"
                  : "border-[var(--card-border)] text-[var(--muted)]"
              }`}
            >
              {city === "all" ? "All cities" : city}
            </a>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <a
              key={category}
              href={buildHref({ city: selectedCity, category, top: topOnly })}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                selectedCategory === category
                  ? "border-transparent bg-[var(--accent)] text-black"
                  : "border-[var(--card-border)] text-[var(--muted)]"
              }`}
            >
              {category === "all" ? "All categories" : category}
            </a>
          ))}
        </div>
      </section>

      <ExperiencesClient deals={deals} />
    </div>
  );
}
