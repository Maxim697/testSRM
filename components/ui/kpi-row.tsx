import { KpiCard } from "@/components/ui/kpi-card";

type KpiItem = {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  status?: "positive" | "negative" | "warning" | "info" | "neutral";
};

/** First two KPIs render larger and get more room; the rest stay compact. */
export function KpiRow({ items }: { items: KpiItem[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item, i) => (
        <KpiCard
          key={item.label}
          {...item}
          size={i < 2 ? "lg" : "md"}
          className={i < 2 ? "min-w-[200px] flex-[1.6] basis-56" : "min-w-[140px] flex-1 basis-36"}
        />
      ))}
    </div>
  );
}
