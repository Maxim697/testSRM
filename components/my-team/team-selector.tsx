"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import type { Team } from "@/lib/types";

export function TeamSelector({ teams, selectedTeamId }: { teams: Team[]; selectedTeamId: string }) {
  const router = useRouter();

  return (
    <Select
      value={selectedTeamId}
      onChange={(e) => router.push(`/my-team?team=${e.target.value}`)}
      className="w-56"
    >
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </Select>
  );
}
