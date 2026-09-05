import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsForm } from "@/components/news/news-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { roleLabel } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";
import type { NewsWithAuthor } from "@/lib/types";

export default async function NewsPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select("*, author:profiles(full_name, role)")
    .order("created_at", { ascending: false });

  const news = (data ?? []) as unknown as NewsWithAuthor[];
  const canPublish = current.profile.role === "lead" || current.profile.role === "admin";

  return (
    <>
      <PageHeader title="Новини" description="Оновлення та повідомлення компанії" />

      {canPublish ? (
        <NewsForm authorId={current.userId} />
      ) : (
        <Card className="text-base text-text-secondary">
          Публікація новин доступна тім-лідам та адміністраторам.
        </Card>
      )}

      {news.length === 0 ? (
        <EmptyState title="Новин ще немає" description="Тут з'являться оновлення від команди." />
      ) : (
        <div className="flex flex-col gap-2">
          {news.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-text-primary">
                    {item.author?.full_name ?? "—"}
                  </span>
                  {item.author?.role && <Badge variant="neutral">{roleLabel(item.author.role)}</Badge>}
                </div>
                <span className="text-xs text-text-muted">{formatDateTime(item.created_at)}</span>
              </div>
              <div className="mt-2 text-base font-semibold text-text-primary">{item.title}</div>
              {item.body && <p className="mt-1 text-base text-text-secondary">{item.body}</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
