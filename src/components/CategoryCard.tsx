"use client";

import { categoryThemeOf, type Category } from "@/lib/categories";
import type { CategoryProgress } from "@/providers/MaterialProvider";

type Props = {
  category: Category;
  selected: boolean;
  progress: CategoryProgress;
  onToggle: () => void;
  onRetry: () => void;
};

export function CategoryCard({
  category,
  selected,
  progress,
  onToggle,
  onRetry,
}: Props) {
  const theme = categoryThemeOf(category.id);
  const ready = progress.state === "ready";

  if (!ready) {
    const errored = progress.state === "error";
    const pct = Math.round(progress.value * 100);
    return (
      <button
        type="button"
        onClick={errored ? onRetry : undefined}
        disabled={!errored}
        className="flex h-full min-h-[128px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 p-3 text-center"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl opacity-50">
          {category.icon}
        </div>
        <p className="mt-2 w-full truncate text-sm font-bold text-slate-500">
          {category.name}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: errored ? "100%" : `${Math.max(2, progress.value * 100)}%`,
              backgroundColor: errored ? "#EF4444" : theme.primary,
            }}
          />
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-slate-500">
          {errored
            ? "Tap to retry"
            : progress.state === "loading"
              ? `Downloading… ${pct}%`
              : "Waiting…"}
        </p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex h-full min-h-[128px] flex-col items-center justify-center rounded-3xl p-4 text-center text-white shadow-lg transition active:scale-[0.97] ${
        selected ? "ring-4 ring-white" : ""
      }`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
      }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl">
        {category.icon}
      </div>
      <p className="mt-2.5 text-sm font-extrabold leading-tight">
        {category.name}
      </p>
      <p className="mt-1 text-[11px] text-white/85">
        {progress.count} questions
      </p>
      {selected && (
        <span
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black"
          style={{ color: theme.primary }}
        >
          ✓
        </span>
      )}
    </button>
  );
}
