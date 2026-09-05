"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function NewsForm({ authorId }: { authorId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("news").insert({
      author_id: authorId,
      title: title.trim(),
      body: body.trim() || null,
    });

    setSaving(false);

    if (insertError) {
      setError("Не вдалося опублікувати новину. Спробуйте ще раз.");
      return;
    }

    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <Card>
      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="news-title" className="mb-1.5 block text-xs text-text-secondary">
            Заголовок
          </label>
          <Input
            id="news-title"
            placeholder="Коротко про що новина"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="news-body" className="mb-1.5 block text-xs text-text-secondary">
            Текст
          </label>
          <Input
            id="news-body"
            placeholder="Деталі новини"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <Button type="submit" variant="primary" disabled={saving || !title.trim()} className="self-start">
          {saving ? "Публікація…" : "Опублікувати"}
        </Button>
      </form>
    </Card>
  );
}
