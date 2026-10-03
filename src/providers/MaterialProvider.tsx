"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CATEGORIES, type Category } from "@/lib/categories";
import {
  fetchCategoryBatch,
  getCachedCategory,
  getCachedVersion,
  remoteCountForCategory,
  remoteVersion,
  saveCachedCategory,
  setCachedVersion,
} from "@/lib/material";
import type { Question } from "@/lib/types";

/// Loads question material **one category at a time in small batches** so the
/// web app opens instantly: the first category becomes playable while the rest
/// stream in behind it.

export type CategoryState = "queued" | "loading" | "ready" | "error";

export type CategoryProgress = {
  state: CategoryState;
  /** 0..1 */
  value: number;
  /** Questions available for this category. */
  count: number;
};

type MaterialContextValue = {
  categories: Category[];
  progressFor: (id: string) => CategoryProgress;
  isReady: (id: string) => boolean;
  readyCount: number;
  isLoading: boolean;
  retry: (id: string) => void;
};

const DEFAULT_PROGRESS: CategoryProgress = {
  state: "queued",
  value: 0,
  count: 0,
};

const MaterialContext = createContext<MaterialContextValue | null>(null);

export function MaterialProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Record<string, CategoryProgress>>(
    {},
  );
  const [running, setRunning] = useState(false);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);

  const update = useCallback(
    (id: string, patch: Partial<CategoryProgress>) => {
      if (!mountedRef.current) return;
      setProgress((prev) => ({
        ...prev,
        [id]: { ...DEFAULT_PROGRESS, ...prev[id], ...patch },
      }));
    },
    [],
  );

  const loadCategory = useCallback(
    async (category: Category) => {
      const cached = getCachedCategory(category.id);
      update(category.id, {
        state: "loading",
        value: 0.03,
        count: cached.length,
      });
      try {
        const total = await remoteCountForCategory(category.id);
        const collected: Question[] = [];
        let from = 0;
        // Batches of `questionBatchSize` (10) — honest progress, small memory.
        for (let guard = 0; guard < 500; guard++) {
          const batch = await fetchCategoryBatch(category.id, from);
          if (batch.length === 0) break;
          collected.push(...batch);
          from += batch.length;
          const frac = total > 0 ? Math.min(1, from / total) : 0.9;
          update(category.id, {
            state: "loading",
            value: 0.05 + 0.85 * frac,
            count: collected.length,
          });
          if (total > 0 && from >= total) break;
        }

        if (collected.length === 0) {
          if (cached.length > 0) {
            update(category.id, {
              state: "ready",
              value: 1,
              count: cached.length,
            });
          } else {
            update(category.id, { state: "error", value: 0, count: 0 });
          }
          return;
        }

        saveCachedCategory(category.id, collected);
        update(category.id, {
          state: "ready",
          value: 1,
          count: collected.length,
        });
      } catch {
        if (cached.length > 0) {
          update(category.id, {
            state: "ready",
            value: 1,
            count: cached.length,
          });
        } else {
          update(category.id, { state: "error", value: 0, count: 0 });
        }
      }
    },
    [update],
  );

  const processQueue = useCallback(
    async (ids: string[]) => {
      setRunning(true);
      try {
        for (const id of ids) {
          const category = CATEGORIES.find((c) => c.id === id);
          if (!category) continue;
          await loadCategory(category);
        }
      } finally {
        if (mountedRef.current) setRunning(false);
      }
    },
    [loadCategory],
  );

  const start = useCallback(async () => {
    const version = await remoteVersion().catch(() => null);
    const refreshAll = version != null && version !== getCachedVersion();

    const toLoad: string[] = [];
    for (const category of CATEGORIES) {
      const cached = getCachedCategory(category.id);
      if (cached.length > 0 && !refreshAll) {
        update(category.id, { state: "ready", value: 1, count: cached.length });
      } else {
        update(category.id, { state: "queued", value: 0, count: 0 });
        toLoad.push(category.id);
      }
    }
    await processQueue(toLoad);
    if (version != null) setCachedVersion(version);
  }, [processQueue, update]);

  useEffect(() => {
    mountedRef.current = true;
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
    return () => {
      mountedRef.current = false;
    };
  }, [start]);

  const retry = useCallback(
    (id: string) => {
      update(id, { state: "queued", value: 0, count: 0 });
      void processQueue([id]);
    },
    [processQueue, update],
  );

  const value = useMemo<MaterialContextValue>(() => {
    const progressFor = (id: string) => progress[id] ?? DEFAULT_PROGRESS;
    const readyCount = CATEGORIES.filter(
      (c) => progressFor(c.id).state === "ready",
    ).length;
    return {
      categories: CATEGORIES,
      progressFor,
      isReady: (id) => progressFor(id).state === "ready",
      readyCount,
      isLoading: running || readyCount < CATEGORIES.length,
      retry,
    };
  }, [progress, running, retry]);

  return (
    <MaterialContext.Provider value={value}>
      {children}
    </MaterialContext.Provider>
  );
}

export function useMaterial(): MaterialContextValue {
  const ctx = useContext(MaterialContext);
  if (!ctx) {
    throw new Error("useMaterial must be used inside a MaterialProvider");
  }
  return ctx;
}
