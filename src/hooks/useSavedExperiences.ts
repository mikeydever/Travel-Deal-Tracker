"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ExperienceDealRow } from "@/types/experiences";

const STORAGE_KEY = "tdd-saved-experiences";
const SAVED_EVENT = "tdd-saved-experiences-change";

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
  window.dispatchEvent(new Event(SAVED_EVENT));
};

const subscribe = (callback: () => void) => {
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(SAVED_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SAVED_EVENT, handler);
  };
};

const getSnapshot = () => readSaved();
const getServerSnapshot = () => ({} as Record<string, ExperienceDealRow>);

export const useSavedExperiences = () => {
  const savedMap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
