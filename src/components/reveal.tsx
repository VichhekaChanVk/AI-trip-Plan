"use client";

import { cn } from "@/lib/utils";
import { useInView } from "@/lib/use-motion";

/** Fades and lifts its children in when they first scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, seen } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("wf-reveal", seen && "is-visible", className)} style={{ "--d": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}
