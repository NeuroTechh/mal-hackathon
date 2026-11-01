import { useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, Doctor } from "./api";
import { getRole, useDemo } from "./demo";
import { queryClient } from "./query-client";
export function prefetchApi(path: string) {
  return queryClient.prefetchQuery({
    queryKey: [getRole(), path],
    queryFn: ({ signal }) => api(path, { signal }),
  });
}
export function seedApi<T>(path: string, data: T) {
  queryClient.setQueryData([getRole(), path], data);
}
export function prepareDoctor(doctor: Doctor) {
  seedApi(`/doctors/${doctor.id}`, doctor);
  void prefetchApi(`/doctors/${doctor.id}/slots`);
  void prefetchApi("/profiles");
  void prefetchApi("/records");
}
export function useApiQuery<T>(path: string, interval?: number) {
  const { role } = useDemo();
  const key = useMemo(() => [role, path], [role, path]);
  const query = useQuery<T, Error>({
    queryKey: key,
    queryFn: ({ signal }) => api<T>(path, { signal }),
    enabled: role !== "choose",
    refetchInterval: interval,
  });
  useFocusEffect(
    useCallback(() => {
      const state = queryClient.getQueryState(key);
      if (
        role !== "choose" &&
        state?.data &&
        (state.isInvalidated || Date.now() - state.dataUpdatedAt > 30000)
      )
        void queryClient.prefetchQuery({
          queryKey: key,
          queryFn: ({ signal }) => api(path, { signal }),
        });
    }, [role, path, key]),
  );
  return query;
}
