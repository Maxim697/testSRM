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
  className,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string | undefined;
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
    <div className={cn("overflow-x-auto rounded-card border border-border bg-surface-2", className)}>
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="h-row border-b border-border">
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
          {sortedData.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "h-row border-b border-border last:border-b-0 hover:bg-surface-3",
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn("px-3 text-text-primary", ALIGN_CLASSES[column.align ?? "left"])}
                >
                  {column.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
