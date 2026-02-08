"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExperienceDealRow } from "@/types/experiences";

const STORAGE_KEY = "tdd-saved-experiences";

const readSaved = () => {
  if (typeof window === "undefined") return {} as Record<string, ExperienceDealRow>;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as Record<string, ExperienceDealRow>;
    const parsed = JSON.parse(raw) as Record<string, ExperienceDealRow>;
    return parsed ?? {};
  } catch (error) {
    console.warn("[savedExperiences] failed to read storage", error);
    return {} as Record<string, ExperienceDealRow>;
  }
};

const writeSaved = (value: Record<string, ExperienceDealRow>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("storage"));
};

export const useSavedExperiences = () => {
  const [savedMap, setSavedMap] = useState<Record<string, ExperienceDealRow>>({});

  useEffect(() => {
    const handleSync = () => {
      setSavedMap(readSaved());
    };

    handleSync();
    window.addEventListener("storage", handleSync);
    return () => window.removeEventListener("storage", handleSync);
  }, []);

  const savedDeals = useMemo(() => Object.values(savedMap), [savedMap]);
  const savedCount = savedDeals.length;

  const isSaved = (deal: ExperienceDealRow) => Boolean(savedMap[deal.url]);

  const toggleSave = (deal: ExperienceDealRow) => {
    const next = { ...savedMap };
    if (next[deal.url]) {
      delete next[deal.url];
    } else {
      next[deal.url] = deal;
    }
    setSavedMap(next);
    writeSaved(next);
  };

  return {
    savedMap,
    savedDeals,
    savedCount,
    isSaved,
    toggleSave,
  };
};
