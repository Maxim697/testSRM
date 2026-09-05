import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InboxIcon, ShieldIcon } from "@/components/ui/empty-icons";
import { ReportsReviewList } from "@/components/reports-review/reports-review-list";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Profile, WeeklyReportWithAuthor } from "@/lib/types";

export default async function ReportsReviewPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Перевірка звітів" description="Тижневі звіти менеджерів" />
        <EmptyState
          icon={<ShieldIcon />}
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const supabase = await createClient();
  const [reportsRes, managersRes] = await Promise.all([
    supabase
      .from("weekly_reports")
      .select("*, author:profiles!weekly_reports_author_id_fkey(full_name)")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, telegram, role").eq("role", "manager"),
  ]);

  const reports = (reportsRes.data ?? []) as unknown as WeeklyReportWithAuthor[];
  const managers = (managersRes.data ?? []) as Profile[];

  return (
    <>
      <PageHeader title="Перевірка звітів" description="Тижневі звіти менеджерів" />
      {reports.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title="Звітів ще немає"
          description="Тут з'являться звіти, щойно менеджери їх створять."
        />
      ) : (
        <ReportsReviewList reports={reports} managers={managers} currentUserId={current.userId} />
      )}
    </>
  );
}
