import type { GroupFixture, GroupId, KnockoutFixture } from "./types";

// 2026 FIFA World Cup final draw (5 December 2025).
// Order within each group is for display only; standings are derived from results.
export const GROUPS: Record<GroupId, string[]> = {
  A: ["Mexico", "South Korea", "Czechia", "South Africa"],
  B: ["Canada", "Switzerland", "Bosnia-Herzegovina", "Qatar"],
  C: ["Brazil", "Scotland", "Morocco", "Haiti"],
  D: ["USA", "Türkiye", "Paraguay", "Australia"],
  E: ["Germany", "Ecuador", "Ivory Coast", "Curaçao"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Uruguay", "Saudi Arabia", "Cape Verde"],
  I: ["France", "Senegal", "Norway", "Iraq"],
  J: ["Argentina", "Austria", "Algeria", "Jordan"],
  K: ["Portugal", "Colombia", "Congo DR", "Uzbekistan"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

// All teams as a flat lookup.
export const ALL_TEAMS: string[] = Object.values(GROUPS).flat();

// Each team's group, for quick lookup.
export const TEAM_GROUP: Record<string, GroupId> = (() => {
  const m: Record<string, GroupId> = {};
  for (const [g, teams] of Object.entries(GROUPS) as [GroupId, string[]][]) {
    for (const t of teams) m[t] = g;
  }
  return m;
})();

// Round-robin pairings for each group of 4. Indices into the group's team array.
// The exact ordering of fixtures doesn't matter for the engine; this is just a
// fixed ordering for stable display.
const ROUND_ROBIN: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];

export const GROUP_FIXTURES: GroupFixture[] = (() => {
  const fixtures: GroupFixture[] = [];
  for (const [g, teams] of Object.entries(GROUPS) as [GroupId, string[]][]) {
    ROUND_ROBIN.forEach(([h, a], idx) => {
      fixtures.push({
        id: `${g}-${idx + 1}`,
        group: g,
        home: teams[h],
        away: teams[a],
      });
    });
  }
  return fixtures;
})();

// 32 knockout matches numbered 73..104 (continuing FIFA's overall match numbering).
// Source: Wikipedia "2026 FIFA World Cup knockout stage".
export const KNOCKOUT_FIXTURES: KnockoutFixture[] = [
  // Round of 32
  { id: 73, round: "R32", home: { kind: "groupPos", group: "A", pos: 2 }, away: { kind: "groupPos", group: "B", pos: 2 } },
  { id: 74, round: "R32", home: { kind: "groupPos", group: "E", pos: 1 }, away: { kind: "thirdFrom", allowed: ["A", "B", "C", "D", "F"] } },
  { id: 75, round: "R32", home: { kind: "groupPos", group: "F", pos: 1 }, away: { kind: "groupPos", group: "C", pos: 2 } },
  { id: 76, round: "R32", home: { kind: "groupPos", group: "C", pos: 1 }, away: { kind: "groupPos", group: "F", pos: 2 } },
  { id: 77, round: "R32", home: { kind: "groupPos", group: "I", pos: 1 }, away: { kind: "thirdFrom", allowed: ["C", "D", "F", "G", "H"] } },
  { id: 78, round: "R32", home: { kind: "groupPos", group: "E", pos: 2 }, away: { kind: "groupPos", group: "I", pos: 2 } },
  { id: 79, round: "R32", home: { kind: "groupPos", group: "A", pos: 1 }, away: { kind: "thirdFrom", allowed: ["C", "E", "F", "H", "I"] } },
  { id: 80, round: "R32", home: { kind: "groupPos", group: "L", pos: 1 }, away: { kind: "thirdFrom", allowed: ["E", "H", "I", "J", "K"] } },
  { id: 81, round: "R32", home: { kind: "groupPos", group: "D", pos: 1 }, away: { kind: "thirdFrom", allowed: ["B", "E", "F", "I", "J"] } },
  { id: 82, round: "R32", home: { kind: "groupPos", group: "G", pos: 1 }, away: { kind: "thirdFrom", allowed: ["A", "E", "H", "I", "J"] } },
  { id: 83, round: "R32", home: { kind: "groupPos", group: "K", pos: 2 }, away: { kind: "groupPos", group: "L", pos: 2 } },
  { id: 84, round: "R32", home: { kind: "groupPos", group: "H", pos: 1 }, away: { kind: "groupPos", group: "J", pos: 2 } },
  { id: 85, round: "R32", home: { kind: "groupPos", group: "B", pos: 1 }, away: { kind: "thirdFrom", allowed: ["E", "F", "G", "I", "J"] } },
  { id: 86, round: "R32", home: { kind: "groupPos", group: "J", pos: 1 }, away: { kind: "groupPos", group: "H", pos: 2 } },
  { id: 87, round: "R32", home: { kind: "groupPos", group: "K", pos: 1 }, away: { kind: "thirdFrom", allowed: ["D", "E", "I", "J", "L"] } },
  { id: 88, round: "R32", home: { kind: "groupPos", group: "D", pos: 2 }, away: { kind: "groupPos", group: "G", pos: 2 } },

  // Round of 16
  { id: 89, round: "R16", home: { kind: "winnerOf", matchId: 74 }, away: { kind: "winnerOf", matchId: 77 } },
  { id: 90, round: "R16", home: { kind: "winnerOf", matchId: 73 }, away: { kind: "winnerOf", matchId: 75 } },
  { id: 91, round: "R16", home: { kind: "winnerOf", matchId: 76 }, away: { kind: "winnerOf", matchId: 78 } },
  { id: 92, round: "R16", home: { kind: "winnerOf", matchId: 79 }, away: { kind: "winnerOf", matchId: 80 } },
  { id: 93, round: "R16", home: { kind: "winnerOf", matchId: 83 }, away: { kind: "winnerOf", matchId: 84 } },
  { id: 94, round: "R16", home: { kind: "winnerOf", matchId: 81 }, away: { kind: "winnerOf", matchId: 82 } },
  { id: 95, round: "R16", home: { kind: "winnerOf", matchId: 86 }, away: { kind: "winnerOf", matchId: 88 } },
  { id: 96, round: "R16", home: { kind: "winnerOf", matchId: 85 }, away: { kind: "winnerOf", matchId: 87 } },

  // Quarter-finals
  { id: 97, round: "QF", home: { kind: "winnerOf", matchId: 89 }, away: { kind: "winnerOf", matchId: 90 } },
  { id: 98, round: "QF", home: { kind: "winnerOf", matchId: 93 }, away: { kind: "winnerOf", matchId: 94 } },
  { id: 99, round: "QF", home: { kind: "winnerOf", matchId: 91 }, away: { kind: "winnerOf", matchId: 92 } },
  { id: 100, round: "QF", home: { kind: "winnerOf", matchId: 95 }, away: { kind: "winnerOf", matchId: 96 } },

  // Semi-finals
  { id: 101, round: "SF", home: { kind: "winnerOf", matchId: 97 }, away: { kind: "winnerOf", matchId: 98 } },
  { id: 102, round: "SF", home: { kind: "winnerOf", matchId: 99 }, away: { kind: "winnerOf", matchId: 100 } },

  // Third-place play-off + Final
  { id: 103, round: "Third", home: { kind: "loserOf", matchId: 101 }, away: { kind: "loserOf", matchId: 102 } },
  { id: 104, round: "Final", home: { kind: "winnerOf", matchId: 101 }, away: { kind: "winnerOf", matchId: 102 } },
];

export const ROUND_LABELS: Record<KnockoutFixture["round"], string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  Third: "Third-place play-off",
  Final: "Final",
};
