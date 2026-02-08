"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "tdd-theme";

const getSystemTheme = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

const THEME_EVENT = "tdd-theme-change";

const subscribe = (callback: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => callback();
  media.addEventListener("change", handler);
  window.addEventListener("storage", handler);
  window.addEventListener(THEME_EVENT, handler);
  return () => {
    media.removeEventListener("change", handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener(THEME_EVENT, handler);
  };
};

const getSnapshot = (): Theme => {
  const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? null;
  return stored ?? getSystemTheme();
};

const getServerSnapshot = (): Theme => "light";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(THEME_EVENT));
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={theme === "dark"}
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] shadow-sm transition hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${className}`}
    >
      <span className="text-[10px]">{theme === "dark" ? "Night" : "Day"}</span>
      <span className="h-2.5 w-10 rounded-full bg-[var(--accent-soft)]/70">
        <span
          className={`block h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[var(--shadow-soft)] transition-transform ${
            theme === "dark" ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
