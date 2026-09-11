"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  /** Explicit column width (e.g. "48px", "18%"). Columns that omit this get
   * an equal share of the space left after explicit-width columns — every
   * column ends up with a real, explicit width either way, since that's
   * what table-layout: fixed needs to actually ignore cell content. */
  width?: string;
};

type SortDirection = "asc" | "desc";

const ALIGN_CLASSES: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/** Fills in a width for every column that didn't specify one, splitting the
 * remaining percentage evenly. Columns with a px width are left alone (the
 * browser reserves that fixed amount regardless); the percentage math below
 * is a best-effort distribution of the rest, not a hard 100% guarantee when
 * px and % widths are mixed — table-layout: fixed still renders correctly
 * either way, it just means the un-widthed columns share what's left over. */
function resolveColumnWidths<T>(columns: DataTableColumn<T>[]): string[] {
  const unspecifiedCount = columns.filter((c) => !c.width).length;
  if (unspecifiedCount === 0) return columns.map((c) => c.width!);

  const claimedPercent = columns.reduce((sum, c) => {
    if (c.width?.endsWith("%")) return sum + parseFloat(c.width);
    return sum;
  }, 0);
  const fallbackPercent = Math.max(0, (100 - claimedPercent) / unspecifiedCount);

  return columns.map((c) => c.width ?? `${fallbackPercent}%`);
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowClassName,
  rowAccent,
  className,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string | undefined;
  /** CSS color for a left accent stripe on problem rows (high risk, overdue, etc.) */
  rowAccent?: (row: T) => string | undefined;
  className?: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);

  const columnWidths = useMemo(() => resolveColumnWidths(columns), [columns]);

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return data;
    const sorted = [...data].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [data, columns, sort]);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) return;
    // Sorting only ever reorders `sortedData` — it never touches `columns`
    // or `columnWidths`, so the fixed column widths below are completely
    // unaffected by this state change.
    setSort((prev) => {
      if (prev?.key !== column.key) return { key: column.key, direction: "asc" };
      if (prev.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
  }

  return (
    // Fixed-width container: the table itself is w-full *of this box*, and
    // this box's own width is whatever its layout parent gives it — never
    // recomputed from the table's content. Overflow scrolls inside this
    // box; the box itself never grows or shrinks to fit the table.
    <div className={cn("panel w-full max-w-full overflow-x-auto rounded-card", className)}>
      {/* table-layout: fixed is the actual fix for the jitter bug: with the
          browser's default "auto" layout, column widths are recomputed from
          current cell content on every reflow (sort, hover, a re-render
          anywhere in the row) — any table with variable-length content in
          more than one column will visibly shift. Fixed layout ignores
          cell content for sizing entirely — column widths come only from
          the <colgroup> below, resolved once per `columns` identity. */}
      <table className="w-full table-fixed border-collapse text-base">
        <colgroup>
          {columns.map((column, i) => (
            <col key={column.key} style={{ width: columnWidths[i] }} />
          ))}
        </colgroup>
        <thead>
          <tr className="h-row border-b border-border">
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  className={cn(
                    "overflow-hidden text-ellipsis whitespace-nowrap px-3 text-xs font-medium text-text-muted",
                    ALIGN_CLASSES[column.align ?? "left"],
                    column.sortValue && "cursor-pointer select-none hover:text-text-secondary",
                  )}
                  onClick={() => toggleSort(column)}
                >
                  {column.header}
                  {isSorted && (sort?.direction === "asc" ? " ↑" : " ↓")}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => {
            const accent = rowAccent?.(row);
            return (
              <tr
                key={rowKey(row)}
                className={cn(
                  "h-row row-enter border-b border-border last:border-b-0 hover:bg-row-hover",
                  rowClassName?.(row),
                )}
                // Staggered entrance, capped at the first 20 rows — past
                // that a long table would just keep making later rows
                // wait longer and longer for no real benefit, so row 21+
                // all appear together with row 20 instead of queuing
                // further behind it.
                style={index < 20 ? { animationDelay: `${index * 12}ms` } : undefined}
              >
                {columns.map((column, i) => (
                  <td
                    key={column.key}
                    className={cn(
                      "overflow-hidden text-ellipsis whitespace-nowrap px-3 text-text-primary tabular-nums",
                      i === 0 && "relative",
                      ALIGN_CLASSES[column.align ?? "left"],
                    )}
                  >
                    {i === 0 && accent && (
                      <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full" style={{ background: accent }} />
                    )}
                    {column.accessor(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
