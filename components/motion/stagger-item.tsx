"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { LIST_ITEM, LIST_ITEM_EXIT } from "@/lib/motion";

/** One entry in a staggered-entrance list — trader/manager/news/task
 * cards. Wrap each item with this (inside a plain `<div className="flex
 * flex-col gap-2">` or a grid, same as before) and pass its position in
 * the list as `index`.
 *
 * Also works as an AnimatePresence exit target: if the parent list is
 * wrapped in `<AnimatePresence>` and items are removed from the array
 * that produces them, this collapses (opacity + height) instead of
 * disappearing instantly — see EXIT for the shared 150ms timing.
 *
 * Never use this inside a table — DataTable rows stay on the existing
 * CSS stagger (see components/ui/data-table.tsx); Motion's layout
 * animations are exactly what caused the table jitter that was fixed
 * before, and this component doesn't set `layout`, but a table row
 * still isn't the right host for it.
 */
export function StaggerItem({
  index,
  children,
  ...props
}: { index: number } & HTMLMotionProps<"div">) {
  const reduceMotion = useReducedMotion();
  const delay = index < LIST_ITEM.staggerCap ? index * LIST_ITEM.staggerStep : 0;

  // `initial={false}` (rather than branching to a plain <div>) skips the
  // enter animation entirely for reduced-motion users while keeping a
  // single motion.div — no animation at all, not even an instant fade,
  // matching how every CSS-based entrance elsewhere in this app already
  // respects the setting.
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: LIST_ITEM.y }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: LIST_ITEM.duration, delay, ease: LIST_ITEM.ease }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Re-exported so call sites that need the exit-only timing (e.g. a
 * custom AnimatePresence item that isn't a StaggerItem) don't have to
 * reach into lib/motion directly. */
export { LIST_ITEM_EXIT };
