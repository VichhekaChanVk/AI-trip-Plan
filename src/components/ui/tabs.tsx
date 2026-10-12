"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/** Tab list with a pill that slides to the active tab and keeps it centred when the list scrolls. */
export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = React.useState<{ left: number; width: number } | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  const measure = React.useCallback(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[data-state="active"]');
    if (!list || !active) return;
    const next = { left: active.offsetLeft, width: active.offsetWidth };
    setPill((cur) => (cur && cur.left === next.left && cur.width === next.width ? cur : next));
    const target = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, []);

  const count = React.Children.count(children);
  useIsoLayoutEffect(() => {
    measure();
    const list = listRef.current;
    if (!list) return;
    const mo = new MutationObserver(measure);
    mo.observe(list, { attributes: true, attributeFilter: ["data-state"], subtree: true });
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, [measure, count]);

  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn("relative flex w-full gap-1 overflow-x-auto rounded-lg border bg-card p-1", className)}
      {...props}
    >
      {pill && (
        <span
          aria-hidden
          className="absolute bottom-1 top-1 rounded-md bg-primary transition-[left,width] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:text-primary-foreground data-[state=active]:hover:text-primary-foreground",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";
