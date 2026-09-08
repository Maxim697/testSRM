"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  width?: string;
};

type SortDirection = "asc" | "desc";

const ALIGN_CLASSES: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

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
    setSort((prev) => {
      if (prev?.key !== column.key) return { key: column.key, direction: "asc" };
      if (prev.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
  }

  return (
    <div className={cn("term-panel term-corners overflow-x-auto rounded-card", className)}>
      {/* table-layout: fixed is the actual fix for the jitter bug: with the
          browser's default "auto" layout, column widths are recomputed from
          current cell content on every reflow (sort, hover, a re-render
          anywhere in the row) — any table with variable-length content in
          more than one column will visibly shift. Fixed layout locks every
          column's width from the header row alone (plus any explicit
          `width`), so cell content can never feed back into layout. */}
      <table className="w-full table-fixed border-collapse text-base">
        <thead>
          <tr className="h-row border-b border-dashed border-border">
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={cn(
                    "px-3 text-xs font-medium uppercase tracking-wide text-text-muted",
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
          {sortedData.map((row) => {
            const accent = rowAccent?.(row);
            return (
              <tr
                key={rowKey(row)}
                className={cn(
                  "group h-row border-b border-dashed border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-3",
                  rowClassName?.(row),
                )}
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
                      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
                    )}
                    {i === 0 && (
                      <span
                        className="mr-1 inline-block w-2.5 text-info opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      >
                        ▸
                      </span>
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
