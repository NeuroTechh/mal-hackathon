import { queryClient } from "./query-client";
import { randomUUID } from "expo-crypto";
import { apiUrl } from "./auth";
import { getRole } from "./demo";
export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  languages: string;
  fee: number;
  clinic_name: string;
  city: string;
  timezone: string;
};
export type Slot = { id: string; starts_at: string; ends_at: string };
export type Appointment = {
  id: string;
  doctor_name: string;
  clinic_name: string;
  specialty: string;
  starts_at: string;
  timezone: string;
  status: string;
  version: number;
};
const messages: Record<string, string> = {
  INVALID_PHOTO: "Choose a JPEG or PNG image up to 3 MB.",
  PHOTO_LIMIT: "This hospital already has eight photos.",
  CUTOFF_PASSED:
    "The cancellation window has closed. Contact the hospital for help.",
  SLOT_HAS_REQUESTS:
    "This time has appointment requests. Resolve them before blocking it.",
  PASS_INVALID: "This pass is no longer valid.",
  PASS_OUTSIDE_VISIT_WINDOW: "Check-in opens 24 hours before the visit.",
  OVERLAPPING_SLOT: "This time overlaps an existing slot.",
  RESCHEDULE_PENDING: "You already have a pending reschedule request.",
  INVALID_FILE: "Upload a PDF, JPEG or PNG up to 5 MB.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "Your account does not have clinic access.",
  STALE_VERSION: "This appointment just changed. Please try again.",
  SLOT_TAKEN: "This time is no longer available. Choose another.",
  SLOT_TAKEN_OR_ALREADY_REQUESTED:
    "This time is booked or you already requested it.",
  REQUEST_EXPIRED: "This request has expired.",
  WINDOW_EXCEEDED: "This appointment time has passed.",
  INVALID_STATE: "This request has already been decided.",
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiUrl}/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Demo-Role": getRole(),
      "ngrok-skip-browser-warning": "true",
      ...options.headers,
    },
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
  });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 409) void queryClient.invalidateQueries();
    throw new Error(
      messages[body.code] ??
        "Unable to complete this request. Please try again.",
    );
  }
  if (options.method && options.method !== "GET")
    void queryClient.invalidateQueries();
  return body;
}
// Keep the same key on transport retries; a rejected server command can be retried after refreshing.
export function command<T>(path: string, body: object = {}, version?: number) {
  const key = randomUUID();
  return () =>
    api<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Idempotency-Key": key,
        ...(version ? { "If-Match": String(version) } : {}),
      },
    });
}
export type Hospital = {
  photos: { id: string; path: string }[];
  id: string;
  name: string;
  city: string;
  address: string;
  timezone: string;
  google_place_id: string | null;
  doctor_count: number;
  min_fee: number | null;
  specialties: string[];
  lead_hours: number;
  window_days: number;
  cancellation_hours: number;
};
