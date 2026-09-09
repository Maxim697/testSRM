import type { SVGProps } from "react";

/** Thin 16px line icons for the sidebar, one per nav item (keyed by href).
 * Consistent stroke style throughout: 1.5px, round caps/joins, no fill —
 * matches the rest of the interface's restrained, non-decorative look. */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="5.2" r="2.7" />
      <path d="M2.8 14c.6-2.7 2.7-4.3 5.2-4.3s4.6 1.6 5.2 4.3" />
    </svg>
  );
}

function BarChartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 13.5V7.5M8 13.5V2.5M13 13.5V9.5" />
    </svg>
  );
}

function TrendingUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 11.5 6.3 7.7l2.3 2.3 4.9-4.9" />
      <path d="M10.5 5h3v3" />
    </svg>
  );
}

function SunIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="2.8" />
      <path d="M8 1.8v1.4M8 12.8v1.4M2.6 8H4M12 8h1.4M4.2 4.2l1 1M10.8 10.8l1 1M4.2 11.8l1-1M10.8 5.2l1-1" />
    </svg>
  );
}

function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="5.3" width="12" height="8" rx="1.4" />
      <path d="M5.6 5.3V4a1.4 1.4 0 0 1 1.4-1.4h2A1.4 1.4 0 0 1 10.4 4v1.3" />
      <path d="M2 9.3h12" />
    </svg>
  );
}

function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 2.6 14.2 13H1.8Z" />
      <path d="M8 6.6v2.9" />
      <circle cx="8" cy="11.2" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="5" r="2.2" />
      <path d="M1.8 13.2c.5-2.3 2.2-3.7 4.2-3.7s3.7 1.4 4.2 3.7" />
      <path d="M10.4 3.2c1 .2 1.8 1.1 1.8 2.2 0 1.1-.7 1.9-1.7 2.2" />
      <path d="M11.4 9.7c1.6.4 2.7 1.6 3 3.5" />
    </svg>
  );
}

function FileTextIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 1.8h5.4L12 4.4v9.8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1Z" />
      <path d="M9.2 1.8v2.8H12" />
      <path d="M4.6 8h5.4M4.6 10.4h5.4M4.6 5.6h2" />
    </svg>
  );
}

function CheckSquareIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5.2 8.1 7.3 10.2 10.9 5.9" />
    </svg>
  );
}

function ListChecksIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 3.7 3 4.7 5.2 2.5" />
      <path d="M2 8.3 3 9.3l2.2-2.2" />
      <path d="M2 12.9l1 1 2.2-2.2" />
      <path d="M7.6 3.2h6.4M7.6 8h6.4M7.6 12.8h6.4" />
    </svg>
  );
}

function RepeatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.6 7.4V6a2.6 2.6 0 0 1 2.6-2.6h6.7" />
      <path d="M9.9 1.4l2 2-2 2" />
      <path d="M13.4 8.6V10a2.6 2.6 0 0 1-2.6 2.6H4.1" />
      <path d="M6.1 14.6l-2-2 2-2" />
    </svg>
  );
}

function NewsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="1.8" y="3.2" width="9.4" height="9.6" rx="1.2" />
      <path d="M11.2 5.8h1.4a1.6 1.6 0 0 1 1.6 1.6v4.4a1.6 1.6 0 0 1-1.6 1.6H5.4" />
      <path d="M4 6h5M4 8.4h5M4 10.8h3" />
    </svg>
  );
}

function LayoutGridIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 1.8 13.4 4v4.1c0 3.4-2.3 5.6-5.4 6.6-3.1-1-5.4-3.2-5.4-6.6V4Z" />
      <path d="M5.6 8 7.3 9.6l3.1-3.4" />
    </svg>
  );
}

function HistoryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 8a5.5 5.5 0 1 0 1.7-4" />
      <path d="M2 1.8v2.2h2.2" />
      <path d="M8 5v3.2l2.2 1.3" />
    </svg>
  );
}

export const NAV_ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  "/trader-detailed": UserIcon,
  "/scoreboard": BarChartIcon,
  "/weekly-kpi": TrendingUpIcon,
  "/my-day": SunIcon,
  "/portfolio": BriefcaseIcon,
  "/churn-risk": AlertTriangleIcon,
  "/team-dashboard": UsersIcon,
  "/weekly-report": FileTextIcon,
  "/reports-review": CheckSquareIcon,
  "/team-tasks": ListChecksIcon,
  "/portfolio-transfer": RepeatIcon,
  "/news": NewsIcon,
  "/create-dashboard": LayoutGridIcon,
  "/access": ShieldIcon,
  "/audit": HistoryIcon,
};
