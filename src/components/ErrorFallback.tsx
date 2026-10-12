"use client";

import { AlertCircle, Clock, RefreshCw, ServerCrash, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError, ErrorCode } from "@/lib/errors";

const TITLE: Record<ErrorCode, string> = {
  BAD_INPUT: "Check your trip details",
  DB_UNAVAILABLE: "Can't save your trip",
  AI_NOT_CONFIGURED: "AI service not available",
  AI_TIMEOUT: "That took too long",
  AI_RATE_LIMITED: "AI service is busy",
  AI_UNAVAILABLE: "AI service is down",
  AI_INVALID_OUTPUT: "We couldn't build a valid itinerary",
  NETWORK: "You seem to be offline",
  UNKNOWN: "Something went wrong",
};

function iconFor(code: ErrorCode) {
  if (code === "AI_TIMEOUT") return Clock;
  if (code === "NETWORK") return WifiOff;
  if (code === "AI_UNAVAILABLE" || code === "AI_NOT_CONFIGURED" || code === "DB_UNAVAILABLE") return ServerCrash;
  return AlertCircle;
}

export function ErrorFallback({
  error,
  onRetry,
  retrying = false,
}: {
  error: Pick<ApiError, "error"> & Partial<Pick<ApiError, "code" | "retryable">>;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const code = error.code ?? "UNKNOWN";
  const Icon = iconFor(code);
  const canRetry = (error.retryable ?? true) && !!onRetry;

  return (
    <div role="alert" className="animate-fade-up rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="flex-1">
          <p className="font-semibold">{TITLE[code]}</p>
          <p className="mt-1 text-red-700">{error.error}</p>
          {canRetry && (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry} disabled={retrying}>
              <RefreshCw className={retrying ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} aria-hidden /> Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
