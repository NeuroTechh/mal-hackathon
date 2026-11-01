import { useMemo, useSyncExternalStore } from "react";
export type Role = "patient" | "hospital" | "doctor";
let role: Role | "choose" = "choose";
const listeners = new Set<() => void>();
export const getRole = () => role;
export function selectRole(next: Role) {
  role = next;
  listeners.forEach((fn) => fn());
}
export function useDemo() {
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getRole,
    getRole,
  );
  return useMemo(
    () => ({
      data: {
        user: {
          id: `demo-${value}`,
          name:
            value === "patient"
              ? "Manan Gandhi"
              : value === "doctor"
                ? "Dr. Ananya Rao"
                : "Hospital team",
          email: "Demo workspace",
        },
      },
      isPending: false,
      role: value,
    }),
    [value],
  );
}
