/** Generic placeholder shown the instant a dashboard route starts
 * navigating (see app/(dashboard)/loading.tsx) — a rough approximation of
 * "title + KPI row + table" that fits most pages well enough to make the
 * transition feel instant while the real content streams in behind it.
 * Static blocks only, no animation, no layout-affecting motion. */
export function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3" aria-hidden="true">
      <div>
        <div className="skeleton-block h-6 w-48" />
        <div className="skeleton-block mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="panel rounded-card p-4">
            <div className="skeleton-block h-3 w-20" />
            <div className="skeleton-block mt-2 h-6 w-14" />
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden rounded-card">
        <div className="flex h-9 items-center gap-6 border-b border-border px-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton-block h-3" style={{ width: 60 + (i % 3) * 20 }} />
          ))}
        </div>
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="flex h-row items-center gap-6 border-b border-border px-3 last:border-b-0">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton-block h-3" style={{ width: 50 + ((i + row) % 4) * 18 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
