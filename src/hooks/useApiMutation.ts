"use client";

import { useState, useCallback } from "react";

interface UseApiMutationOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export function useApiMutation(opts?: UseApiMutationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (url: string, options?: RequestInit) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(options?.headers as Record<string, string>),
          },
          ...options,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Something went wrong");
        opts?.onSuccess?.(json.data);
        return json.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        opts?.onError?.(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [opts]
  );

  return { mutate, isLoading, error };
}
