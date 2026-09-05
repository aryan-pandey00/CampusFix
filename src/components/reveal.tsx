"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** How far up the screen a block must come before it animates. */
const TRIGGER = 0.35;

/** Animates its contents in when they scroll into view. */
export function Reveal({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => {
      el.dataset.shown = "true";
    };

    // No observer (an old browser, some test runners): show it and move on.
    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    let io: IntersectionObserver | undefined;

    // Measured after a frame, once layout has settled.
    const frame = requestAnimationFrame(() => {
      const vh = window.innerHeight;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - vh,
      );
      const top = el.getBoundingClientRect().top + window.scrollY;

      /* Whether this block can ever reach the trigger line. */
      const reachable = top - maxScroll < vh * (1 - TRIGGER);

      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            show();
            io?.disconnect();
          }
        },
        {
          rootMargin: reachable ? `0px 0px -${TRIGGER * 100}% 0px` : "0px",
          // threshold 0 so it fires the moment any part crosses the line; with
          // a real threshold, a short block inside the strip the margin carves
          // off would never qualify.
          threshold: 0,
        },
      );
      io.observe(el);
    });

    return () => {
      cancelAnimationFrame(frame);
      io?.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={cn("reveal", className)}>
      {children}
    </div>
  );
}
