"use client";

import { useState } from "react";
import type { ExperienceDealRow } from "@/types/experiences";
import { ExperiencesGrid } from "@/components/ExperiencesGrid";
import { useSavedExperiences } from "@/hooks/useSavedExperiences";

interface ExperiencesClientProps {
  deals: ExperienceDealRow[];
}

export function ExperiencesClient({ deals }: ExperiencesClientProps) {
  const [savedOnly, setSavedOnly] = useState(false);
  const { savedDeals, savedCount } = useSavedExperiences();

  const visibleDeals = savedOnly ? savedDeals : deals;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          Showing {visibleDeals.length} experiences {savedOnly ? "(saved)" : ""}
        </p>
        <button
          type="button"
          onClick={() => setSavedOnly((prev) => !prev)}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
            savedOnly
              ? "border-transparent bg-[var(--accent)] text-black"
              : "border-[var(--card-border)] text-[var(--muted)]"
          }`}
        >
          Saved ({savedCount})
        </button>
      </div>
      <ExperiencesGrid
        deals={visibleDeals}
        emptyState={
          savedOnly
            ? "You haven't saved any experiences yet. Tap Save on a card to keep it here."
            : "No experiences match these filters yet."
        }
      />
    </section>
  );
}
