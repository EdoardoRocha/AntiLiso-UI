'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AUTH_ME_QUERY_KEY } from '@/hooks/use-auth';
import { setUnauthorizedHandler } from '@/lib/api';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null);
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
