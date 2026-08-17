import { useState, useEffect, useCallback, useRef } from "react";

export interface UseSyncDataOptions<T> {
  fallbackData?: T;
  revalidateOnFocus?: boolean;
}

export interface UseSyncDataReturn<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<T | null>;
}

/**
 * Generic Stale-While-Revalidate (SWR) Custom Hook with Offline LocalStorage Cache
 * & Automatic Cross-Device Focus Revalidation.
 *
 * @param key LocalStorage cache key
 * @param fetcher Async function to fetch fresh data from Backend REST API
 * @param options Fallback data and revalidation behavior
 */
export function useSyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseSyncDataOptions<T> = {}
): UseSyncDataReturn<T> {
  const { fallbackData, revalidateOnFocus = true } = options;

  // 1. Instant Local Render: Read from localStorage immediately if available
  const [data, setData] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch (e) {
      console.error(`[useSyncData] Error reading cache for key "${key}":`, e);
    }
    return fallbackData as T;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep ref of latest fetcher to avoid stale closure in listeners
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // 2. Revalidate Function: Fetches fresh data, updates state, and overwrites localStorage cache
  const revalidate = useCallback(async (): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const freshData = await fetcherRef.current();

      if (freshData !== null && freshData !== undefined) {
        setData(freshData);
        try {
          localStorage.setItem(key, JSON.stringify(freshData));
        } catch (e) {
          console.error(`[useSyncData] Failed to write cache for key "${key}":`, e);
        }
        return freshData;
      }
      return null;
    } catch (err: any) {
      console.error(`[useSyncData] Revalidation error for key "${key}":`, err);
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  // 3. Revalidate on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initialFetch() {
      const result = await revalidate();
      if (!isMounted) return;
    }

    initialFetch();

    return () => {
      isMounted = false;
    };
  }, [revalidate]);

  // 4. Cross-Device Sync: Revalidate on Window Focus or Tab Visibility Change
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        revalidate();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [revalidate, revalidateOnFocus]);

  return {
    data,
    isLoading,
    error,
    mutate: revalidate,
  };
}
