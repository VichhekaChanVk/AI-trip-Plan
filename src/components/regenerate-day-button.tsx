"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * `busy` is owned by the parent so it can dim the day's list while this runs. On success the button stays
 * busy until the refreshed trip arrives (the parent clears it); on failure it clears itself.
 */
export function RegenerateDayButton({
  tripId,
  day,
  busy,
  onBusyChange,
}: {
  tripId: string;
  day: number;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    if (!window.confirm(`Replace all of Day ${day} with a new plan? The other days stay as they are.`)) return;
    onBusyChange(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/days/${day}/regenerate`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't regenerate this day.");
      router.refresh();
      // Safety net in case the refresh never delivers new data.
      window.setTimeout(() => onBusyChange(false), 15000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't regenerate this day.");
      onBusyChange(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
        {busy ? "Regenerating…" : "Regenerate this day"}
      </Button>
      {error && (
        <p role="alert" className="animate-fade-in max-w-xs text-right text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
