"use client";

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function bandClasses(score: number, selected: boolean) {
  if (!selected) {
    return "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-700";
  }
  if (score <= 6) return "border-rose-500 bg-rose-500 text-white";
  if (score <= 8) return "border-amber-500 bg-amber-500 text-white";
  return "border-emerald-500 bg-emerald-500 text-white";
}

export function ScaleInput({
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  value: number | null;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {SCORES.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            aria-pressed={value === score}
            className={`flex aspect-square items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${bandClasses(
              score,
              value === score,
            )}`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-3 text-xs text-neutral-400">
        <span className="max-w-[45%]">{leftLabel}</span>
        <span className="max-w-[45%] text-right">{rightLabel}</span>
      </div>
    </div>
  );
}
