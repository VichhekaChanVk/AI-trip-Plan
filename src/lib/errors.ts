import { APICallError, NoObjectGeneratedError, RetryError } from "ai";

/** Stable error codes shared by the API route and the UI. */
export type ErrorCode =
  | "BAD_INPUT"
  | "DB_UNAVAILABLE"
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_OUTPUT"
  | "NETWORK" // client-only: the browser could not reach our API
  | "UNKNOWN";

/** JSON body returned by POST /api/generate-itinerary on failure. */
export type ApiError = { error: string; code: ErrorCode; retryable: boolean };

export class AppError extends Error {
  constructor(public code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AppError";
  }
}

const META: Record<ErrorCode, { status: number; retryable: boolean; message: string }> = {
  BAD_INPUT: { status: 400, retryable: false, message: "Please check your trip details and try again." },
  DB_UNAVAILABLE: { status: 503, retryable: true, message: "We can't save trips right now. Please try again in a moment." },
  AI_NOT_CONFIGURED: { status: 503, retryable: false, message: "The AI service isn't set up on this server yet." },
  AI_TIMEOUT: { status: 504, retryable: true, message: "The AI took too long to respond. Try again, or plan fewer days." },
  AI_RATE_LIMITED: { status: 429, retryable: true, message: "The AI service is busy. Wait about a minute and try again." },
  AI_UNAVAILABLE: { status: 503, retryable: true, message: "The AI service is temporarily unavailable. Please try again shortly." },
  AI_INVALID_OUTPUT: { status: 502, retryable: true, message: "We couldn't build a valid itinerary. Please try again." },
  NETWORK: { status: 0, retryable: true, message: "Couldn't reach the server. Check your connection and try again." },
  UNKNOWN: { status: 500, retryable: true, message: "Something went wrong while generating your trip. Please try again." },
};

export function errorBody(code: ErrorCode): ApiError {
  return { error: META[code].message, code, retryable: META[code].retryable };
}

export function statusFor(code: ErrorCode) {
  return META[code].status;
}

/** Map any thrown value to a safe, user-facing code. Raw messages never reach the client. */
export function classifyError(err: unknown): ErrorCode {
  if (err instanceof AppError) return err.code;
  if (RetryError.isInstance(err)) return classifyError(err.lastError);
  if (NoObjectGeneratedError.isInstance(err)) return "AI_INVALID_OUTPUT";
  if (APICallError.isInstance(err)) {
    if (err.statusCode === 429) return "AI_RATE_LIMITED";
    if (err.statusCode === 401 || err.statusCode === 403) return "AI_NOT_CONFIGURED"; // bad/expired key
    return "AI_UNAVAILABLE";
  }
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") return "AI_TIMEOUT";
    if (/not set/i.test(err.message)) return "AI_NOT_CONFIGURED"; // missing API key (generate.ts)
    if (/no usable stops/i.test(err.message)) return "AI_INVALID_OUTPUT"; // sanitize() in generate.ts
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(err.message)) return "AI_UNAVAILABLE";
  }
  return "UNKNOWN";
}
