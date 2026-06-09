import { GROUPS, GROUP_FIXTURES, TEAM_GROUP } from "./tournament-data";
import type { AppState, GroupId, GroupResult } from "./types";

export type TeamStats = {
  team: string;
  group: GroupId;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  // True if any group fixture for this team has no result entered yet.
  complete: boolean;
};

export type GroupTable = {
  group: GroupId;
  // Rows in finishing order (index 0 = 1st place). Always 4 rows.
  rows: TeamStats[];
  // True if every team has played all 3 matches AND all ties were resolvable
  // (either by the engine or by user via manualTies).
  decided: boolean;
  // Sets of team names that the engine cannot order without user input.
  // Each unresolved tie shows up as one entry. The teams are in their tied
  // (alphabetical) order, not a finishing order.
  unresolvedTies: { key: string; teams: string[] }[];
};

function emptyStats(team: string): TeamStats {
  return {
    team,
    group: TEAM_GROUP[team],
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    complete: false,
  };
}

function addResult(stats: TeamStats, gf: number, ga: number) {
  stats.played += 1;
  stats.goalsFor += gf;
  stats.goalsAgainst += ga;
  stats.goalDiff = stats.goalsFor - stats.goalsAgainst;
  if (gf > ga) {
    stats.won += 1;
    stats.points += 3;
  } else if (gf === ga) {
    stats.drawn += 1;
    stats.points += 1;
  } else {
    stats.lost += 1;
  }
}

// Compute raw stats for every team in a group.
export function computeGroupStats(group: GroupId, results: Record<string, GroupResult>): TeamStats[] {
  const stats: Record<string, TeamStats> = {};
  for (const team of GROUPS[group]) stats[team] = emptyStats(team);

  const fixtures = GROUP_FIXTURES.filter((f) => f.group === group);
  for (const f of fixtures) {
    const r = results[f.id];
    if (!r) continue;
    addResult(stats[f.home], r.homeGoals, r.awayGoals);
    addResult(stats[f.away], r.awayGoals, r.homeGoals);
  }

  for (const team of GROUPS[group]) stats[team].complete = stats[team].played === 3;
  return GROUPS[group].map((t) => stats[t]);
}

// Compute head-to-head stats for a subset of teams using only the matches
// played among that subset.
type H2H = { points: number; goalDiff: number; goalsFor: number };

function headToHead(group: GroupId, teams: string[], results: Record<string, GroupResult>): Record<string, H2H> {
  const set = new Set(teams);
  const out: Record<string, H2H> = {};
  for (const t of teams) out[t] = { points: 0, goalDiff: 0, goalsFor: 0 };

  for (const f of GROUP_FIXTURES.filter((x) => x.group === group)) {
    if (!set.has(f.home) || !set.has(f.away)) continue;
    const r = results[f.id];
    if (!r) continue;
    out[f.home].goalsFor += r.homeGoals;
    out[f.home].goalDiff += r.homeGoals - r.awayGoals;
    out[f.away].goalsFor += r.awayGoals;
    out[f.away].goalDiff += r.awayGoals - r.homeGoals;
    if (r.homeGoals > r.awayGoals) out[f.home].points += 3;
    else if (r.homeGoals < r.awayGoals) out[f.away].points += 3;
    else {
      out[f.home].points += 1;
      out[f.away].points += 1;
    }
  }
  return out;
}

// Key used to look up manual tie resolutions. Stable regardless of input order.
export function tieKey(group: GroupId, teams: string[]): string {
  return `group:${group}:${[...teams].sort().join("|")}`;
}

// Split a list of teams into clusters of teams that are tied under a given
// comparator. Each cluster preserves the input order (which is irrelevant for
// ties but keeps things stable).
function clusterBy<T>(items: T[], same: (a: T, b: T) => boolean): T[][] {
  const out: T[][] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && same(last[0], item)) last.push(item);
    else out.push([item]);
  }
  return out;
}

