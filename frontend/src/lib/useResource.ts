"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "@/context/AuthContext";
export function useResource<T>(path: string, enabled = true) {
  const { user } = useAuth();
  const resourceKey = `${user?.id || "public"}:${path}`;
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<{
    path: string;
    generation: number;
    data: T | null;
    error: string;
  }>({ path: "", generation: -1, data: null, error: "" });
  const reload = useCallback(() => setGeneration((n) => n + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ path: resourceKey, generation, data, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            path: resourceKey,
            generation,
            data: null,
            error: error.message || "Koneksi belum tersedia.",
          });
      });
    return () => controller.abort();
  }, [path, resourceKey, enabled, generation]);
  const current = state.path === resourceKey && state.generation === generation;
  const setData = useCallback(
    (data: T) => setState({ path: resourceKey, generation, data, error: "" }),
    [resourceKey, generation],
  );
  return {
    data: state.path === resourceKey ? state.data : null,
    error: current ? state.error : "",
    loading: enabled && !current,
    reload,
    setData,
  };
}
