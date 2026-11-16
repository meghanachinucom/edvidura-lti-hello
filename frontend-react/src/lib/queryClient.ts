/**
 * Shared TanStack Query Client Configuration
 */
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: (failureCount, error: unknown) => {
          // Never retry 401 Unauthorized or 403 Forbidden
          if (typeof error === "object" && error !== null && "statusCode" in error) {
            const status = (error as { statusCode: number }).statusCode;
            if (status === 401 || status === 403 || status === 404) {
              return false;
            }
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false, // Never retry mutations automatically to prevent duplicate writes
      },
    },
  });
}

export const queryClient = createQueryClient();
