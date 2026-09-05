import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AccessMatrix } from "@/components/access/access-matrix";
import { UsersTable } from "@/components/access/users-table";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function AccessPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Доступи" description="Керування ролями та правами доступу" />
        <EmptyState
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, telegram, role")
    .order("full_name");

  const users = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader title="Доступи" description="Керування ролями та правами доступу" />
      <AccessMatrix />
      <UsersTable users={users} />
    </>
  );
}
