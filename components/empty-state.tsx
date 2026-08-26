// components/empty-state.tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-neutral-500">
      {message}
    </div>
  );
}
