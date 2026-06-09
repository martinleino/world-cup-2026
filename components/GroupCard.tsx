"use client";

import { GROUP_FIXTURES } from "@/lib/tournament-data";
import type { GroupTable } from "@/lib/standings";
import type { AppState, GroupResult } from "@/lib/types";
import { ScoreInput } from "./ScoreInput";
import { TieResolver } from "./TieResolver";

type Props = {
  table: GroupTable;
  results: Record<string, GroupResult>;
  manualTies: AppState["manualTies"];
  setResult: (fixtureId: string, next: GroupResult | undefined) => void;
  setManualTie: (key: string, ordered: string[] | undefined) => void;
};

export function GroupCard({ table, results, manualTies, setResult, setManualTie }: Props) {
  const fixtures = GROUP_FIXTURES.filter((f) => f.group === table.group);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Group {table.group}</h3>
        {!table.decided && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">In progress</span>
        )}
      </header>

      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <th className="py-1 pr-2 font-medium">Team</th>
            <th className="px-1 font-medium">P</th>
            <th className="px-1 font-medium">W</th>
            <th className="px-1 font-medium">D</th>
            <th className="px-1 font-medium">L</th>
            <th className="px-1 font-medium">GF</th>
            <th className="px-1 font-medium">GA</th>
            <th className="px-1 font-medium">GD</th>
            <th className="px-1 font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, idx) => {
            const advances = idx < 2;
            const third = idx === 2;
            return (
              <tr
                key={row.team}
                className={
                  advances
                    ? "border-t border-zinc-100 dark:border-zinc-900 bg-emerald-50/60 dark:bg-emerald-900/20"
                    : third
                      ? "border-t border-zinc-100 dark:border-zinc-900 bg-amber-50/60 dark:bg-amber-900/20"
                      : "border-t border-zinc-100 dark:border-zinc-900"
                }
              >
                <td className="py-1 pr-2 font-medium">{row.team}</td>
                <td className="px-1">{row.played}</td>
                <td className="px-1">{row.won}</td>
                <td className="px-1">{row.drawn}</td>
                <td className="px-1">{row.lost}</td>
                <td className="px-1">{row.goalsFor}</td>
                <td className="px-1">{row.goalsAgainst}</td>
                <td className="px-1">
                  {row.goalDiff > 0 ? "+" : ""}
                  {row.goalDiff}
                </td>
                <td className="px-1 font-semibold">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {table.unresolvedTies.map((tie) => (
        <TieResolver
          key={tie.key}
          tie={tie}
          manual={manualTies[tie.key]}
          onChange={(ordered) => setManualTie(tie.key, ordered)}
          label="break tie"
        />
      ))}

      <ul className="mt-4 space-y-1">
        {fixtures.map((f) => {
          const r = results[f.id];
          const updateSide = (side: "home" | "away", value: number | undefined) => {
            const other = side === "home" ? r?.awayGoals : r?.homeGoals;
            if (value === undefined) {
              setResult(f.id, undefined);
              return;
            }
            setResult(f.id, {
              homeGoals: side === "home" ? value : (other ?? 0),
              awayGoals: side === "away" ? value : (other ?? 0),
            });
          };
          return (
            <li key={f.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-right">{f.home}</span>
              <ScoreInput
                value={r?.homeGoals}
                ariaLabel={`${f.home} goals vs ${f.away}`}
                onChange={(v) => updateSide("home", v)}
              />
              <span className="text-zinc-400">–</span>
              <ScoreInput
                value={r?.awayGoals}
                ariaLabel={`${f.away} goals vs ${f.home}`}
                onChange={(v) => updateSide("away", v)}
              />
              <span className="flex-1">{f.away}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
