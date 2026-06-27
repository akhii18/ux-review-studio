"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold">Application error</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A critical rendering error occurred.
            </p>
            <button
              onClick={reset}
              className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
