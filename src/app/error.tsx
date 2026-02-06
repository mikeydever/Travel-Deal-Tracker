"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-md rounded-3xl border border-[var(--card-border)] bg-white/90 p-8 text-center shadow-[var(--glow)]">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">We lost the travel feed</h1>
        <p className="mt-2 text-sm text-slate-600">
          The dashboard couldn’t load. Try reloading the page or come back in a few moments.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
