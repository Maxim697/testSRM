"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { TAB_SWITCH } from "@/lib/motion";

/** Cross-fades to new content whenever `id` changes — the trader detail
 * page's tab content, and anywhere else that swaps a whole block of
 * content in place rather than a list growing/shrinking. `mode="wait"`
 * so the old content finishes fading out before the new one starts (no
 * overlap, no layout jump from two panels stacking momentarily). */
export function FadeSwitch({ id, children }: { id: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div key={id}>{children}</div>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: TAB_SWITCH.duration }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
