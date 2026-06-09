import { KNOCKOUT_FIXTURES } from "./tournament-data";
import { computeAllGroupTables } from "./standings";
import type { TeamStats, GroupTable } from "./standings";
import type { AppState, GroupId } from "./types";

export type ThirdPlaceRow = TeamStats & { qualifies: boolean };

export type ThirdPlaceRanking = {
  rows: ThirdPlaceRow[]; // length 12, ordered best to worst
  qualifyingGroups: GroupId[]; // length 8 (or fewer if standings not yet decided)
  unresolvedTie?: { key: string; teams: string[] }; // engine ran out of criteria
  decided: boolean;
};

const THIRD_PLACE_TIE_KEY_PREFIX = "thirdPlace:";

export function thirdPlaceTieKey(teams: string[]): string {
  return THIRD_PLACE_TIE_KEY_PREFIX + [...teams].sort().join("|");
}

export function rankThirdPlaced(state: AppState, groupTables?: GroupTable[]): ThirdPlaceRanking {
  const tables = groupTables ?? computeAllGroupTables(state);

  // Pick the 3rd-placed team from each decided table. If a group isn't decided
  // yet, skip — the ranking is incomplete.
  const thirds: TeamStats[] = [];
  let allDecided = true;
  for (const t of tables) {
    if (!t.decided) {
      allDecided = false;
      continue;
    }
    thirds.push(t.rows[2]);
  }

  // Sort by points, GD, GF.
  thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });

  // Detect ties that span the qualification cutoff (position 8 vs 9).
  // We surface only the first unresolvable tie — typically rare.
  let unresolvedTie: ThirdPlaceRanking["unresolvedTie"];
  if (allDecided && thirds.length === 12) {
    // Walk through clusters of equal teams; if a cluster straddles index 8,
    // try manual resolution; otherwise flag it.
    const sameRank = (a: TeamStats, b: TeamStats) =>
      a.points === b.points && a.goalDiff === b.goalDiff && a.goalsFor === b.goalsFor;
    let i = 0;
    const reordered: TeamStats[] = [];
    while (i < thirds.length) {
      let j = i + 1;
      while (j < thirds.length && sameRank(thirds[i], thirds[j])) j++;
      const cluster = thirds.slice(i, j);
      if (cluster.length === 1) {
        reordered.push(cluster[0]);
      } else {
        const teamNames = cluster.map((t) => t.team);
        const key = thirdPlaceTieKey(teamNames);
        const manual = state.manualTies[key];
        if (manual && manual.length === teamNames.length && manual.every((t) => teamNames.includes(t))) {
          const byTeam = new Map(cluster.map((s) => [s.team, s]));
          for (const t of manual) reordered.push(byTeam.get(t)!);
        } else {
          // Only flag if the cluster straddles the qualification cutoff
          // (index 8 in 0-based, i.e. positions 8 and 9 in 1-based).
          const cutoff = 8;
          if (i < cutoff && i + cluster.length > cutoff && !unresolvedTie) {
            unresolvedTie = { key, teams: [...teamNames].sort() };
          }
          // Use alphabetical order as a stable placeholder.
          for (const t of [...cluster].sort((a, b) => a.team.localeCompare(b.team))) reordered.push(t);
        }
      }
      i = j;
    }
    thirds.length = 0;
    thirds.push(...reordered);
  }

  const qualifyingGroups = thirds.slice(0, 8).map((t) => t.group);
  const rows: ThirdPlaceRow[] = thirds.map((t, idx) => ({ ...t, qualifies: idx < 8 }));

  return {
    rows,
    qualifyingGroups,
    unresolvedTie,
    decided: allDecided && !unresolvedTie,
  };
}

// The 8 R32 slots that take a third-placed team, with their allowed-group sets.
// Order is fixed — used by the deterministic matching below.
type ThirdSlot = { matchId: number; allowed: GroupId[] };

export const THIRD_PLACE_SLOTS: ThirdSlot[] = (() => {
  const slots: ThirdSlot[] = [];
  for (const f of KNOCKOUT_FIXTURES) {
    if (f.round !== "R32") continue;
    for (const side of [f.home, f.away]) {
      if (side.kind === "thirdFrom") slots.push({ matchId: f.id, allowed: side.allowed });
    }
  }
  // Sorted by match id for stability.
  slots.sort((a, b) => a.matchId - b.matchId);
  return slots;
})();

// Assign 8 qualifying groups to the 8 third-place slots so that each group
// goes to a slot whose allowed-set contains it. Returns a map matchId -> GroupId.
//
// NOTE: FIFA publishes a 495-row table that pre-computes the specific
// assignment for each possible 8-group combination. We use a deterministic
// bipartite matching here. The matching is always *valid* (each group is
// placed in an allowed slot), but for combinations where multiple valid
// matchings exist, ours may differ from FIFA's chosen one.
export function assignThirdPlaceSlots(qualifying: GroupId[]): Record<number, GroupId> | null {
  if (qualifying.length !== 8) return null;
  const slots = THIRD_PLACE_SLOTS;
  if (slots.length !== 8) return null;

  // Sort qualifying groups deterministically.
  const groups = [...qualifying].sort();
  const used = new Set<GroupId>();
  const assignment: Record<number, GroupId> = {};

  function backtrack(idx: number): boolean {
    if (idx === slots.length) return true;
    const slot = slots[idx];
    for (const g of groups) {
      if (used.has(g)) continue;
      if (!slot.allowed.includes(g)) continue;
      used.add(g);
      assignment[slot.matchId] = g;
      if (backtrack(idx + 1)) return true;
      used.delete(g);
      delete assignment[slot.matchId];
    }
    return false;
  }

  return backtrack(0) ? assignment : null;
}
