"use client";

import type { CategoryTheme } from "@/lib/categories";

type Props = {
  question: string;
  image?: string | null;
  categoryName: string;
  icon: string;
  theme: CategoryTheme;
  pointsLabel: string;
  showPoints: boolean;
};

export function QuestionCard({
  question,
  image,
  categoryName,
  icon,
  theme,
  pointsLabel,
  showPoints,
}: Props) {
  const isRemote = !!image && image.startsWith("http");

  return (
    <div
      className="rounded-3xl p-5 shadow-xl"
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.soft} 0%, #ffffff 100%)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {categoryName}
        </span>
        {showPoints && (
          <span
            className="ml-auto rounded-full px-2.5 py-1 text-xs font-extrabold text-white"
            style={{ backgroundColor: theme.primary }}
          >
            {pointsLabel}
          </span>
        )}
      </div>

      {isRemote && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image as string}
          alt=""
          className="mx-auto mt-4 max-h-40 rounded-2xl object-contain"
        />
      )}

      <p className="mt-4 text-lg font-extrabold leading-snug text-slate-900 sm:text-xl">
        {question}
      </p>
    </div>
  );
}
