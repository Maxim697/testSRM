"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials, roleLabel } from "@/lib/roles";
import type { Profile } from "@/lib/types";

export function UserCard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="shrink-0 border-t border-border p-2">
      <div className="flex items-center gap-2.5 rounded-control px-2 py-1.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-medium text-text-primary">
          {getInitials(profile.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-tight text-text-primary">
            {profile.full_name ?? "Без імені"}
          </div>
          <div className="truncate text-xs text-text-secondary">
            {roleLabel(profile.role)}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="shrink-0 rounded-control px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary disabled:opacity-50"
        >
          {loggingOut ? "…" : "Вийти"}
        </button>
      </div>
    </div>
  );
}
