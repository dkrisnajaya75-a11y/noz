import test from 'node:test';
import assert from 'node:assert/strict';
import { Club, Player } from '../types/badminton';
import {
  addPlayerGroup,
  applyClubConfiguration,
  computeEvennessStats,
  finishCourtMatch,
  getLineupPlayerIds,
  isGroupFulfilledInCourt,
  isPlayerPresent,
  isValidGenderMatch,
  reconcileOpenCourts,
  removePlayerGroup,
  setBulkAttendance,
  setPlayerAttendance,
  startCourtMatch,
  suggestLineupForCourt,
  swapSlotWithPlayerOrSlot,
} from './scheduler';
import { createInitialAppState } from './seedData';

function makePlayer(
  id: string,
  overrides: Partial<Player> = {}
): Player {
  return {
    id,
    name: `Pemain ${id}`,
    gender: 'M',
    level: 2,
    isActive: true,
    assignedCourtId: 'c1',
    matchesPlayed: 0,
    lastPlayedAt: 0,
    ...overrides,
  };
}

function makeBaseClub(players: Player[], courtCount = 2): Club {
  return {
    id: 'club_test',
    name: 'Klub Uji',
    players,
    courts: Array.from({ length: courtCount }, (_, i) => ({
      id: `c${i + 1}`,
      number: i + 1,
      name: `Lapangan ${i + 1}`,
      status: 'open' as const,
      lineup: { teamA: [null, null], teamB: [null, null] },
      pinnedPlayerIds: [],
      startedAt: null,
    })),
    records: [],
    settings: {
      matchingMode: 'balanced',
      genderMatching: 'free',
      sameGenderPercent: 50,
      queueMode: 'shared',
      genderStyle: 'soft_bg',
    },
    sequenceCounter: 0,
  };
}

test('suggestLineupForCourt excludes players playing on other courts and resting players', () => {
  const players = [
    makePlayer('p1'),
    makePlayer('p2'),
    makePlayer('p3'),
    makePlayer('p4'),
    makePlayer('p5'),
    makePlayer('p6'),
    makePlayer('p7'),
    makePlayer('p8'),
    makePlayer('p9', { isActive: false }),
  ];
  const club = makeBaseClub(players, 2);
  club.courts[0].status = 'playing';
  club.courts[0].lineup = { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] };

  const suggestion = suggestLineupForCourt(club, 'c2');
  const ids = getLineupPlayerIds(suggestion);
  assert.equal(ids.length, 4);
  for (const id of ids) {
    assert.ok(['p5', 'p6', 'p7', 'p8'].includes(id));
  }
});

test('finishCourtMatch logs record, increments match counts, and instantly suggests next lineup just for that court', () => {
  const players = [
    makePlayer('p1'),
    makePlayer('p2'),
    makePlayer('p3'),
    makePlayer('p4'),
    makePlayer('p5'),
    makePlayer('p6'),
    makePlayer('p7'),
    makePlayer('p8'),
  ];
  let club = makeBaseClub(players, 1);
  club = reconcileOpenCourts(club);
  club = startCourtMatch(club, 'c1', 1000);
  assert.equal(club.courts[0].status, 'playing');

  const playedIds = new Set(getLineupPlayerIds(club.courts[0].lineup));
  club = finishCourtMatch(club, 'c1', 2000);

  assert.equal(club.courts[0].status, 'open');
  assert.equal(club.records.length, 1);

  // Played players have matchesPlayed === 1
  for (const p of club.players) {
    if (playedIds.has(p.id)) {
      assert.equal(p.matchesPlayed, 1);
    } else {
      assert.equal(p.matchesPlayed, 0);
    }
  }

  // Newly opened court c1 immediately suggests the 4 waiting players with 0 matches!
  const nextIds = getLineupPlayerIds(club.courts[0].lineup);
  assert.equal(nextIds.length, 4);
  for (const id of nextIds) {
    assert.equal(playedIds.has(id), false);
  }
});

