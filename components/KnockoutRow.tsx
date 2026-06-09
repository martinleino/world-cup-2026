"use client";

import type { ResolvedKnockout } from "@/lib/knockouts";
import type { KnockoutResult } from "@/lib/types";
import { ScoreInput } from "./ScoreInput";

type Props = {
  resolved: ResolvedKnockout;
  result: KnockoutResult | undefined;
  setResult: (next: KnockoutResult | undefined) => void;
};

function lineageHint(r: ResolvedKnockout): string {
  const sides: string[] = [];
  for (const s of [r.fixture.home, r.fixture.away]) {
    if (s.kind === "groupPos") sides.push(s.pos === 1 ? `1${s.group}` : `2${s.group}`);
    else if (s.kind === "thirdFrom") sides.push(`3rd ∈ {${s.allowed.join(",")}}`);
    else if (s.kind === "winnerOf") sides.push(`W${s.matchId}`);
    else if (s.kind === "loserOf") sides.push(`L${s.matchId}`);
  }
  return sides.join(" vs ");
}

export function KnockoutRow({ resolved, result, setResult }: Props) {
  const { fixture, homeLabel, awayLabel, homeTeam, awayTeam, winner, decisionStage } = resolved;

  const ftDraw =
    result?.ftHome !== undefined &&
    result?.ftAway !== undefined &&
    result.ftHome === result.ftAway;
  const aetDraw =
    ftDraw &&
    result?.aetHome !== undefined &&
    result?.aetAway !== undefined &&
    result.aetHome === result.aetAway;

  const showAet = ftDraw;
  const showPens = aetDraw;

  const teamsKnown = !!homeTeam && !!awayTeam;

  const updateField = (
    field: "ftHome" | "ftAway" | "aetHome" | "aetAway" | "penHome" | "penAway",
    value: number | undefined
  ) => {
    const next: KnockoutResult = { ...(result ?? {}) };
    if (value === undefined) {
      delete next[field];
    } else {
      next[field] = value;
    }
    // Clean up downstream stages if their predecessor isn't a draw any more.
    const ft =
      next.ftHome !== undefined && next.ftAway !== undefined && next.ftHome === next.ftAway;
    if (!ft) {
      delete next.aetHome;
      delete next.aetAway;
      delete next.penHome;
      delete next.penAway;
    } else {
      const aet =
        next.aetHome !== undefined && next.aetAway !== undefined && next.aetHome === next.aetAway;
      if (!aet) {
        delete next.penHome;
        delete next.penAway;
      }
    }
    if (Object.keys(next).length === 0) setResult(undefined);
    else setResult(next);
  };

  return (
    <li className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>Match {fixture.id}</span>
        <span className="font-mono">{lineageHint(resolved)}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`flex-1 text-right ${winner && winner === homeTeam ? "font-semibold" : ""} ${!homeTeam ? "text-zinc-500 dark:text-zinc-400 italic" : ""}`}
        >
          {homeLabel}
        </span>
        <ScoreInput
          value={result?.ftHome}
          ariaLabel={`Match ${fixture.id} ${homeLabel} FT goals`}
          onChange={(v) => updateField("ftHome", v)}
        />
        <span className="text-zinc-400">–</span>
        <ScoreInput
          value={result?.ftAway}
          ariaLabel={`Match ${fixture.id} ${awayLabel} FT goals`}
          onChange={(v) => updateField("ftAway", v)}
        />
        <span
          className={`flex-1 ${winner && winner === awayTeam ? "font-semibold" : ""} ${!awayTeam ? "text-zinc-500 dark:text-zinc-400 italic" : ""}`}
        >
          {awayLabel}
        </span>
      </div>
      {!teamsKnown && (
        <p className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-400">
          Teams not yet determined — scores will apply once known.
        </p>
      )}
      {showAet && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="flex-1 text-right text-zinc-500 dark:text-zinc-400">After extra time</span>
          <ScoreInput
            value={result?.aetHome}
            ariaLabel={`Match ${fixture.id} ${homeLabel} AET goals`}
            onChange={(v) => updateField("aetHome", v)}
          />
          <span className="text-zinc-400">–</span>
          <ScoreInput
            value={result?.aetAway}
            ariaLabel={`Match ${fixture.id} ${awayLabel} AET goals`}
            onChange={(v) => updateField("aetAway", v)}
          />
          <span className="flex-1 text-zinc-500 dark:text-zinc-400">cumulative</span>
        </div>
      )}
      {showPens && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="flex-1 text-right text-zinc-500 dark:text-zinc-400">Penalties</span>
          <ScoreInput
            value={result?.penHome}
            ariaLabel={`Match ${fixture.id} ${homeLabel} penalty goals`}
            onChange={(v) => updateField("penHome", v)}
          />
          <span className="text-zinc-400">–</span>
          <ScoreInput
            value={result?.penAway}
            ariaLabel={`Match ${fixture.id} ${awayLabel} penalty goals`}
            onChange={(v) => updateField("penAway", v)}
          />
          <span className="flex-1 text-zinc-500 dark:text-zinc-400">shootout</span>
        </div>
      )}
      {winner && (
        <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
          {winner} wins{decisionStage === "AET" ? " (after extra time)" : decisionStage === "PENS" ? " (on penalties)" : ""}.
        </div>
      )}
    </li>
  );
}
