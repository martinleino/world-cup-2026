"use client";

type Tie = { key: string; teams: string[] };

type Props = {
  tie: Tie;
  manual: string[] | undefined;
  onChange: (ordered: string[] | undefined) => void;
  label: string;
};

// Lets the user pick an ordering for a set of tied teams the engine cannot
// separate. The user assigns a rank (1, 2, 3, …) to each team via a select.
export function TieResolver({ tie, manual, onChange, label }: Props) {
  const ranks = Array.from({ length: tie.teams.length }, (_, i) => i + 1);
  const current = manual ?? [];

  const teamRank = (team: string): number | "" => {
    const idx = current.indexOf(team);
    return idx === -1 ? "" : idx + 1;
  };

  const setTeamRank = (team: string, rank: number | "") => {
    // Build a working ordered array from the current state.
    const working: (string | null)[] = Array.from({ length: tie.teams.length }, () => null);
    for (let i = 0; i < current.length; i++) working[i] = current[i] ?? null;
    // Remove team from its current slot.
    for (let i = 0; i < working.length; i++) if (working[i] === team) working[i] = null;
    if (rank !== "") {
      // Bump whoever is currently in that slot out (set to null).
      working[rank - 1] = team;
    }
    // If every slot is filled with a distinct team and all tied teams are
    // present, commit. Otherwise clear (engine falls back).
    const filled = working.filter((t): t is string => t !== null);
    const distinct = new Set(filled).size === filled.length;
    const complete = filled.length === tie.teams.length && tie.teams.every((t) => filled.includes(t));
    if (distinct && complete) {
      onChange(filled);
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="mt-3 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-2 text-xs">
      <div className="mb-1 font-medium text-amber-900 dark:text-amber-200">
        Engine cannot separate these teams — please {label}:
      </div>
      <ul className="space-y-1">
        {tie.teams.map((team) => (
          <li key={team} className="flex items-center gap-2">
            <span className="flex-1">{team}</span>
            <select
              value={teamRank(team)}
              onChange={(e) => {
                const v = e.target.value;
                setTeamRank(team, v === "" ? "" : Number.parseInt(v, 10));
              }}
              aria-label={`Rank for ${team}`}
              className="rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 px-1 py-0.5"
            >
              <option value="">—</option>
              {ranks.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