test('scheduler avoids repeating the same partners', () => {
  const players = [
    makePlayer('p1', { matchesPlayed: 1, lastPlayedAt: 1 }),
    makePlayer('p2', { matchesPlayed: 1, lastPlayedAt: 2 }),
    makePlayer('p3', { matchesPlayed: 1, lastPlayedAt: 3 }),
    makePlayer('p4', { matchesPlayed: 1, lastPlayedAt: 4 }),
  ];
  const club = makeBaseClub(players, 1);
  // p1+p2 partnered together twice, p3+p4 partnered twice
  club.records = [
    {
      id: 'r1',
      courtId: 'c1',
      courtNumber: 1,
      courtName: 'Lapangan 1',
      teamA: ['p1', 'p2'],
      teamB: ['p3', 'p4'],
      timestamp: 100,
    },
    {
      id: 'r2',
      courtId: 'c1',
      courtNumber: 1,
      courtName: 'Lapangan 1',
      teamA: ['p1', 'p2'],
      teamB: ['p3', 'p4'],
      timestamp: 200,
    },
  ];

  const lineup = suggestLineupForCourt(club, 'c1');
  const teamASet = new Set(lineup.teamA);
  // Should NOT pair p1 & p2 together again
  assert.equal(teamASet.has('p1') && teamASet.has('p2'), false);
  assert.equal(teamASet.has('p3') && teamASet.has('p4'), false);
});

test('pinned players stay on the court across suggestions and rerolls', () => {
  const players = [
    makePlayer('p1', { matchesPlayed: 3 }),
    makePlayer('p2', { matchesPlayed: 0 }),
    makePlayer('p3', { matchesPlayed: 0 }),
    makePlayer('p4', { matchesPlayed: 0 }),
    makePlayer('p5', { matchesPlayed: 0 }),
    makePlayer('p6', { matchesPlayed: 0 }),
  ];
  const club = makeBaseClub(players, 1);
  club.courts[0].pinnedPlayerIds = ['p1'];

  const lineup = suggestLineupForCourt(club, 'c1');
  const ids = getLineupPlayerIds(lineup);
  assert.equal(ids.length, 4);
  assert.ok(ids.includes('p1'));
});

test('fairness mode vs level mode prioritizes differently', () => {
  const players = [
    // Low match count, wide skill levels
    makePlayer('p1', { level: 1, matchesPlayed: 0 }),
    makePlayer('p2', { level: 3, matchesPlayed: 0 }),
    // High match count, all level 2
    makePlayer('p3', { level: 2, matchesPlayed: 4 }),
    makePlayer('p4', { level: 2, matchesPlayed: 4 }),
    makePlayer('p5', { level: 2, matchesPlayed: 4 }),
    makePlayer('p6', { level: 2, matchesPlayed: 4 }),
  ];

  const fairnessClub = makeBaseClub(players, 1);
  fairnessClub.settings.matchingMode = 'fairness';
  const fairnessIds = getLineupPlayerIds(suggestLineupForCourt(fairnessClub, 'c1'));
  assert.ok(fairnessIds.includes('p1'));
  assert.ok(fairnessIds.includes('p2'));

  const levelClub = makeBaseClub(players, 1);
  levelClub.settings.matchingMode = 'level';
  const levelIds = new Set(getLineupPlayerIds(suggestLineupForCourt(levelClub, 'c1')));
  assert.deepEqual(levelIds, new Set(['p3', 'p4', 'p5', 'p6']));
});

test('split queue mode restricts each court to its assigned players', () => {
  const players = [
    makePlayer('p1', { assignedCourtId: 'c1' }),
    makePlayer('p2', { assignedCourtId: 'c1' }),
    makePlayer('p3', { assignedCourtId: 'c1' }),
    makePlayer('p4', { assignedCourtId: 'c1' }),
    makePlayer('p5', { assignedCourtId: 'c2' }),
    makePlayer('p6', { assignedCourtId: 'c2' }),
    makePlayer('p7', { assignedCourtId: 'c2' }),
    makePlayer('p8', { assignedCourtId: 'c2' }),
  ];
  const club = makeBaseClub(players, 2);
  club.settings.queueMode = 'split';

  const reconciled = reconcileOpenCourts(club);
  assert.deepEqual(
    new Set(getLineupPlayerIds(reconciled.courts[0].lineup)),
    new Set(['p1', 'p2', 'p3', 'p4'])
  );
  assert.deepEqual(
    new Set(getLineupPlayerIds(reconciled.courts[1].lineup)),
    new Set(['p5', 'p6', 'p7', 'p8'])
  );
});

