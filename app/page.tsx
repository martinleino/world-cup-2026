"use client";

import { useCallback, useMemo } from "react";
import { useAppState } from "@/lib/storage";
import { computeSnapshot } from "@/lib/knockouts";
import { ROUND_LABELS } from "@/lib/tournament-data";
import type { KnockoutFixture, GroupResult, KnockoutResult } from "@/lib/types";
import { GroupCard } from "@/components/GroupCard";
import { ThirdPlaceTable } from "@/components/ThirdPlaceTable";
import { KnockoutRow } from "@/components/KnockoutRow";

const KO_ROUNDS: KnockoutFixture["round"][] = ["R32", "R16", "QF", "SF", "Third", "Final"];

export default function Home() {
  const { state, setState, hydrated, reset } = useAppState();

  const snapshot = useMemo(() => computeSnapshot(state), [state]);

  const setGroupResult = useCallback(
    (fixtureId: string, next: GroupResult | undefined) => {
      setState((prev) => {
        const groupResults = { ...prev.groupResults };
        if (next === undefined) delete groupResults[fixtureId];
        else groupResults[fixtureId] = next;
        return { ...prev, groupResults };
      });
    },
    [setState]
  );

  const setKnockoutResult = useCallback(
    (matchId: number, next: KnockoutResult | undefined) => {
      setState((prev) => {
        const knockoutResults = { ...prev.knockoutResults };
        if (next === undefined) delete knockoutResults[matchId];
        else knockoutResults[matchId] = next;
        return { ...prev, knockoutResults };
      });
    },
    [setState]
  );

  const setManualTie = useCallback(
    (key: string, ordered: string[] | undefined) => {
      setState((prev) => {
        const manualTies = { ...prev.manualTies };
        if (!ordered) delete manualTies[key];
        else manualTies[key] = ordered;
        return { ...prev, manualTies };
      });
    },
    [setState]
  );

  if (!hydrated) {
    return (
      <main className="min-h-screen p-8 text-sm text-zinc-500">Loading saved results…</main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FIFA World Cup 2026 Tracker</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Enter results. Tables, qualifiers, and the knockout bracket update automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset every result and clear all saved progress?")) reset();
            }}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Reset all results
          </button>
        </header>

        {snapshot.champion && (
          <section className="mb-8 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Champion
            </p>
            <p className="mt-1 text-2xl font-bold">{snapshot.champion}</p>
          </section>
        )}

        <h2 className="mb-3 text-xl font-semibold">Group stage</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {snapshot.groupTables.map((t) => (
            <GroupCard
              key={t.group}
              table={t}
              results={state.groupResults}
              manualTies={state.manualTies}
              setResult={setGroupResult}
              setManualTie={setManualTie}
            />
          ))}
        </div>

        <div className="mt-8">
          <ThirdPlaceTable
            ranking={snapshot.thirdPlace}
            manualTies={state.manualTies}
            setManualTie={setManualTie}
          />
        </div>

        {KO_ROUNDS.map((round) => {
          const rows = [...snapshot.knockouts.values()].filter(
            (k) => k.fixture.round === round
          );
          return (
            <section key={round} className="mt-8">
              <h2 className="mb-3 text-xl font-semibold">{ROUND_LABELS[round]}</h2>
              <ul className="space-y-2">
                {rows.map((r) => (
                  <KnockoutRow
                    key={r.fixture.id}
                    resolved={r}
                    result={state.knockoutResults[r.fixture.id]}
                    setResult={(next) => setKnockoutResult(r.fixture.id, next)}
                  />
                ))}
              </ul>
            </section>
          );
        })}

        <footer className="mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs text-zinc-500 dark:text-zinc-400">
          State is saved in this browser. Reset wipes all entered results.
        </footer>
      </div>
    </main>
  );
}
