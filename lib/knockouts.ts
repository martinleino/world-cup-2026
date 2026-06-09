import { KNOCKOUT_FIXTURES } from "./tournament-data";
import { computeAllGroupTables } from "./standings";
import type { GroupTable } from "./standings";
import { rankThirdPlaced, assignThirdPlaceSlots, type ThirdPlaceRanking } from "./third-place";
import type { AppState, KnockoutFixture, KnockoutSlot } from "./types";

export type ResolvedKnockout = {
  fixture: KnockoutFixture;
  homeTeam?: string; // undefined = not yet known
  awayTeam?: string;
  homeLabel: string; // human-readable placeholder when team unknown
  awayLabel: string;
  winner?: string;
  loser?: string;
  decisionStage?: "FT" | "AET" | "PENS";
};

export type TournamentSnapshot = {
  groupTables: GroupTable[];
  thirdPlace: ThirdPlaceRanking;
  thirdPlaceAssignment: Record<number, import("./types").GroupId> | null;
  knockouts: Map<number, ResolvedKnockout>;
  champion?: string;
};

function slotPlaceholder(slot: KnockoutSlot): string {
  switch (slot.kind) {
    case "groupPos":
      return slot.pos === 1 ? `Winner Group ${slot.group}` : `Runner-up Group ${slot.group}`;
    case "thirdFrom":
      return `3rd-placed team (from ${slot.allowed.join("/")})`;
    case "winnerOf":
      return `Winner of Match ${slot.matchId}`;
    case "loserOf":
      return `Loser of Match ${slot.matchId}`;
  }
}

function resolveSlot(
  slot: KnockoutSlot,
  groupTables: GroupTable[],
  thirdPlaceAssignment: Record<number, import("./types").GroupId> | null,
  knockouts: Map<number, ResolvedKnockout>
): string | undefined {
  switch (slot.kind) {
    case "groupPos": {
      const t = groupTables.find((g) => g.group === slot.group);
      if (!t || !t.decided) return undefined;
      return t.rows[slot.pos - 1]?.team;
    }
    case "thirdFrom": {
      if (!thirdPlaceAssignment) return undefined;
      // Find the slot whose home or away is this `thirdFrom` constraint by
      // matching the `allowed` set against the assignment. Since each R32
      // match has at most one thirdFrom slot, look up by matchId via the
      // fixture list using `allowed` as a unique key (allowed sets are
      // distinct across the 8 third-place slots).
      const fixture = KNOCKOUT_FIXTURES.find(
        (f) =>
          (f.home.kind === "thirdFrom" && arraysEqual(f.home.allowed, slot.allowed)) ||
          (f.away.kind === "thirdFrom" && arraysEqual(f.away.allowed, slot.allowed))
      );
      if (!fixture) return undefined;
      const group = thirdPlaceAssignment[fixture.id];
      if (!group) return undefined;
      const t = groupTables.find((g) => g.group === group);
      if (!t || !t.decided) return undefined;
      return t.rows[2]?.team;
    }
    case "winnerOf": {
      const up = knockouts.get(slot.matchId);
      return up?.winner;
    }
    case "loserOf": {
      const up = knockouts.get(slot.matchId);
      return up?.loser;
    }
  }
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Determine winner/loser for a KO match from the entered result.
function decideMatch(
  homeTeam: string | undefined,
  awayTeam: string | undefined,
  r: AppState["knockoutResults"][number] | undefined
): Pick<ResolvedKnockout, "winner" | "loser" | "decisionStage"> {
  if (!homeTeam || !awayTeam || !r) return {};

  const ft =
    r.ftHome !== undefined && r.ftAway !== undefined ? { h: r.ftHome, a: r.ftAway } : undefined;
  if (!ft) return {};

  if (ft.h > ft.a) return { winner: homeTeam, loser: awayTeam, decisionStage: "FT" };
  if (ft.h < ft.a) return { winner: awayTeam, loser: homeTeam, decisionStage: "FT" };

  // FT was a draw — need AET.
  const aet =
    r.aetHome !== undefined && r.aetAway !== undefined ? { h: r.aetHome, a: r.aetAway } : undefined;
  if (!aet) return {};

  if (aet.h > aet.a) return { winner: homeTeam, loser: awayTeam, decisionStage: "AET" };
  if (aet.h < aet.a) return { winner: awayTeam, loser: homeTeam, decisionStage: "AET" };

  // AET was a draw too — need penalties.
  const pen =
    r.penHome !== undefined && r.penAway !== undefined ? { h: r.penHome, a: r.penAway } : undefined;
  if (!pen) return {};

  if (pen.h > pen.a) return { winner: homeTeam, loser: awayTeam, decisionStage: "PENS" };
  if (pen.h < pen.a) return { winner: awayTeam, loser: homeTeam, decisionStage: "PENS" };
  // Equal pens is invalid; leave undecided.
  return {};
}

export function computeSnapshot(state: AppState): TournamentSnapshot {
  const groupTables = computeAllGroupTables(state);
  const thirdPlace = rankThirdPlaced(state, groupTables);
  const thirdPlaceAssignment = thirdPlace.decided
    ? assignThirdPlaceSlots(thirdPlace.qualifyingGroups)
    : null;

  const knockouts = new Map<number, ResolvedKnockout>();

  // Process fixtures in match-id order so upstream matches resolve before
  // downstream ones (R32 73-88, R16 89-96, QF 97-100, SF 101-102, then 103/104).
  const fixturesInOrder = [...KNOCKOUT_FIXTURES].sort((a, b) => a.id - b.id);
  for (const fx of fixturesInOrder) {
    const homeTeam = resolveSlot(fx.home, groupTables, thirdPlaceAssignment, knockouts);
    const awayTeam = resolveSlot(fx.away, groupTables, thirdPlaceAssignment, knockouts);
    const decision = decideMatch(homeTeam, awayTeam, state.knockoutResults[fx.id]);
    knockouts.set(fx.id, {
      fixture: fx,
      homeTeam,
      awayTeam,
      homeLabel: homeTeam ?? slotPlaceholder(fx.home),
      awayLabel: awayTeam ?? slotPlaceholder(fx.away),
      ...decision,
    });
  }

  const final = knockouts.get(104);
  return {
    groupTables,
    thirdPlace,
    thirdPlaceAssignment,
    knockouts,
    champion: final?.winner,
  };
}