test('swapSlotWithPlayerOrSlot swaps two court slots or swaps with a waiting player', () => {
  const players = [
    makePlayer('p1'),
    makePlayer('p2'),
    makePlayer('p3'),
    makePlayer('p4'),
    makePlayer('p5'),
  ];
  let club = makeBaseClub(players, 1);
  club.courts[0].lineup = { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] };

  // Swap slot 0 (p1) with slot 2 (p3)
  club = swapSlotWithPlayerOrSlot(club, 'c1', 0, { type: 'slot', slotIndex: 2 });
  assert.equal(club.courts[0].lineup.teamA[0], 'p3');
  assert.equal(club.courts[0].lineup.teamB[0], 'p1');

  // Swap slot 1 (p2) with waiting player p5
  club = swapSlotWithPlayerOrSlot(club, 'c1', 1, { type: 'player', playerId: 'p5' });
  assert.equal(club.courts[0].lineup.teamA[1], 'p5');
});

test('computeEvennessStats calculates 100% when all players have identical match counts', () => {
  const players = [
    makePlayer('p1', { matchesPlayed: 2 }),
    makePlayer('p2', { matchesPlayed: 2 }),
    makePlayer('p3', { matchesPlayed: 2 }),
    makePlayer('p4', { matchesPlayed: 2 }),
  ];
  const club = makeBaseClub(players, 1);
  const stats = computeEvennessStats(club);
  assert.equal(stats.averageMatches, 2);
  assert.equal(stats.minMatches, 2);
  assert.equal(stats.maxMatches, 2);
  assert.equal(stats.evennessPercent, 100);
});

test('same_or_mixed gender matching enforces 4M, 4F, or M+F vs M+F', () => {
  // 3M + 1F cannot form a valid same_or_mixed match, but adding 1 more M (4M + 1F) should pick 4M!
  const players = [
    makePlayer('m1', { gender: 'M', matchesPlayed: 0 }),
    makePlayer('m2', { gender: 'M', matchesPlayed: 0 }),
    makePlayer('m3', { gender: 'M', matchesPlayed: 0 }),
    makePlayer('f1', { gender: 'F', matchesPlayed: 0 }),
    makePlayer('m4', { gender: 'M', matchesPlayed: 1 }),
  ];
  const club = makeBaseClub(players, 1);
  club.settings.genderMatching = 'same_or_mixed';

  const lineup = suggestLineupForCourt(club, 'c1');
  const ids = getLineupPlayerIds(lineup);
  assert.equal(ids.length, 4);
  assert.equal(ids.includes('f1'), false);
  assert.deepEqual(new Set(ids), new Set(['m1', 'm2', 'm3', 'm4']));
});

test('same_or_mixed gender matching pairs 2M + 2F as M+F vs M+F instead of M+M vs F+F', () => {
  // Even if M+M (3+3=6) vs F+F (3+3=6) has 0 level gap, same_or_mixed must pair M+F vs M+F
  const players = [
    makePlayer('m1', { gender: 'M', level: 3 }),
    makePlayer('m2', { gender: 'M', level: 3 }),
    makePlayer('f1', { gender: 'F', level: 3 }),
    makePlayer('f2', { gender: 'F', level: 3 }),
  ];
  const club = makeBaseClub(players, 1);
  club.settings.genderMatching = 'same_or_mixed';

  const lineup = suggestLineupForCourt(club, 'c1');
  const pById = new Map(players.map((p) => [p.id, p]));
  const teamA: [Player, Player] = [
    pById.get(lineup.teamA[0]!)!,
    pById.get(lineup.teamA[1]!)!,
  ];
  const teamB: [Player, Player] = [
    pById.get(lineup.teamB[0]!)!,
    pById.get(lineup.teamB[1]!)!,
  ];
  assert.equal(isValidGenderMatch(teamA, teamB, 'same_or_mixed'), true);
  assert.notEqual(teamA[0].gender, teamA[1].gender);
  assert.notEqual(teamB[0].gender, teamB[1].gender);
});

