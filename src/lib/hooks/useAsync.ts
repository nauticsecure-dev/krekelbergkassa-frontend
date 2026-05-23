'use client';

import * as React from 'react';

export function useQuery<T>(
  deps: React.DependencyList,
  fn: () => Promise<T>,
  options?: { immediate?: boolean }
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState<boolean>(options?.immediate !== false);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      setData(res);
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (options?.immediate === false) return;
    void run();
  }, [run, options?.immediate]);

  return { data, loading, error, refetch: run, setData };
}

export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mutate = React.useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  return { mutate, loading, error, setError };
}
