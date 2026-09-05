"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReportDraftResponse } from "@/lib/report-draft-types";

export function DraftAssistant({
  reportId,
  editable,
  hasSuggestions,
  onDraftLoaded,
  onApplyAll,
}: {
  reportId: string;
  editable: boolean;
  hasSuggestions: boolean;
  onDraftLoaded: (draft: ReportDraftResponse) => void;
  onApplyAll: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report_id: reportId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError((payload && typeof payload.error === "string" && payload.error) || "Не вдалося згенерувати чернетку.");
        return;
      }
      onDraftLoaded(payload as ReportDraftResponse);
    } catch {
      setError("Не вдалося з'єднатися із сервером. Перевірте з'єднання і спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  if (!editable) return null;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={loading} onClick={handleGenerate}>
          {loading ? "Збираємо чернетку…" : "Зібрати чернетку через Claude"}
        </Button>
        {hasSuggestions && (
          <Button variant="primary" onClick={onApplyAll}>
            Застосувати все
          </Button>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Чернетка згенерована на основі даних за тиждень. Перевірте формулювання перед відправкою.
      </p>
      {error && <p className="text-sm text-negative">{error}</p>}
    </Card>
  );
}
