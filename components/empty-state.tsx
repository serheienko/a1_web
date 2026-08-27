// components/empty-state.tsx
import type { ReactNode } from "react";

export function EmptyState({ message }: { message: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
      {message}
    </div>
  );
}
