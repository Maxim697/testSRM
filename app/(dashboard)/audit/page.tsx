import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { AuditLogWithActor, Profile } from "@/lib/types";

export default async function AuditPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Історія змін" description="Аудит дій у системі" />
        <EmptyState
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const supabase = await createClient();
  const [logsRes, usersRes] = await Promise.all([
    supabase.from("audit_log").select("*, actor:profiles(full_name)").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, telegram, role").order("full_name"),
  ]);

  return (
    <>
      <PageHeader title="Історія змін" description="Аудит дій у системі" />
      <AuditLogTable
        logs={(logsRes.data ?? []) as unknown as AuditLogWithActor[]}
        users={(usersRes.data ?? []) as Profile[]}
      />
    </>
  );
}
