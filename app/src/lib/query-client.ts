import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      retryDelay: 500,
      refetchOnWindowFocus: true,
      networkMode: "always",
    },
  },
});
