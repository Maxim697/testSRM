import type { Role } from "@/lib/roles";

export type SectionKey = "analytics" | "crm" | "platform";

export type NavItem = {
  label: string;
  href: string;
  roles?: Role[];
};

export type NavSection = {
  key: SectionKey;
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "analytics",
    title: "Аналітика",
    items: [
      { label: "Trader Detailed", href: "/trader-detailed" },
      { label: "Scoreboard", href: "/scoreboard" },
      { label: "Weekly KPI", href: "/weekly-kpi" },
    ],
  },
  {
    key: "crm",
    title: "CRM",
    items: [
      { label: "Мій день", href: "/my-day" },
      { label: "Портфель", href: "/portfolio" },
      { label: "Churn / Ризик", href: "/churn-risk" },
      { label: "Дашборд команди", href: "/team-dashboard", roles: ["lead", "admin"] },
      { label: "Тижневий звіт", href: "/weekly-report" },
      { label: "Перевірка звітів", href: "/reports-review", roles: ["lead", "admin"] },
      { label: "Завдання команді", href: "/team-tasks", roles: ["lead", "admin"] },
      { label: "Новини", href: "/news" },
    ],
  },
  {
    key: "platform",
    title: "Платформа",
    items: [
      { label: "Створити дашборд", href: "/create-dashboard" },
      { label: "Доступи", href: "/access", roles: ["lead", "admin"] },
    ],
  },
];

export function getVisibleNavSections(role: Role): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}

export function findNavItem(pathname: string): { section: NavSection; item: NavItem } | null {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { section, item };
      }
    }
  }
  return null;
}
