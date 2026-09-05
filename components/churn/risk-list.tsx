"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tier } from "@/components/ui/tier";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge } from "@/components/risk/risk-badge";
import { RiskFactorList } from "@/components/risk/risk-factor-list";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { RISK_LEVEL_LABELS, type RiskLevel } from "@/lib/risk-score";
import type { EnrichedTrader } from "@/lib/trader-metrics";

function AddNoteBox({ traderId, currentUserId, onDone }: { traderId: string; currentUserId: string; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("interactions").insert({
      trader_id: traderId,
      author_id: currentUserId,
      kind: "note",
      body: value.trim(),
    });
    setSaving(false);
    if (insertError) {
      setError("Не вдалося зберегти нотатку. Спробуйте ще раз.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-2 flex items-start gap-2 border-t border-border pt-2">
      <Input
        multiline
        rows={2}
        placeholder="Нотатка по трейдеру..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1"
      />
      <div className="flex shrink-0 flex-col gap-1.5">
        <Button variant="primary" className="h-8" disabled={saving || !value.trim()} onClick={handleSave}>
          {saving ? "…" : "Зберегти"}
        </Button>
        <Button variant="ghost" className="h-8" onClick={onDone}>
          Скасувати
        </Button>
      </div>
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}

export function RiskList({
  traders,
  currentUserId,
}: {
  traders: EnrichedTrader[];
  currentUserId: string;
}) {
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "">("");
  const [managerFilter, setManagerFilter] = useState("");
  const [notingId, setNotingId] = useState<string | null>(null);

  const managers = useMemo(() => {
    const set = new Map<string, string>();
    for (const t of traders) {
      if (t.manager_id && t.manager?.full_name) set.set(t.manager_id, t.manager.full_name);
    }
    return [...set.entries()];
  }, [traders]);

  const filtered = useMemo(() => {
    return traders
      .filter((t) => {
        if (levelFilter && t.risk.level !== levelFilter) return false;
        if (managerFilter && t.manager_id !== managerFilter) return false;
        return true;
      })
      .sort((a, b) => b.risk.score - a.risk.score);
  }, [traders, levelFilter, managerFilter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as RiskLevel | "")}>
          <option value="">Усі рівні ризику</option>
          {(Object.entries(RISK_LEVEL_LABELS) as [RiskLevel, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
          <option value="">Усі менеджери</option>
          {managers.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Нічого не знайдено" description="Немає трейдерів за обраними фільтрами." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((trader) => (
            <Card key={trader.id} className={cn("flex flex-col gap-2", notingId === trader.id && "gap-0")}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <RiskBadge risk={trader.risk} size="lg" showBreakdown={false} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{trader.code}</span>
                      {trader.tier && <Tier variant={trader.tier} />}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Менеджер: {trader.manager?.full_name ?? "—"} · Останній контакт:{" "}
                      {trader.lastContactAt ? formatDate(trader.lastContactAt) : "—"}
                    </div>
                    <div className="mt-1">
                      <RiskFactorList factors={trader.risk.factors} />
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setNotingId(notingId === trader.id ? null : trader.id)}
                  >
                    Додати нотатку
                  </Button>
                  <Button href={`/trader/${trader.id}`} variant="primary">
                    Відкрити картку
                  </Button>
                </div>
              </div>

              {notingId === trader.id && (
                <AddNoteBox traderId={trader.id} currentUserId={currentUserId} onDone={() => setNotingId(null)} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
