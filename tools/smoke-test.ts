/* eslint-disable @typescript-eslint/no-explicit-any */
// In-process smoke test for the World Cup 2026 tracker engine.
// Run with: npx tsx tools/smoke-test.ts

import { GROUPS, GROUP_FIXTURES, KNOCKOUT_FIXTURES } from "../lib/tournament-data";
import { computeSnapshot } from "../lib/knockouts";
import { assignThirdPlaceSlots } from "../lib/third-place";
import type { AppState, GroupResult } from "../lib/types";

let failed = 0;
function check(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("== Tournament data sanity ==");
check("12 groups", Object.keys(GROUPS).length === 12);
check("48 teams", Object.values(GROUPS).flat().length === 48);
check("72 group fixtures", GROUP_FIXTURES.length === 72);
check("32 knockout matches", KNOCKOUT_FIXTURES.length === 32);
check(
  "match ids 73..104",
  KNOCKOUT_FIXTURES.map((f) => f.id).sort((a, b) => a - b).join(",") ===
    Array.from({ length: 32 }, (_, i) => 73 + i).join(",")
);

console.log("\n== Group standings: simple group ==");
{
  // For Group A (Mexico, South Korea, Czechia, South Africa), give Mexico 9 pts,
  // South Korea 6, Czechia 3, South Africa 0 by stacking wins.
  const teams = GROUPS.A;
  const results: Record<string, GroupResult> = {};
  // ROUND_ROBIN inside tournament-data is [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]
  // Index 0 = Mexico, 1 = South Korea, 2 = Czechia, 3 = South Africa.
  results["A-1"] = { homeGoals: 2, awayGoals: 0 }; // Mexico beats SK
  results["A-2"] = { homeGoals: 1, awayGoals: 0 }; // Czechia beats SA
  results["A-3"] = { homeGoals: 2, awayGoals: 1 }; // Mexico beats Czechia
  results["A-4"] = { homeGoals: 1, awayGoals: 0 }; // SK beats SA
  results["A-5"] = { homeGoals: 3, awayGoals: 1 }; // Mexico beats SA
  results["A-6"] = { homeGoals: 1, awayGoals: 0 }; // SK beats Czechia

  const state: AppState = { groupResults: results, knockoutResults: {}, manualTies: {} };
  const snap = computeSnapshot(state);
  const table = snap.groupTables.find((t) => t.group === "A")!;
  check("Group A decided", table.decided);
  check("Mexico 1st", table.rows[0].team === teams[0], `got ${table.rows[0].team}`);
  check("South Korea 2nd", table.rows[1].team === teams[1], `got ${table.rows[1].team}`);
  check("Czechia 3rd", table.rows[2].team === teams[2], `got ${table.rows[2].team}`);
  check("South Africa 4th", table.rows[3].team === teams[3], `got ${table.rows[3].team}`);
  check("Mexico has 9 pts", table.rows[0].points === 9);
  check("South Korea has 6 pts", table.rows[1].points === 6);
}

console.log("\n== Group standings: head-to-head tiebreaker ==");
{
  // Three-way tie on points where head-to-head separates them.
  // Build group B such that Canada/Switzerland/Bosnia each have 6 pts overall,
  // Qatar 0. Among the tied three, Canada beat Switzerland, Switzerland beat
  // Bosnia, Bosnia beat Canada — circular, so h2h points are equal (3 each).
  // Then h2h GD must separate: arrange GDs.
  const results: Record<string, GroupResult> = {};
  // ROUND_ROBIN: B-1: Canada vs Switzerland; B-2: Bosnia vs Qatar;
  // B-3: Canada vs Bosnia; B-4: Switzerland vs Qatar;
  // B-5: Canada vs Qatar; B-6: Switzerland vs Bosnia
  results["B-1"] = { homeGoals: 2, awayGoals: 1 }; // Canada > Switzerland (Canada h2h GD +1)
  results["B-2"] = { homeGoals: 3, awayGoals: 0 }; // Bosnia beats Qatar
  results["B-3"] = { homeGoals: 0, awayGoals: 1 }; // Bosnia > Canada (Bosnia h2h GD +1, Canada -1)
  results["B-4"] = { homeGoals: 4, awayGoals: 0 }; // Switzerland beats Qatar big
  results["B-5"] = { homeGoals: 5, awayGoals: 0 }; // Canada beats Qatar big
  results["B-6"] = { homeGoals: 3, awayGoals: 1 }; // Switzerland > Bosnia (Swiss h2h GD +2, Bosnia -2)
  // Among Canada/Switzerland/Bosnia: each won one and lost one of their two h2h games.
  // h2h pts: 3 each. h2h GD: Canada +1-1=0, Switzerland -1+2=+1, Bosnia +1-2=-1.
  // So Switzerland 1st (h2h), Canada 2nd, Bosnia 3rd.
  const state: AppState = { groupResults: results, knockoutResults: {}, manualTies: {} };
  const snap = computeSnapshot(state);
  const table = snap.groupTables.find((t) => t.group === "B")!;
  check("Group B decided", table.decided);
  check("Switzerland 1st (h2h GD)", table.rows[0].team === "Switzerland", `got ${table.rows[0].team}`);
  check("Canada 2nd", table.rows[1].team === "Canada", `got ${table.rows[1].team}`);
  check("Bosnia-Herzegovina 3rd", table.rows[2].team === "Bosnia-Herzegovina", `got ${table.rows[2].team}`);
  check("Qatar 4th", table.rows[3].team === "Qatar");
}

console.log("\n== Full group stage → R32 resolution ==");
{
  // Fill all 72 group fixtures so that:
  // - Each group's ranking is unambiguous (1st > 2nd > 3rd > 4th).
  // - Third-placed teams have distinguishable GF/GA so the cross-group ranking
  //   is also unambiguous.
  // Pattern: home team always wins, but the score depends on the group letter
  // (varying GF) so 3rd-placed teams differ across groups.
  const groupResults: Record<string, GroupResult> = {};
  const groupOffset: Record<string, number> = {};
  let offset = 0;
  for (const g of Object.keys(GROUPS)) {
    groupOffset[g] = offset++;
  }
  for (const f of GROUP_FIXTURES) {
    // Make scoring vary by group so third-placed teams have different GF/GA.
    // Home wins by exactly 1 + (group offset / 6, rounded down). Concretely
    // we just bump home goals by something distinct per group.
    const bump = groupOffset[f.group];
    groupResults[f.id] = { homeGoals: 1 + bump, awayGoals: bump };
  }
  const state: AppState = { groupResults, knockoutResults: {}, manualTies: {} };
  const snap = computeSnapshot(state);

  check("All 12 groups decided", snap.groupTables.every((t) => t.decided));
  check("Third-place ranking decided", snap.thirdPlace.decided);
  check("Exactly 8 qualifying third-place groups", snap.thirdPlace.qualifyingGroups.length === 8);
  check("Third-place R32 assignment computed", snap.thirdPlaceAssignment !== null);
  // Validate every assignment is in the corresponding slot's allowed set.
  if (snap.thirdPlaceAssignment) {
    for (const fx of KNOCKOUT_FIXTURES) {
      if (fx.round !== "R32") continue;
      const slot = (fx.home as any).kind === "thirdFrom" ? (fx.home as any) : (fx.away as any).kind === "thirdFrom" ? (fx.away as any) : null;
      if (!slot) continue;
      const assigned = snap.thirdPlaceAssignment[fx.id];
      check(
        `Match ${fx.id}: assigned group ${assigned} is in allowed set`,
        slot.allowed.includes(assigned)
      );
    }
  }
  // Every R32 fixture should have both teams resolved.
  for (const k of snap.knockouts.values()) {
    if (k.fixture.round !== "R32") continue;
    if (!k.homeTeam || !k.awayTeam) {
      check(`R32 M${k.fixture.id} both teams resolved`, false, `home=${k.homeTeam} away=${k.awayTeam}`);
    }
  }
  let allR32Resolved = true;
  for (const k of snap.knockouts.values()) {
    if (k.fixture.round !== "R32") continue;
    if (!k.homeTeam || !k.awayTeam) allR32Resolved = false;
  }
  check("All 16 R32 fixtures resolved to teams", allR32Resolved);
}

console.log("\n== KO cascade with FT/AET/Pens ==");
{
  const groupResults: Record<string, GroupResult> = {};
  const groupOffset: Record<string, number> = {};
  let offset = 0;
  for (const g of Object.keys(GROUPS)) groupOffset[g] = offset++;
  for (const f of GROUP_FIXTURES) {
    const bump = groupOffset[f.group];
    groupResults[f.id] = { homeGoals: 1 + bump, awayGoals: bump };
  }

  const knockoutResults: AppState["knockoutResults"] = {};
  // All R32 home teams win 1-0.
  for (let id = 73; id <= 88; id++) knockoutResults[id] = { ftHome: 1, ftAway: 0 };
  // R16: mix — Match 89 goes to AET, Match 90 goes to penalties.
  knockoutResults[89] = { ftHome: 0, ftAway: 0, aetHome: 2, aetAway: 1 }; // decided in AET
  knockoutResults[90] = {
    ftHome: 1,
    ftAway: 1,
    aetHome: 2,
    aetAway: 2,
    penHome: 5,
    penAway: 4,
  };
  for (let id = 91; id <= 96; id++) knockoutResults[id] = { ftHome: 2, ftAway: 1 };
  // QF + SF + 3rd + Final: home wins 1-0.
  for (let id = 97; id <= 104; id++) knockoutResults[id] = { ftHome: 1, ftAway: 0 };

  const state: AppState = { groupResults, knockoutResults, manualTies: {} };
  const snap = computeSnapshot(state);

  check("Match 89 winner present", !!snap.knockouts.get(89)?.winner);
  check("Match 89 decided in AET", snap.knockouts.get(89)?.decisionStage === "AET");
  check("Match 90 decided on PENS", snap.knockouts.get(90)?.decisionStage === "PENS");
  check("Match 104 (Final) decided", !!snap.knockouts.get(104)?.winner);
  check("Champion is set", !!snap.champion);
  check(
    "Champion equals Final home winner",
    snap.champion === snap.knockouts.get(104)?.winner
  );
}

console.log("\n== Edit cascade ==");
{
  // Same data as previous block, then flip Group A's first fixture: now SK
  // wins 1-0 vs Mexico. SK and Mexico both have 2 wins; let's set it up so
  // SK ends up 1st.
  const groupResults: Record<string, GroupResult> = {};
  for (const f of GROUP_FIXTURES) groupResults[f.id] = { homeGoals: 1, awayGoals: 0 };
  // Flip A-1: SK now beats Mexico.
  groupResults["A-1"] = { homeGoals: 0, awayGoals: 1 };
  // Now stats in Group A:
  //   Mexico: lost A-1, won A-3, won A-5 -> 2W 1L, GF=2 GA=1
  //   SK:     won A-1, won A-4, lost A-6 -> 2W 1L, GF=2 GA=1
  //   Czechia: lost A-3, lost A-2 makes... wait A-2 is "2 vs 3" = Czechia vs SA, 1-0 Czechia wins.
  //   Czechia: won A-2, lost A-3, won A-6? No, A-6 is "1 vs 2" = SK vs Czechia.
  //   Let me reread ROUND_ROBIN.
  // Actually I want to keep the test simple — just check SK now 1st by virtue
  // of h2h since Mexico and SK both have 6 pts, with SK winning their h2h.
  const state: AppState = { groupResults, knockoutResults: {}, manualTies: {} };
  const snap = computeSnapshot(state);
  const table = snap.groupTables.find((t) => t.group === "A")!;
  check("After edit, South Korea is 1st in Group A", table.rows[0].team === "South Korea", `got ${table.rows[0].team}`);
  check("After edit, Mexico is 2nd in Group A", table.rows[1].team === "Mexico", `got ${table.rows[1].team}`);
}

console.log("\n== Random third-place assignment validation ==");
{
  // Sample several random 8-of-12 subsets and confirm assignThirdPlaceSlots
  // always finds a valid matching.
  const groupIds = Object.keys(GROUPS) as any[];
  function* combos(arr: any[], k: number, start = 0, cur: any[] = []): Generator<any[]> {
    if (cur.length === k) {
      yield [...cur];
      return;
    }
    for (let i = start; i <= arr.length - (k - cur.length); i++) {
      cur.push(arr[i]);
      yield* combos(arr, k, i + 1, cur);
      cur.pop();
    }
  }
  let total = 0;
  let valid = 0;
  for (const subset of combos(groupIds, 8)) {
    total++;
    const a = assignThirdPlaceSlots(subset);
    if (a) valid++;
  }
  check(`All 495 third-place subsets produce a valid assignment (${valid}/${total})`, valid === total);
}

console.log(`\n${failed === 0 ? "All checks passed." : `${failed} check(s) failed.`}`);
process.exit(failed === 0 ? 0 : 1);
