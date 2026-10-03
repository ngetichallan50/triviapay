"use client";

export type AnswerState = "idle" | "correct" | "wrong" | "muted";

type Props = {
  letter: string;
  label: string;
  state: AnswerState;
  onSelect?: () => void;
  disabled?: boolean;
};

const STYLES: Record<AnswerState, string> = {
  idle: "border-slate-200 bg-white text-slate-800",
  correct: "border-emerald-500 bg-emerald-50 text-emerald-900",
  wrong: "border-red-500 bg-red-50 text-red-900",
  muted: "border-slate-200 bg-slate-50 text-slate-400",
};

export function AnswerTile({ letter, label, state, onSelect, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-semibold shadow-sm transition active:scale-[0.99] disabled:cursor-default ${STYLES[state]}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
          state === "correct"
            ? "bg-emerald-500 text-white"
            : state === "wrong"
              ? "bg-red-500 text-white"
              : "bg-slate-100 text-slate-600"
        }`}
      >
        {letter}
      </span>
      <span className="flex-1 text-[15px] leading-snug">{label}</span>
      {state === "correct" && <span>✅</span>}
      {state === "wrong" && <span>❌</span>}
    </button>
  );
}
