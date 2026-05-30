'use client';

import * as React from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api-error';

export function useQuery<T>(
  deps: React.DependencyList,
  fn: () => Promise<T>,
  options?: { immediate?: boolean }
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState<boolean>(options?.immediate !== false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorStatus, setErrorStatus] = React.useState<number | null>(null);
  const generationRef = React.useRef(0);

  const refetch = React.useCallback(async () => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const res = await fn();
      if (generationRef.current === generation) {
        setData(res);
      }
      return res;
    } catch (err) {
      if (generationRef.current === generation) {
        setError(getApiErrorMessage(err));
        setErrorStatus(getApiErrorStatus(err) ?? null);
      }
      throw err;
    } finally {
      if (generationRef.current === generation) {
        setLoading(false);
      }
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (options?.immediate === false) return;
    void refetch();
    return () => {
      generationRef.current += 1;
    };
  }, [refetch, options?.immediate]);

  return { data, loading, error, errorStatus, refetch, setData };
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
        setError(getApiErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  return { mutate, loading, error, setError };
}
