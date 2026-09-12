"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { OVERLAY, SOFT_SPRING } from "@/lib/motion";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  // Modal is typically mounted unconditionally by its parent (only `open`
  // toggles) so AnimatePresence has something stable to animate the exit
  // against — which means this function body, including the
  // createPortal(..., document.body) call below, now runs on every
  // render regardless of `open`. That's fine client-side, but `document`
  // doesn't exist during SSR; `mounted` defers the portal to after the
  // first client effect so the server render never touches it.
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client/server split, not synchronizing with any external state
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : OVERLAY.backdropDuration }}
        >
          <motion.div
            className={cn("panel modal-surface backdrop-blur-lg rounded-card p-4 w-full max-w-md", className)}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: OVERLAY.scaleFrom }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: OVERLAY.scaleFrom, transition: { duration: reduceMotion ? 0 : OVERLAY.exitDuration } }}
            transition={reduceMotion ? { duration: 0 } : { ...SOFT_SPRING, duration: OVERLAY.enterDuration }}
          >
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <div className="mt-3">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
