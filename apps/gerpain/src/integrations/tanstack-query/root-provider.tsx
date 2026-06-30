import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Operator data is browsed repeatedly; keep it fresh for 30s to avoid
        // refetch storms while navigating between day-scoped tabs.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Retry transient network/server hiccups but never retry a real 4xx
        // (e.g. NOT_FOUND for a stale bakery id) — that should surface fast.
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | null)?.status
          if (typeof status === 'number' && status >= 400 && status < 500) {
            return false
          }
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
        refetchOnWindowFocus: false,
      },
    },
  })

  return {
    queryClient,
  }
}
