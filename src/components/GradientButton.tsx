"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  type?: "button" | "submit";
  /** CSS background-image value; defaults to the brand gradient. */
  gradient?: string;
  /** Text colour; defaults to white. */
  foreground?: string;
  className?: string;
};

export function GradientButton({
  children,
  onClick,
  disabled,
  busy,
  icon,
  type,
  gradient,
  foreground,
  className,
}: Props) {
  return (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        backgroundImage:
          gradient ??
          "linear-gradient(135deg, #00A859 0%, #00C46E 100%)",
        color: foreground ?? "#ffffff",
      }}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-extrabold shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
        className ?? ""
      }`}
    >
      {busy ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}