test('free gender matching allows 3M+1F when fairness favors it, and same_or_mixed falls back if no valid combo exists', () => {
  const players3M1F = [
    makePlayer('m1', { gender: 'M', matchesPlayed: 0 }),
    makePlayer('m2', { gender: 'M', matchesPlayed: 0 }),
    makePlayer('m3', { gender: 'M', matchesPlayed: 0 }),
    makePlayer('f1', { gender: 'F', matchesPlayed: 0 }),
    makePlayer('m4', { gender: 'M', matchesPlayed: 3 }),
  ];
  const freeClub = makeBaseClub(players3M1F, 1);
  freeClub.settings.genderMatching = 'free';
  freeClub.settings.matchingMode = 'fairness';
  const freeIds = getLineupPlayerIds(suggestLineupForCourt(freeClub, 'c1'));
  assert.deepEqual(new Set(freeIds), new Set(['m1', 'm2', 'm3', 'f1']));

  // Only 4 players total (3M + 1F): no strict same_or_mixed possible, so gracefully still fills 4 slots
  const forcedClub = makeBaseClub(players3M1F.slice(0, 4), 1);
  forcedClub.settings.genderMatching = 'same_or_mixed';
  const fallbackIds = getLineupPlayerIds(suggestLineupForCourt(forcedClub, 'c1'));
  assert.equal(fallbackIds.length, 4);
});

test('sameGenderPercent steers suggestions between same-gender and mixed-gender matches', () => {
  // Pool with 4M + 2F (equal matchesPlayed & level): can form either 4M ('same') or 2M+2F ('mixed')
  const players = [
    makePlayer('m1', { gender: 'M', level: 2, matchesPlayed: 0 }),
    makePlayer('m2', { gender: 'M', level: 2, matchesPlayed: 0 }),
    makePlayer('m3', { gender: 'M', level: 2, matchesPlayed: 0 }),
    makePlayer('m4', { gender: 'M', level: 2, matchesPlayed: 0 }),
    makePlayer('f1', { gender: 'F', level: 2, matchesPlayed: 0 }),
    makePlayer('f2', { gender: 'F', level: 2, matchesPlayed: 0 }),
  ];

  // 100% Satu Gender -> must pick 4M
  const clubSameOnly = makeBaseClub(players, 1);
  clubSameOnly.settings.genderMatching = 'same_or_mixed';
  clubSameOnly.settings.sameGenderPercent = 100;
  const sameIds = getLineupPlayerIds(suggestLineupForCourt(clubSameOnly, 'c1'));
  assert.deepEqual(new Set(sameIds), new Set(['m1', 'm2', 'm3', 'm4']));

  // 0% Satu Gender (100% Campuran) -> must pick 2M + 2F (M+F vs M+F)
  const clubMixedOnly = makeBaseClub(players, 1);
  clubMixedOnly.settings.genderMatching = 'same_or_mixed';
  clubMixedOnly.settings.sameGenderPercent = 0;
  const mixedIds = getLineupPlayerIds(suggestLineupForCourt(clubMixedOnly, 'c1'));
  assert.ok(mixedIds.includes('f1'));
  assert.ok(mixedIds.includes('f2'));

  // 50% / 50%: after 2 'same' records exist, next suggestion prefers 'mixed' to balance toward 50/50
  const clubHalf = makeBaseClub(players, 1);
  clubHalf.settings.genderMatching = 'same_or_mixed';
  clubHalf.settings.sameGenderPercent = 50;
  clubHalf.records = [
    {
      id: 'rec_1',
      courtId: 'c1',
      courtNumber: 1,
      courtName: 'Lapangan 1',
      teamA: ['m1', 'm2'],
      teamB: ['m3', 'm4'],
      timestamp: 100,
    },
    {
      id: 'rec_2',
      courtId: 'c1',
      courtNumber: 1,
      courtName: 'Lapangan 1',
      teamA: ['m1', 'm3'],
      teamB: ['m2', 'm4'],
      timestamp: 200,
    },
  ];
  const balancedIds = getLineupPlayerIds(suggestLineupForCourt(clubHalf, 'c1'));
  assert.ok(balancedIds.includes('f1'));
  assert.ok(balancedIds.includes('f2'));
});

