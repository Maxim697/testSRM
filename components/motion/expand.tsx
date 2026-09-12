"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EXPAND } from "@/lib/motion";

/** Animates a block open/closed by height — the "add a comment" reveal
 * on a task row or risk card, the manager-traders view where it's
 * genuinely an inline block rather than a modal. Always mount this
 * (don't conditionally render the whole component); `open` controls
 * whether `children` is present, and AnimatePresence handles the height
 * collapse on the way out instead of an instant unmount. */
export function Expand({ open, children }: { open: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return open ? <>{children}</> : null;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: EXPAND.duration, ease: EXPAND.ease }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
