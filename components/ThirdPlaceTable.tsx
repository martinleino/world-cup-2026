"use client";

import type { ThirdPlaceRanking } from "@/lib/third-place";
import type { AppState } from "@/lib/types";
import { TieResolver } from "./TieResolver";

type Props = {
  ranking: ThirdPlaceRanking;
  manualTies: AppState["manualTies"];
  setManualTie: (key: string, ordered: string[] | undefined) => void;
};

export function ThirdPlaceTable({ ranking, manualTies, setManualTie }: Props) {
  if (ranking.rows.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
        <h3 className="text-lg font-semibold">Best third-placed teams</h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Available once the group stage is complete.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
      <h3 className="text-lg font-semibold">Best third-placed teams</h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Top 8 advance to the Round of 32 (highlighted).
      </p>
      <table className="mt-3 w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <th className="py-1 pr-2 font-medium">#</th>
            <th className="py-1 pr-2 font-medium">Group</th>
            <th className="py-1 pr-2 font-medium">Team</th>
            <th className="px-1 font-medium">Pts</th>
            <th className="px-1 font-medium">GD</th>
            <th className="px-1 font-medium">GF</th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((row, idx) => (
            <tr
              key={row.team}
              className={
                row.qualifies
                  ? "border-t border-zinc-100 dark:border-zinc-900 bg-emerald-50/60 dark:bg-emerald-900/20"
                  : "border-t border-zinc-100 dark:border-zinc-900"
              }
            >
              <td className="py-1 pr-2">{idx + 1}</td>
              <td className="py-1 pr-2">{row.group}</td>
              <td className="py-1 pr-2 font-medium">{row.team}</td>
              <td className="px-1 font-semibold">{row.points}</td>
              <td className="px-1">
                {row.goalDiff > 0 ? "+" : ""}
                {row.goalDiff}
              </td>
              <td className="px-1">{row.goalsFor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {ranking.unresolvedTie && (
        <TieResolver
          tie={ranking.unresolvedTie}
          manual={manualTies[ranking.unresolvedTie.key]}
          onChange={(ordered) => setManualTie(ranking.unresolvedTie!.key, ordered)}
          label="decide which qualifies"
        />
      )}
    </section>
  );
}