test('applyClubConfiguration updates name, courts, and settings atomically', () => {
  const players = [
    makePlayer('p1'),
    makePlayer('p2'),
    makePlayer('p3'),
    makePlayer('p4'),
    makePlayer('p5'),
    makePlayer('p6'),
    makePlayer('p7'),
    makePlayer('p8'),
  ];
  const club = makeBaseClub(players, 1);

  const updated = applyClubConfiguration(club, {
    clubName: 'PB Juara',
    courtCount: 2,
    settings: {
      ...club.settings,
      queueMode: 'split',
      genderMatching: 'same_or_mixed',
      sameGenderPercent: 75,
    },
  });

  assert.equal(updated.name, 'PB Juara');
  assert.equal(updated.courts.length, 2);
  assert.equal(updated.settings.queueMode, 'split');
  assert.equal(updated.settings.sameGenderPercent, 75);
  assert.equal(
    updated.players.every((p) => p.assignedCourtId !== null),
    true
  );
  assert.equal(getLineupPlayerIds(updated.courts[0].lineup).length, 4);
});

test('createInitialAppState seeds only PB Noz club cleanly', () => {
  const initial = createInitialAppState();
  assert.equal(initial.clubs.length, 1);
  assert.equal(initial.clubs[0].name, 'PB Noz');
  assert.equal(initial.activeClubId, initial.clubs[0].id);
  assert.equal(initial.clubs[0].players.length, 0);
  assert.equal(initial.clubs[0].records.length, 0);
  assert.ok(initial.clubs[0].courts.length >= 1);
});

test('setPlayerAttendance excludes absent players from open courts and pins, and restores them when present', () => {
  const players = [
    makePlayer('p1'),
    makePlayer('p2'),
    makePlayer('p3'),
    makePlayer('p4'),
    makePlayer('p5'),
  ];
  let club = makeBaseClub(players, 1);
  club.courts[0].pinnedPlayerIds = ['p1'];
  club = reconcileOpenCourts(club);
  assert.ok(getLineupPlayerIds(club.courts[0].lineup).includes('p1'));

  // Mark p1 absent (Belum Hadir)
  club = setPlayerAttendance(club, 'p1', false, 12345);
  const p1Absent = club.players.find((p) => p.id === 'p1')!;
  assert.equal(isPlayerPresent(p1Absent), false);
  assert.equal(p1Absent.checkedInAt, null);
  assert.equal(club.courts[0].pinnedPlayerIds.includes('p1'), false);
  assert.deepEqual(
    new Set(getLineupPlayerIds(club.courts[0].lineup)),
    new Set(['p2', 'p3', 'p4', 'p5'])
  );

  // Mark p1 present (Hadir) again and ensure timestamp recorded
  club = setPlayerAttendance(club, 'p1', true, 67890);
  const p1Present = club.players.find((p) => p.id === 'p1')!;
  assert.equal(isPlayerPresent(p1Present), true);
  assert.equal(p1Present.checkedInAt, 67890);
});

test('setBulkAttendance updates all non-playing players cleanly and preserves active playing courts', () => {
  const players = [
    makePlayer('p1'),
    makePlayer('p2'),
    makePlayer('p3'),
    makePlayer('p4'),
    makePlayer('p5'),
  ];
  let club = makeBaseClub(players, 2);
  club.courts[0].status = 'playing';
  club.courts[0].lineup = { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] };
  club = reconcileOpenCourts(club);

  // Mark all absent while c1 is playing
  club = setBulkAttendance(club, false, 1000);
  for (const id of ['p1', 'p2', 'p3', 'p4']) {
    assert.equal(isPlayerPresent(club.players.find((p) => p.id === id)!), true);
  }
  assert.equal(isPlayerPresent(club.players.find((p) => p.id === 'p5')!), false);
  assert.deepEqual(getLineupPlayerIds(club.courts[1].lineup), []);

  // Mark all present
  club = setBulkAttendance(club, true, 2000);
  assert.equal(
    club.players.every((p) => isPlayerPresent(p) && p.checkedInAt !== null),
    true
  );
});

