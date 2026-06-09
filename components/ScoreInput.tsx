"use client";

type Props = {
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  ariaLabel: string;
};

export function ScoreInput({ value, onChange, ariaLabel }: Props) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      step={1}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") {
          onChange(undefined);
          return;
        }
        const n = Number.parseInt(v, 10);
        if (Number.isFinite(n) && n >= 0 && n <= 99) onChange(n);
      }}
      aria-label={ariaLabel}
      className="w-12 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