// Rank a cluster of teams that are tied on overall points. Returns the cluster
// in finishing order (best first), and the list of any sub-clusters that
// remained tied after the engine ran out of criteria.
function rankTiedCluster(
  group: GroupId,
  cluster: TeamStats[],
  results: Record<string, GroupResult>,
  manualTies: AppState["manualTies"],
  unresolved: { key: string; teams: string[] }[]
): TeamStats[] {
  if (cluster.length <= 1) return cluster;

  // Step (i)-(iii): head-to-head among the tied teams. If a sub-cluster
  // remains tied after all three, recurse (FIFA rule).
  const h2h = headToHead(
    group,
    cluster.map((t) => t.team),
    results
  );

  const byH2H = [...cluster].sort((a, b) => {
    const ha = h2h[a.team];
    const hb = h2h[b.team];
    if (hb.points !== ha.points) return hb.points - ha.points;
    if (hb.goalDiff !== ha.goalDiff) return hb.goalDiff - ha.goalDiff;
    if (hb.goalsFor !== ha.goalsFor) return hb.goalsFor - ha.goalsFor;
    return 0;
  });

  // Group by h2h equivalence.
  const h2hClusters = clusterBy(byH2H, (a, b) => {
    const ha = h2h[a.team];
    const hb = h2h[b.team];
    return ha.points === hb.points && ha.goalDiff === hb.goalDiff && ha.goalsFor === hb.goalsFor;
  });

  const result: TeamStats[] = [];
  for (const sub of h2hClusters) {
    if (sub.length === 1) {
      result.push(sub[0]);
      continue;
    }
    // Recurse h2h on the smaller sub-cluster ONLY IF it's smaller than the
    // current cluster. Otherwise we'd loop forever. Then fall back to overall
    // criteria.
    if (sub.length < cluster.length) {
      result.push(...rankTiedCluster(group, sub, results, manualTies, unresolved));
      continue;
    }

    // Step (iv)-(v): overall GD then overall GF.
    const byOverall = [...sub].sort((a, b) => {
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return 0;
    });

    const overallClusters = clusterBy(
      byOverall,
      (a, b) => a.goalDiff === b.goalDiff && a.goalsFor === b.goalsFor
    );

    for (const finalSub of overallClusters) {
      if (finalSub.length === 1) {
        result.push(finalSub[0]);
        continue;
      }
      // Unresolvable by the engine. Look up manual resolution.
      const teamNames = finalSub.map((t) => t.team);
      const key = tieKey(group, teamNames);
      const manual = manualTies[key];
      if (manual && manual.length === teamNames.length && manual.every((t) => teamNames.includes(t))) {
        const byTeam = new Map(finalSub.map((s) => [s.team, s]));
        for (const t of manual) result.push(byTeam.get(t)!);
      } else {
        // Surface to the UI; emit teams in alphabetical order for stability.
        unresolved.push({ key, teams: [...teamNames].sort() });
        // Use alphabetical order as a placeholder ordering so the rest of the
        // table renders.
        for (const t of [...finalSub].sort((a, b) => a.team.localeCompare(b.team))) result.push(t);
      }
    }
  }

  return result;
}

export function computeGroupTable(
  group: GroupId,
  results: Record<string, GroupResult>,
  manualTies: AppState["manualTies"]
): GroupTable {
  const stats = computeGroupStats(group, results);
  const byPoints = [...stats].sort((a, b) => b.points - a.points);
  const clusters = clusterBy(byPoints, (a, b) => a.points === b.points);

  const unresolvedTies: { key: string; teams: string[] }[] = [];
  const rows: TeamStats[] = [];
  for (const cluster of clusters) {
    rows.push(...rankTiedCluster(group, cluster, results, manualTies, unresolvedTies));
  }

  const allPlayed = stats.every((s) => s.complete);
  return {
    group,
    rows,
    decided: allPlayed && unresolvedTies.length === 0,
    unresolvedTies,
  };
}

export function computeAllGroupTables(state: AppState): GroupTable[] {
  return (Object.keys(GROUPS) as GroupId[]).map((g) =>
    computeGroupTable(g, state.groupResults, state.manualTies)
  );
}
