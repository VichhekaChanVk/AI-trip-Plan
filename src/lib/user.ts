import { cookies } from "next/headers";

export const USER_COOKIE = "wf_uid";

/**
 * Anonymous identity: a random id stored in an httpOnly cookie.
 * Swap this for Supabase Auth later - `trips.user_id` is already a plain string.
 */
export function getUserId(): string | null {
  return cookies().get(USER_COOKIE)?.value ?? null;
}

export const userCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};
