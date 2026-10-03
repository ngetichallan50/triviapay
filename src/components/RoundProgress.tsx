"use client";

type Props = {
  total: number;
  answered: number;
  label: string;
  right?: string;
};

export function RoundProgress({ total, answered, label, right }: Props) {
  return (
    <div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < answered ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-white/90">
        <span>{label}</span>
        {right && <span>{right}</span>}
      </div>
    </div>
  );
}