test('addPlayerGroup with same_team keeps paired players on the exact same team and never as opponents', () => {
  const players = [
    makePlayer('p1', { level: 3, matchesPlayed: 0 }),
    makePlayer('p2', { level: 3, matchesPlayed: 0 }),
    makePlayer('p3', { level: 1, matchesPlayed: 0 }),
    makePlayer('p4', { level: 1, matchesPlayed: 0 }),
  ];
  let club = makeBaseClub(players, 1);
  // Without same_team, level balance would split p1+p3 vs p2+p4
  club = addPlayerGroup(club, { mode: 'same_team', playerIds: ['p1', 'p2'], courtId: null });

  const c1 = club.courts[0];
  assert.equal(isGroupFulfilledInCourt(club.playerGroups![0], c1), true);
  const teamASet = new Set(c1.lineup.teamA);
  const teamBSet = new Set(c1.lineup.teamB);
  assert.ok(
    (teamASet.has('p1') && teamASet.has('p2')) ||
      (teamBSet.has('p1') && teamBSet.has('p2'))
  );
});

test('addPlayerGroup with same_court locks group to specific court or keeps them together on one court', () => {
  const players = [
    makePlayer('p1', { matchesPlayed: 0 }),
    makePlayer('p2', { matchesPlayed: 0 }),
    makePlayer('p3', { matchesPlayed: 0 }),
    makePlayer('p4', { matchesPlayed: 0 }),
    makePlayer('p5', { matchesPlayed: 1 }),
    makePlayer('p6', { matchesPlayed: 1 }),
    makePlayer('p7', { matchesPlayed: 1 }),
    makePlayer('p8', { matchesPlayed: 1 }),
  ];
  let club = makeBaseClub(players, 2);
  // Lock p1..p4 strictly to Lapangan 2 (c2)
  club = addPlayerGroup(club, {
    mode: 'same_court',
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    courtId: 'c2',
  });

  const c1Ids = new Set(getLineupPlayerIds(club.courts[0].lineup));
  const c2Ids = new Set(getLineupPlayerIds(club.courts[1].lineup));
  assert.deepEqual(c1Ids, new Set(['p5', 'p6', 'p7', 'p8']));
  assert.deepEqual(c2Ids, new Set(['p1', 'p2', 'p3', 'p4']));
  assert.equal(isGroupFulfilledInCourt(club.playerGroups![0], club.courts[1]), true);

  // Removing group restores open suggestions cleanly
  club = removePlayerGroup(club, club.playerGroups![0].id);
  assert.equal(club.playerGroups!.length, 0);
});

test('shared same_court group stays together on one court without splitting across courts', () => {
  const players = [
    makePlayer('p1', { matchesPlayed: 0 }),
    makePlayer('p2', { matchesPlayed: 0 }),
    makePlayer('p3', { matchesPlayed: 2 }),
    makePlayer('p4', { matchesPlayed: 2 }),
    makePlayer('p5', { matchesPlayed: 0 }),
    makePlayer('p6', { matchesPlayed: 0 }),
    makePlayer('p7', { matchesPlayed: 0 }),
    makePlayer('p8', { matchesPlayed: 0 }),
  ];
  let club = makeBaseClub(players, 2);
  // Group p1..p4 wants same court (any court), even though p3/p4 have more matches
  club = addPlayerGroup(club, {
    mode: 'same_court',
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    courtId: null,
  });

  const c1Ids = new Set(getLineupPlayerIds(club.courts[0].lineup));
  const c2Ids = new Set(getLineupPlayerIds(club.courts[1].lineup));
  const groupInC1 = ['p1', 'p2', 'p3', 'p4'].filter((id) => c1Ids.has(id)).length;
  const groupInC2 = ['p1', 'p2', 'p3', 'p4'].filter((id) => c2Ids.has(id)).length;
  assert.ok((groupInC1 === 4 && groupInC2 === 0) || (groupInC1 === 0 && groupInC2 === 4));
});



