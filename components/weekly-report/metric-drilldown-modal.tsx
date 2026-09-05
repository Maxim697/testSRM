"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";

export type DrilldownItem = {
  id: string;
  label: string;
  meta?: string;
  href?: string;
};

export function MetricDrilldownModal({
  open,
  onClose,
  title,
  items,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: DrilldownItem[];
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {items.length === 0 ? (
        <EmptyState title="Порожньо" description="Немає записів, що формують це значення." />
      ) : (
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex h-row items-center justify-between gap-3 rounded-control px-2 hover:bg-surface-3"
            >
              {item.href ? (
                <Link href={item.href} className="font-medium text-info hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className="text-text-primary">{item.label}</span>
              )}
              {item.meta && <span className="tabular-nums text-text-secondary">{item.meta}</span>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
