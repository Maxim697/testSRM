import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldIcon } from "@/components/ui/empty-icons";
import type { ManagerCard } from "@/lib/my-team";
import type { EnrichedTrader } from "@/lib/trader-metrics";

// Below this many contacts in the current week, a manager reads as
// "quiet" — not itself a violation of anything, just worth a lead's
// glance. No stored threshold anywhere to derive this from, so it's a
// plain, documented constant rather than a computed one.
const LOW_CONTACTS_THRESHOLD = 3;

type Section = {
  key: string;
  title: string;
  chips: { key: string; label: string; href: string }[];
};

/** Every chip links back into the same page (anchored to the relevant
 * manager card) or out to the trader's own page — "перехід до потрібного
 * місця" without needing separate page/modal plumbing for what's really
 * just a filtered view of the manager cards already on screen. */
export function AttentionList({
  managers,
  criticalTraders,
}: {
  managers: ManagerCard[];
  criticalTraders: EnrichedTrader[];
}) {
  const sections: Section[] = [
    {
      key: "no-report",
      title: "Менеджери без звіту за поточний тиждень",
      chips: managers
        .filter((m) => m.reportStatus === "none")
        .map((m) => ({ key: m.id, label: m.fullName, href: `#manager-${m.id}` })),
    },
    {
      key: "overdue",
      title: "Менеджери з простроченими завданнями",
      chips: managers
        .filter((m) => m.tasksOverdue > 0)
        .map((m) => ({ key: m.id, label: `${m.fullName} (${m.tasksOverdue})`, href: `#manager-${m.id}` })),
    },
    {
      key: "high-risk-portfolio",
      title: "Менеджери з понад 3 трейдерами у ризику",
      chips: managers
        .filter((m) => m.riskCount > 3)
        .map((m) => ({ key: m.id, label: `${m.fullName} (${m.riskCount})`, href: `#manager-${m.id}` })),
    },
    {
      key: "critical-traders",
      title: "Трейдери команди в критичному ризику",
      chips: criticalTraders.map((t) => ({ key: t.id, label: t.code, href: `/trader/${t.id}` })),
    },
    {
      key: "low-contacts",
      title: "Менеджери з низькою кількістю контактів за тиждень",
      chips: managers
        .filter((m) => m.contactsThisWeek < LOW_CONTACTS_THRESHOLD)
        .map((m) => ({ key: m.id, label: `${m.fullName} (${m.contactsThisWeek})`, href: `#manager-${m.id}` })),
    },
  ].filter((s) => s.chips.length > 0);

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={<ShieldIcon />}
        title="Усе спокійно"
        description="Немає нічого, що потребувало б втручання прямо зараз."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => (
        <div key={section.key}>
          <div className="field-label mb-1.5">{section.title}</div>
          <div className="flex flex-wrap gap-1.5">
            {section.chips.map((chip) => (
              <Link
                key={chip.key}
                href={chip.href}
                className="rounded-control bg-negative-bg px-2 py-1 text-xs text-negative hover:underline"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
