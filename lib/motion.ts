/**
 * Central Motion (motion/react) timing table — every duration, delay,
 * offset and spring used anywhere Motion is applied in this app lives
 * here, so the whole feel can be retuned from one place. Never hardcode
 * a duration/ease/spring at a call site; import from here instead.
 *
 * Scope reminder (see the components that import this): table rows, KPI
 * numbers, charts, and the sidebar/header stay on plain CSS — Motion is
 * for cards, modals, dropdowns, tab switches, inline expand/collapse,
 * and the notification panel only.
 */

/** List-item entrance stagger (trader/manager/news/task cards). */
export const LIST_ITEM = {
  /** Rise-in distance, px. */
  y: 8,
  /** Per-item entrance duration. */
  duration: 0.2,
  /** Delay step between consecutive items. */
  staggerStep: 0.03,
  /** Items beyond this index all animate together, no further delay —
   * a long list shouldn't make row 40 wait 1.2s to appear. */
  staggerCap: 15,
  ease: "easeOut",
} as const;

/** AnimatePresence exit for a removed list item (task/notification/record). */
export const LIST_ITEM_EXIT = {
  duration: 0.15,
  ease: "easeOut",
} as const;

/** Modal and dropdown/listbox surfaces. */
export const OVERLAY = {
  scaleFrom: 0.96,
  enterDuration: 0.18,
  exitDuration: 0.12,
  backdropDuration: 0.15,
} as const;

/** Inline block expand/collapse (height animation) — comment boxes,
 * anything that grows a card open in place. */
export const EXPAND = {
  duration: 0.25,
  ease: "easeInOut",
} as const;

/** Tab content swap (fade only, no movement). */
export const TAB_SWITCH = {
  duration: 0.12,
} as const;

/** Notification panel / toast entrance. */
export const NOTIFICATION = {
  y: -8,
  duration: 0.2,
} as const;

/** One "soft" spring shared by every spring-based transition (modals,
 * dropdowns, the notification panel) — duration-based (not stiffness/
 * damping) specifically so it can be combined with a per-site `duration`
 * (e.g. `{ ...SOFT_SPRING, duration: OVERLAY.enterDuration }`) and still
 * land on that exact time; a low `bounce` keeps the overshoot gentle
 * rather than springy. */
export const SOFT_SPRING = {
  type: "spring",
  bounce: 0.2,
} as const;
