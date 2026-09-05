"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@/components/ui/tier";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Sparkline } from "@/components/ui/sparkline";
import { formatNumber } from "@/lib/format";
import type { TraderTier } from "@/lib/types";

const EXAMPLES = [
  "Динаміка score по трейдерах за 12 тижнів",
  "Рейтинг трейдерів за оборотом і CR",
  "Трейдери без контакту більше 5 днів",
  "Розподіл портфеля за tier і статусом",
];

type DataSource = { value: string; label: string; count: number };
type TopTrader = { id: string; code: string; score: number | null; tier: TraderTier | null };
type DemoData = {
  avgScore: number;
  lastWeekTurnover: number;
  tierCounts: { gold: number; silver: number; bronze: number };
  topTraders: TopTrader[];
  scoreTrend: { weekStart: string; score: number }[];
};

export function CreateDashboardView({
  dataSources,
  demoData,
}: {
  dataSources: DataSource[];
  demoData: DemoData;
}) {
  const [built, setBuilt] = useState(false);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState(dataSources[0]?.value ?? "");
  const [stubMessage, setStubMessage] = useState<string | null>(null);

  if (built) {
    const topColumns: DataTableColumn<TopTrader>[] = [
      { key: "code", header: "Trader", accessor: (t) => t.code },
      { key: "tier", header: "Tier", accessor: (t) => (t.tier ? <Tier variant={t.tier} /> : "—") },
      {
        key: "score",
        header: "Score",
        accessor: (t) => <span className="tabular-nums">{t.score ?? "—"}</span>,
        align: "right",
      },
    ];

    return (
      <div className="flex flex-1 flex-col gap-3">
        <Card className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-base text-text-primary">{query || "(без опису)"}</div>
            <div className="mt-0.5 text-xs text-text-muted">Витрина: {source}</div>
          </div>
          <Button variant="secondary" className="shrink-0" onClick={() => setBuilt(false)}>
            Змінити запит
          </Button>
        </Card>

        <p className="text-sm text-text-secondary">Підібрано 5 блоків з бібліотеки</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <KpiCard label="Середній score по портфелю" value={demoData.avgScore.toString()} />
            <div className="mt-1 text-xs text-text-muted">Блок: KpiCard · traders</div>
          </div>
          <div>
            <KpiCard label="Оборот за останній тиждень" value={formatNumber(demoData.lastWeekTurnover)} />
            <div className="mt-1 text-xs text-text-muted">Блок: KpiCard · trader_weekly</div>
          </div>
        </div>

        <Card>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Динаміка середнього score
          </div>
          <Sparkline values={demoData.scoreTrend.map((w) => w.score)} />
          <div className="mt-2 text-xs text-text-muted">Блок: Sparkline · trader_weekly</div>
        </Card>

        <Card>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Топ-5 за score</div>
          <DataTable columns={topColumns} data={demoData.topTraders} rowKey={(t) => t.id} />
          <div className="mt-2 text-xs text-text-muted">Блок: DataTable · traders</div>
        </Card>

        <Card>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Розподіл за tier</div>
          <div className="flex gap-2">
            <Badge variant="neutral">Gold: {demoData.tierCounts.gold}</Badge>
            <Badge variant="neutral">Silver: {demoData.tierCounts.silver}</Badge>
            <Badge variant="neutral">Bronze: {demoData.tierCounts.bronze}</Badge>
          </div>
          <div className="mt-2 text-xs text-text-muted">Блок: Badge · traders</div>
        </Card>

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setStubMessage("Функція в розробці — збереження у воркспейс з'явиться пізніше.")}>
            Зберегти у воркспейс
          </Button>
          <Button variant="secondary" onClick={() => setStubMessage("Функція в розробці — керування доступом з'явиться пізніше.")}>
            Налаштувати доступ
          </Button>
        </div>
        {stubMessage && <p className="text-xs text-text-muted">{stubMessage}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Card>
        <label className="mb-1.5 block text-xs text-text-secondary">Опишіть дашборд, який потрібен</label>
        <Input multiline rows={4} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Наприклад: покажи динаміку score по трейдерах за 12 тижнів..." />
        <p className="mt-2 text-xs text-text-muted">
          Claude збере його з блоків UI Kit — єдиний вигляд для всіх команд
        </p>
      </Card>

      <Card>
        <label className="mb-1.5 block text-xs text-text-secondary">Витрина даних</label>
        <Select value={source} onChange={(e) => setSource(e.target.value)} className="max-w-sm">
          {dataSources.map((ds) => (
            <option key={ds.value} value={ds.value}>
              {ds.label} ({ds.count} рядків)
            </option>
          ))}
        </Select>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {EXAMPLES.map((example) => (
          <Card
            key={example}
            className="cursor-pointer text-base text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
            onClick={() => setQuery(example)}
          >
            {example}
          </Card>
        ))}
      </div>

      <Button variant="primary" className="self-start" disabled={!query.trim()} onClick={() => setBuilt(true)}>
        Зібрати дашборд
      </Button>
    </div>
  );
}
