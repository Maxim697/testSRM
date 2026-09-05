export type SectionKey = "analytics" | "crm" | "platform";

export type NavItem = {
  label: string;
  href: string;
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
      { label: "Тижневий звіт", href: "/weekly-report" },
      { label: "Новини", href: "/news" },
    ],
  },
  {
    key: "platform",
    title: "Платформа",
    items: [
      { label: "Створити дашборд", href: "/create-dashboard" },
      { label: "Доступи", href: "/access" },
    ],
  },
];

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
