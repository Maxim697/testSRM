"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { TeamStructureView } from "@/components/access/team-structure-view";
import { AccessMatrix } from "@/components/access/access-matrix";
import type { Profile, Team } from "@/lib/types";
import type { Role } from "@/lib/roles";

const TABS = [
  { label: "Структура", value: "structure" },
  { label: "Матриця доступу", value: "matrix" },
];

export function AccessTabs({
  teams,
  profiles,
  traderCounts,
  currentUserId,
  currentUserRole,
}: {
  teams: Team[];
  profiles: Profile[];
  traderCounts: Record<string, number>;
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [tab, setTab] = useState("structure");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Tabs items={TABS} value={tab} onValueChange={setTab} />
      {tab === "structure" ? (
        <TeamStructureView
          teams={teams}
          profiles={profiles}
          traderCounts={traderCounts}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      ) : (
        <AccessMatrix />
      )}
    </div>
  );
}
