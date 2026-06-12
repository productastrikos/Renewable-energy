import { useState, useEffect, useCallback, useRef } from "react";
import { ApiError } from "../api/client";

// ─── Generic data-fetching hook ───────────────────────────────────────────────
export interface UseApiState<T> {
  data:     T | null;
  loading:  boolean;
  error:    string | null;
  refetch:  () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  pollingMs?: number,   // if set, re-fetches every pollingMs milliseconds
): UseApiState<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcherRef.current()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        setLoading(false);
      });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
    if (!pollingMs) return;
    const id = setInterval(run, pollingMs);
    return () => clearInterval(id);
  }, [run, pollingMs]);

  return { data, loading, error, refetch: run };
}

// ─── Convenience: lazy fetch (call trigger manually) ─────────────────────────
export function useLazyApi<T>(): {
  execute: (fetcher: () => Promise<T>) => Promise<T | null>;
  data: T | null; loading: boolean; error: string | null;
} {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const execute = useCallback(async (fetcher: () => Promise<T>) => {
    setLoading(true); setError(null);
    try {
      const result = await fetcher();
      setData(result); return result;
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Error";
      setError(msg); return null;
    } finally { setLoading(false); }
  }, []);

  return { execute, data, loading, error };
}
