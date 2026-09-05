"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge } from "@/components/risk/risk-badge";
import { TransferHistoryTable } from "@/components/portfolio-transfer/transfer-history-table";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import { formatNumber } from "@/lib/format";
import type { EnrichedTrader } from "@/lib/trader-metrics";
import type { PortfolioTransferWithNames, Profile } from "@/lib/types";

export function TransferForm({
  traders: initialTraders,
  managers,
  history: initialHistory,
  currentUserId,
}: {
  traders: EnrichedTrader[];
  managers: Profile[];
  history: PortfolioTransferWithNames[];
  currentUserId: string;
}) {
  const [traders, setTraders] = useState(initialTraders);
  const [history, setHistory] = useState(initialHistory);
  const [fromManagerId, setFromManagerId] = useState("");
  const [toManagerId, setToManagerId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const traderCountByManager = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of traders) {
      if (!t.manager_id) continue;
      map.set(t.manager_id, (map.get(t.manager_id) ?? 0) + 1);
    }
    return map;
  }, [traders]);

  const fromManagerTraders = useMemo(
    () => traders.filter((t) => t.manager_id === fromManagerId),
    [traders, fromManagerId],
  );

  const selectedTraders = useMemo(
    () => fromManagerTraders.filter((t) => selectedIds.has(t.id)),
    [fromManagerTraders, selectedIds],
  );

  const fromManagerName = managers.find((m) => m.id === fromManagerId)?.full_name ?? "—";
  const toManagerName = managers.find((m) => m.id === toManagerId)?.full_name ?? "—";

  function handleFromManagerChange(id: string) {
    setFromManagerId(id);
    setSelectedIds(new Set());
    setSuccessMessage(null);
  }

  function toggleTrader(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(fromManagerTraders.map((t) => t.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function handleOpenConfirm() {
    setError(null);
    setSuccessMessage(null);
    if (!fromManagerId || !toManagerId) {
      setError("Оберіть, від кого і кому передати портфель.");
      return;
    }
    if (fromManagerId === toManagerId) {
      setError("Менеджер-отримувач має відрізнятись від менеджера-джерела.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Оберіть хоча б одного трейдера для передачі.");
      return;
    }
    setConfirming(true);
  }

  async function handleConfirmTransfer() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const traderIds = [...selectedIds];

    const { error: updateError } = await supabase
      .from("traders")
      .update({ manager_id: toManagerId, previous_manager_id: fromManagerId })
      .in("id", traderIds);

    if (updateError) {
      setSubmitting(false);
      setError("Не вдалося передати портфель. Спробуйте ще раз.");
      return;
    }

    const { data: transferRow } = await supabase
      .from("portfolio_transfers")
      .insert({
        from_manager_id: fromManagerId,
        to_manager_id: toManagerId,
        initiated_by: currentUserId,
        traders_count: traderIds.length,
        reason: reason.trim() || null,
      })
      .select(
        "*, from_manager:profiles!portfolio_transfers_from_manager_id_fkey(full_name), to_manager:profiles!portfolio_transfers_to_manager_id_fkey(full_name), initiator:profiles!portfolio_transfers_initiated_by_fkey(full_name)",
      )
      .single();

    const noteBody = `Портфель передано від ${fromManagerName} до ${toManagerName}. Причина: ${reason.trim() || "не вказано"}`;

    await Promise.all([
      ...selectedTraders.map((t) =>
        logAudit(supabase, {
          actorId: currentUserId,
          action: AUDIT_ACTIONS.MANAGER_CHANGE,
          entityType: "trader",
          entityId: t.id,
          entityLabel: t.code,
          oldValue: fromManagerName,
          newValue: toManagerName,
        }),
      ),
      ...traderIds.map((id) =>
        supabase.from("interactions").insert({
          trader_id: id,
          author_id: currentUserId,
          kind: "status_change",
          body: noteBody,
        }),
      ),
    ]);

    setTraders((prev) =>
      prev.map((t) =>
        selectedIds.has(t.id)
          ? { ...t, manager_id: toManagerId, previous_manager_id: fromManagerId, manager: { full_name: toManagerName } }
          : t,
      ),
    );
    if (transferRow) {
      setHistory((prev) => [transferRow as unknown as PortfolioTransferWithNames, ...prev]);
    }

    setSubmitting(false);
    setConfirming(false);
    setSelectedIds(new Set());
    setReason("");
    setSuccessMessage(`Передано ${traderIds.length} трейдерів від ${fromManagerName} до ${toManagerName}.`);
  }

  const turnoverSum = selectedTraders.reduce((sum, t) => sum + (t.turnover_week ?? 0), 0);
  const depositSum = selectedTraders.reduce((sum, t) => sum + (t.deposit ?? 0), 0);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Від кого</label>
            <Select value={fromManagerId} onChange={(e) => handleFromManagerChange(e.target.value)}>
              <option value="">Оберіть менеджера</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? "Без імені"} ({traderCountByManager.get(m.id) ?? 0} трейдерів)
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Кому</label>
            <Select value={toManagerId} onChange={(e) => setToManagerId(e.target.value)}>
              <option value="">Оберіть менеджера</option>
              {managers
                .filter((m) => m.id !== fromManagerId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ?? "Без імені"} ({traderCountByManager.get(m.id) ?? 0} трейдерів)
                  </option>
                ))}
            </Select>
          </div>
        </div>

        {fromManagerId && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs text-text-secondary">
                Вибір трейдерів ({selectedIds.size} з {fromManagerTraders.length})
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={selectAll}>
                  Обрати всіх
                </Button>
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={deselectAll}>
                  Зняти всі
                </Button>
              </div>
            </div>
            {fromManagerTraders.length === 0 ? (
              <EmptyState title="Порожній портфель" description="У цього менеджера немає трейдерів." />
            ) : (
              <div className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-card border border-border bg-surface-1 p-2">
                {fromManagerTraders.map((t) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-control px-2 py-1.5 hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleTrader(t.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-text-primary">{t.code}</span>
                    </span>
                    <span className="flex items-center gap-3 text-xs text-text-secondary">
                      <span>Днів без контакту: {t.daysSinceContact ?? "—"}</span>
                      <RiskBadge risk={t.risk} size="sm" showBreakdown={false} />
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Причина передачі</label>
          <Input
            multiline
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Наприклад: перерозподіл навантаження, відпустка менеджера..."
          />
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}
        {successMessage && <p className="text-sm text-positive">{successMessage}</p>}

        <div className="flex justify-end">
          <Button variant="primary" onClick={handleOpenConfirm}>
            Передати
          </Button>
        </div>
      </Card>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Підтвердження передачі">
        <div className="flex flex-col gap-3">
          <p className="text-base text-text-primary">
            Передати <span className="font-medium">{selectedTraders.length}</span> трейдерів від{" "}
            <span className="font-medium">{fromManagerName}</span> до{" "}
            <span className="font-medium">{toManagerName}</span>?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-control border border-border bg-surface-1 p-2.5">
              <div className="text-xs text-text-secondary">Сумарний оборот за тиждень</div>
              <div className="text-lg font-semibold tabular-nums text-text-primary">{formatNumber(turnoverSum)}</div>
            </div>
            <div className="rounded-control border border-border bg-surface-1 p-2.5">
              <div className="text-xs text-text-secondary">Сумарний депозит</div>
              <div className="text-lg font-semibold tabular-nums text-text-primary">{formatNumber(depositSum)}</div>
            </div>
          </div>
          {error && <p className="text-sm text-negative">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={submitting} onClick={() => setConfirming(false)}>
              Скасувати
            </Button>
            <Button variant="primary" disabled={submitting} onClick={handleConfirmTransfer}>
              {submitting ? "Передача…" : "Підтвердити"}
            </Button>
          </div>
        </div>
      </Modal>

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Історія передач</h2>
        {history.length === 0 ? (
          <EmptyState title="Передач ще не було" description="Тут з'явиться історія переданих портфелів." />
        ) : (
          <TransferHistoryTable history={history} />
        )}
      </div>
    </div>
  );
}
