import { questionBatchSize } from "./config";
import { supabase } from "./supabase";
import type { Question } from "./types";

/// Question material access: per-category, batched downloads from Supabase
/// with a small localStorage cache so a reload doesn't re-download everything.

const CACHE_PREFIX = "tpweb_q_cache:";
const VERSION_KEY = "tpweb_material_version";

type QuestionRow = {
  category_id: string;
  difficulty: string | null;
  question: string;
  options: string[];
  answer: number;
  image: string | null;
};

const toQuestion = (row: QuestionRow): Question => ({
  category: row.category_id ?? "",
  difficulty: row.difficulty ?? "Easy",
  text: row.question,
  options: row.options,
  answer: row.answer,
  image: row.image,
});

function safeLocal(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getCachedCategory(id: string): Question[] {
  const store = safeLocal();
  if (!store) return [];
  const raw = store.getItem(`${CACHE_PREFIX}${id}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Question[];
  } catch {
    return [];
  }
}

export function saveCachedCategory(id: string, questions: Question[]): void {
  const store = safeLocal();
  if (!store) return;
  try {
    store.setItem(`${CACHE_PREFIX}${id}`, JSON.stringify(questions));
  } catch {
    // Storage full / unavailable — the in-memory copy still works this session.
  }
}

export function getCachedVersion(): number | null {
  const store = safeLocal();
  if (!store) return null;
  const raw = store.getItem(VERSION_KEY);
  return raw == null ? null : Number(raw);
}

export function setCachedVersion(version: number): void {
  safeLocal()?.setItem(VERSION_KEY, String(version));
}

/** Fingerprint of the material in Supabase (whole bank). */
export async function remoteVersion(): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from("material_versions")
      .select("version")
      .eq("id", "questions")
      .maybeSingle();
    if (!error && data?.version != null) return Number(data.version);
  } catch {
    // Fall through to the count.
  }
  const { count, error } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true });
  if (error) return null;
  return count ?? null;
}

/** How many questions Supabase has for a category. */
export async function remoteCountForCategory(id: string): Promise<number> {
  const { count, error } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (error) throw error;
  return count ?? 0;
}

/**
 * One batch of a category's questions. Ordered so paging is stable.
 * Batch size defaults to [questionBatchSize] (10).
 */
export async function fetchCategoryBatch(
  id: string,
  from: number,
  size: number = questionBatchSize,
): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("category_id,difficulty,question,options,answer,image")
    .eq("category_id", id)
    .order("id")
    .range(from, from + size - 1);
  if (error) throw error;
  return ((data ?? []) as QuestionRow[]).map(toQuestion);
}

/** Random sample of up to [count] cached questions for a category. */
export function randomQuestions(id: string, count: number): Question[] {
  const pool = [...getCachedCategory(id)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
