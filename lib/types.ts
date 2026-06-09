export type GroupId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

export const GROUP_IDS: GroupId[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export type GroupFixture = {
  id: string;
  group: GroupId;
  home: string;
  away: string;
};

export type GroupResult = {
  homeGoals: number;
  awayGoals: number;
};

// A knockout slot can be:
//  - a concrete team (resolved)
//  - a placeholder referring to a group position (1A, 2C)
//  - a placeholder referring to one of the third-place sets ("3 from {A,B,C,D,F}")
//  - a placeholder referring to the winner/loser of another KO match
export type KnockoutSlot =
  | { kind: "groupPos"; group: GroupId; pos: 1 | 2 }
  | { kind: "thirdFrom"; allowed: GroupId[] }
  | { kind: "winnerOf"; matchId: number }
  | { kind: "loserOf"; matchId: number };

export type KnockoutFixture = {
  id: number;
  round: "R32" | "R16" | "QF" | "SF" | "Third" | "Final";
  home: KnockoutSlot;
  away: KnockoutSlot;
};

export type KnockoutResult = {
  // Full-time (90 min)
  ftHome?: number;
  ftAway?: number;
  // After extra time (cumulative). Only meaningful when FT is a draw.
  aetHome?: number;
  aetAway?: number;
  // Penalty shootout. Only meaningful when AET is a draw.
  penHome?: number;
  penAway?: number;
};

// Manual tie-resolution: when the engine cannot rank teams within a group
// or among third-placed teams, the user picks the ordering manually.
// We store a map from "tie context key" -> ordered array of team names.
export type ManualTieResolutions = Record<string, string[]>;

export type AppState = {
  groupResults: Record<string, GroupResult>; // keyed by GroupFixture.id
  knockoutResults: Record<number, KnockoutResult>; // keyed by match id
  manualTies: ManualTieResolutions;
};

export const EMPTY_STATE: AppState = {
  groupResults: {},
  knockoutResults: {},
  manualTies: {},
};
