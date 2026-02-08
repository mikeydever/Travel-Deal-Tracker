import { NavPills } from "@/components/NavPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getItinerarySuggestions } from "@/data/itineraries";

export const dynamic = "force-dynamic";

const makeWindowKey = (row: { window_start: string; window_end: string }) =>
  `${row.window_start}_${row.window_end}`;

const parseWindowKey = (key: string) => {
  const [start, end] = key.split("_");
  return { start, end };
};

const formatWindow = (start: string, end: string) => {
  const format = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric" });
  return `${format(start)} – ${format(end)}`;
};

export default async function ItineraryPage({
  searchParams,
}: {
  searchParams?: { window?: string; duration?: string };
}) {
  const suggestions = await getItinerarySuggestions();
  const windows = Array.from(
    new Map(
      suggestions.map((row) => [makeWindowKey(row), row])
    ).values()
  );

  const selectedWindowKey = searchParams?.window ?? makeWindowKey(windows[0]);
  const durationFromQuery = Number(searchParams?.duration ?? "");

  const availableForWindow = suggestions.filter(
    (row) => makeWindowKey(row) === selectedWindowKey
  );
  const durations = Array.from(new Set(availableForWindow.map((row) => row.duration_days))).sort(
    (a, b) => a - b
  );
  const selectedDuration = durations.includes(durationFromQuery)
    ? durationFromQuery
    : durations[0];

  const itinerary =
    availableForWindow.find((row) => row.duration_days === selectedDuration) ??
    availableForWindow[0];

  const windowParams = parseWindowKey(selectedWindowKey);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--glow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--muted)]">Itinerary</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl font-[var(--font-display)]">
              Suggested trip rhythms
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--muted)]">
              Hybrid scoring blends flight + hotel momentum with experience density to suggest the best
              windows.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <ThemeToggle />
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--sand)]/40 px-6 py-4 text-sm text-[var(--muted)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Window score</p>
              <p className="text-3xl font-semibold text-[var(--foreground)]">
                {itinerary?.score ? itinerary.score.toFixed(0) : "--"}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">Auto-generated daily.</p>
            </div>
          </div>
        </div>
        <NavPills className="mt-8" />
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Windows</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {formatWindow(windowParams.start, windowParams.end)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{itinerary?.summary ?? ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {windows.map((window) => {
              const key = makeWindowKey(window);
              return (
                <a
                  key={key}
                  href={`/itinerary?window=${key}&duration=${selectedDuration}`}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    key === selectedWindowKey
                      ? "border-transparent bg-[var(--accent)] text-black"
                      : "border-[var(--card-border)] text-[var(--muted)]"
                  }`}
                >
                  {formatWindow(window.window_start, window.window_end)}
                </a>
              );
            })}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {durations.map((duration) => (
            <a
              key={duration}
              href={`/itinerary?window=${selectedWindowKey}&duration=${duration}`}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                duration === selectedDuration
                  ? "border-transparent bg-[var(--accent)] text-black"
                  : "border-[var(--card-border)] text-[var(--muted)]"
              }`}
            >
              {duration}-day
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        {itinerary?.days?.map((day) => (
          <article
            key={`${itinerary.id}-${day.day}`}
            className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Day {day.day}</p>
                {day.title ? (
                  <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{day.title}</h3>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">Morning</p>
                <p className="text-sm text-[var(--foreground)]">{day.morning}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">Afternoon</p>
                <p className="text-sm text-[var(--foreground)]">{day.afternoon}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">Evening</p>
                <p className="text-sm text-[var(--foreground)]">{day.evening}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
