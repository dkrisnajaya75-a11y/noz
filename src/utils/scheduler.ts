import {
  Club,
  ClubSettings,
  Court,
  CourtLineup,
  GenderMatchingMode,
  MatchingMode,
  MatchRecord,
  Player,
} from '../types/badminton';

export interface PairStats {
  partnerCounts: Map<string, number>;
  opponentCounts: Map<string, number>;
  recentPartners: Set<string>;
  recentOpponents: Set<string>;
}

export interface ScoredCandidate {
  lineup: CourtLineup;
  signature: string;
  score: number;
}

export interface EvennessStats {
  totalMatches: number;
  activePlayersCount: number;
  averageMatches: number;
  minMatches: number;
  maxMatches: number;
  evennessPercent: number;
}

export function makePairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}::${idB}` : `${idB}::${idA}`;
}

export function makeLineupSignature(lineup: CourtLineup): string {
  const a = [...lineup.teamA].filter(Boolean).sort().join('+');
  const b = [...lineup.teamB].filter(Boolean).sort().join('+');
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function getLineupPlayerIds(lineup: CourtLineup): string[] {
  return [...lineup.teamA, ...lineup.teamB].filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
}

export function isLineupComplete(lineup: CourtLineup): boolean {
  return getLineupPlayerIds(lineup).length === 4;
}

export function isValidGenderMatch(
  teamA: [Player, Player],
  teamB: [Player, Player],
  genderMatching: GenderMatchingMode = 'free'
): boolean {
  if (genderMatching === 'free') return true;

  const allMale =
    teamA[0].gender === 'M' &&
    teamA[1].gender === 'M' &&
    teamB[0].gender === 'M' &&
    teamB[1].gender === 'M';
  if (allMale) return true;

  const allFemale =
    teamA[0].gender === 'F' &&
    teamA[1].gender === 'F' &&
    teamB[0].gender === 'F' &&
    teamB[1].gender === 'F';
  if (allFemale) return true;

  const teamAMixed = teamA[0].gender !== teamA[1].gender;
  const teamBMixed = teamB[0].gender !== teamB[1].gender;
  return teamAMixed && teamBMixed;
}

export function getGenderMatchCategory(
  teamA: [Player, Player],
  teamB: [Player, Player]
): 'same' | 'mixed' | 'other' {
  const allMale =
    teamA[0].gender === 'M' &&
    teamA[1].gender === 'M' &&
    teamB[0].gender === 'M' &&
    teamB[1].gender === 'M';
  const allFemale =
    teamA[0].gender === 'F' &&
    teamA[1].gender === 'F' &&
    teamB[0].gender === 'F' &&
    teamB[1].gender === 'F';
  if (allMale || allFemale) return 'same';

  const teamAMixed = teamA[0].gender !== teamA[1].gender;
  const teamBMixed = teamB[0].gender !== teamB[1].gender;
  if (teamAMixed && teamBMixed) return 'mixed';

  return 'other';
}

function countGenderMatchDistribution(
  club: Club,
  excludeCourtId: string
): { sameCount: number; mixedCount: number } {
  const playersById = new Map(club.players.map((p) => [p.id, p]));
  let sameCount = 0;
  let mixedCount = 0;

  const classifyIds = (ids: [string | null, string | null, string | null, string | null]) => {
    if (!ids[0] || !ids[1] || !ids[2] || !ids[3]) return;
    const p0 = playersById.get(ids[0]);
    const p1 = playersById.get(ids[1]);
    const p2 = playersById.get(ids[2]);
    const p3 = playersById.get(ids[3]);
    if (!p0 || !p1 || !p2 || !p3) return;
    const cat = getGenderMatchCategory([p0, p1], [p2, p3]);
    if (cat === 'same') sameCount += 1;
    else if (cat === 'mixed') mixedCount += 1;
  };

  for (const rec of club.records) {
    classifyIds([rec.teamA[0], rec.teamA[1], rec.teamB[0], rec.teamB[1]]);
  }

  for (const c of club.courts) {
    if (c.id === excludeCourtId) continue;
    classifyIds([
      c.lineup.teamA[0],
      c.lineup.teamA[1],
      c.lineup.teamB[0],
      c.lineup.teamB[1],
    ]);
  }

  return { sameCount, mixedCount };
}

export function buildPairStats(records: MatchRecord[]): PairStats {
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const recentPartners = new Set<string>();
  const recentOpponents = new Set<string>();

  const recentThreshold = Math.max(0, records.length - 3);

  records.forEach((rec, idx) => {
    const [a1, a2] = rec.teamA;
    const [b1, b2] = rec.teamB;

    const pKeyA = makePairKey(a1, a2);
    const pKeyB = makePairKey(b1, b2);
    partnerCounts.set(pKeyA, (partnerCounts.get(pKeyA) ?? 0) + 1);
    partnerCounts.set(pKeyB, (partnerCounts.get(pKeyB) ?? 0) + 1);

    if (idx >= recentThreshold) {
      recentPartners.add(pKeyA);
      recentPartners.add(pKeyB);
    }

    for (const a of rec.teamA) {
      for (const b of rec.teamB) {
        const oKey = makePairKey(a, b);
        opponentCounts.set(oKey, (opponentCounts.get(oKey) ?? 0) + 1);
        if (idx >= recentThreshold) {
          recentOpponents.add(oKey);
        }
      }
    }
  });

  return {
    partnerCounts,
    opponentCounts,
    recentPartners,
    recentOpponents,
  };
}

interface ModeWeights {
  matchCount: number;
  wait: number;
  partnerRepeat: number;
  opponentRepeat: number;
  teamGap: number;
  courtSpread: number;
}

function getWeights(mode: MatchingMode): ModeWeights {
  switch (mode) {
    case 'fairness':
      return {
        matchCount: 32,
        wait: 10,
        partnerRepeat: 20,
        opponentRepeat: 10,
        teamGap: 2,
        courtSpread: 0.5,
      };
    case 'level':
      return {
        matchCount: 2,
        wait: 1,
        partnerRepeat: 12,
        opponentRepeat: 6,
        teamGap: 36,
        courtSpread: 40,
      };
    case 'balanced':
    default:
      return {
        matchCount: 14,
        wait: 5,
        partnerRepeat: 18,
        opponentRepeat: 9,
        teamGap: 14,
        courtSpread: 8,
      };
  }
}

function scoreSplit(
  teamA: [Player, Player],
  teamB: [Player, Player],
  minMatches: number,
  maxSeq: number,
  stats: PairStats,
  weights: ModeWeights
): number {
  const players = [teamA[0], teamA[1], teamB[0], teamB[1]];

  // 1. Match count fairness penalty
  let matchCountPenalty = 0;
  for (const p of players) {
    const diff = Math.max(0, p.matchesPlayed - minMatches);
    matchCountPenalty += diff + diff * diff * 0.75;
  }

  // 2. Wait recency penalty (higher lastPlayedAt = played more recently = higher penalty)
  let waitPenalty = 0;
  const seqDivisor = Math.max(1, maxSeq);
  for (const p of players) {
    waitPenalty += p.lastPlayedAt / seqDivisor;
  }

  // 3. Partner repetition penalty
  const pkA = makePairKey(teamA[0].id, teamA[1].id);
  const pkB = makePairKey(teamB[0].id, teamB[1].id);
  const pcA = stats.partnerCounts.get(pkA) ?? 0;
  const pcB = stats.partnerCounts.get(pkB) ?? 0;
  let partnerRepeatPenalty =
    pcA + pcA * pcA * 1.5 + (pcB + pcB * pcB * 1.5);
  if (stats.recentPartners.has(pkA)) partnerRepeatPenalty += 2.5;
  if (stats.recentPartners.has(pkB)) partnerRepeatPenalty += 2.5;

  // 4. Opponent repetition penalty
  let opponentRepeatPenalty = 0;
  for (const a of teamA) {
    for (const b of teamB) {
      const ok = makePairKey(a.id, b.id);
      const oc = stats.opponentCounts.get(ok) ?? 0;
      opponentRepeatPenalty += oc + oc * oc * 0.8;
      if (stats.recentOpponents.has(ok)) {
        opponentRepeatPenalty += 1.0;
      }
    }
  }

  // 5. Skill balance & spread penalty
  const sumA = teamA[0].level + teamA[1].level;
  const sumB = teamB[0].level + teamB[1].level;
  const teamGap = Math.abs(sumA - sumB);

  const levels = players.map((p) => p.level);
  const courtSpread = Math.max(...levels) - Math.min(...levels);

  return (
    matchCountPenalty * weights.matchCount +
    waitPenalty * weights.wait +
    partnerRepeatPenalty * weights.partnerRepeat +
    opponentRepeatPenalty * weights.opponentRepeat +
    teamGap * weights.teamGap +
    courtSpread * weights.courtSpread
  );
}

/**
 * Returns players eligible to be suggested onto `targetCourt`.
 */
export function getEligibleCandidatesForCourt(
  club: Club,
  targetCourtId: string
): { pinned: Player[]; pool: Player[] } {
  const targetCourt = club.courts.find((c) => c.id === targetCourtId);
  if (!targetCourt) return { pinned: [], pool: [] };

  const playingIds = new Set<string>();
  const reservedOtherCourtIds = new Set<string>();
  const pinnedOtherCourtIds = new Set<string>();

  for (const court of club.courts) {
    if (court.status === 'playing') {
      getLineupPlayerIds(court.lineup).forEach((id) => playingIds.add(id));
    } else if (court.id !== targetCourtId) {
      getLineupPlayerIds(court.lineup).forEach((id) =>
        reservedOtherCourtIds.add(id)
      );
    }

    if (court.id !== targetCourtId) {
      court.pinnedPlayerIds.forEach((id) => pinnedOtherCourtIds.add(id));
    }
  }

  const activePlayers = club.players.filter(
    (p) =>
      p.isActive &&
      !playingIds.has(p.id) &&
      !pinnedOtherCourtIds.has(p.id)
  );

  const pinnedSet = new Set(targetCourt.pinnedPlayerIds);
  const pinned = activePlayers.filter((p) => pinnedSet.has(p.id)).slice(0, 4);
  const pinnedIds = new Set(pinned.map((p) => p.id));

  let pool = activePlayers.filter(
    (p) => !pinnedIds.has(p.id) && !reservedOtherCourtIds.has(p.id)
  );

  if (club.settings.queueMode === 'split') {
    pool = pool.filter((p) => p.assignedCourtId === targetCourtId);
  }

  return { pinned, pool };
}

export function generateRankedLineupsForCourt(
  club: Club,
  targetCourtId: string,
  maxPoolSize = 16
): ScoredCandidate[] {
  const { pinned, pool } = getEligibleCandidatesForCourt(club, targetCourtId);
  const needed = 4 - pinned.length;

  if (needed < 0 || pool.length < needed) {
    return [];
  }

  // Sort pool by fairness priority first so the candidate window focuses on waiting players,
  // unless level-first mode wants a broader slice (up to 16 covers most clubs cleanly).
  const sortedPool = [...pool].sort((a, b) => {
    if (a.matchesPlayed !== b.matchesPlayed) {
      return a.matchesPlayed - b.matchesPlayed;
    }
    return a.lastPlayedAt - b.lastPlayedAt;
  });

  const genderMatching: GenderMatchingMode =
    club.settings.genderMatching ?? 'free';

  let windowPool = sortedPool.slice(0, maxPoolSize);
  if (genderMatching === 'same_or_mixed' && sortedPool.length > maxPoolSize) {
    const windowIds = new Set(windowPool.map((p) => p.id));
    const hasM = windowPool.some((p) => p.gender === 'M');
    const hasF = windowPool.some((p) => p.gender === 'F');
    if (!hasM) {
      const extraM = sortedPool
        .filter((p) => p.gender === 'M' && !windowIds.has(p.id))
        .slice(0, 2);
      windowPool = [...windowPool, ...extraM];
    }
    if (!hasF) {
      const extraF = sortedPool
        .filter((p) => p.gender === 'F' && !windowIds.has(p.id))
        .slice(0, 2);
      windowPool = [...windowPool, ...extraF];
    }
  }

  const activeMatches = club.players
    .filter((p) => p.isActive)
    .map((p) => p.matchesPlayed);
  const minMatches =
    activeMatches.length > 0 ? Math.min(...activeMatches) : 0;
  const maxSeq = Math.max(1, club.sequenceCounter);
  const stats = buildPairStats(club.records);
  const weights = getWeights(club.settings.matchingMode);

  // Generate combinations of `needed` players from `windowPool`
  const quartets: Player[][] = [];
  const chosen: Player[] = [];

  function combine(startIdx: number) {
    if (chosen.length === needed) {
      quartets.push([...pinned, ...chosen]);
      return;
    }
    for (let i = startIdx; i <= windowPool.length - (needed - chosen.length); i++) {
      chosen.push(windowPool[i]);
      combine(i + 1);
      chosen.pop();
    }
  }
  combine(0);

  const validCandidates: ScoredCandidate[] = [];
  const fallbackCandidates: ScoredCandidate[] = [];
  const seenSignatures = new Set<string>();

  const rawPercent = club.settings.sameGenderPercent ?? 50;
  const sameGenderPercent = Math.max(0, Math.min(100, rawPercent));
  const targetSameRatio = sameGenderPercent / 100;
  const { sameCount, mixedCount } =
    genderMatching === 'same_or_mixed'
      ? countGenderMatchDistribution(club, targetCourtId)
      : { sameCount: 0, mixedCount: 0 };
  const totalGenderMatches = sameCount + mixedCount;

  for (const q of quartets) {
    if (q.length !== 4) continue;
    const [p0, p1, p2, p3] = q;
    const splits: Array<[[Player, Player], [Player, Player]]> = [
      [
        [p0, p1],
        [p2, p3],
      ],
      [
        [p0, p2],
        [p1, p3],
      ],
      [
        [p0, p3],
        [p1, p2],
      ],
    ];

    for (const [teamA, teamB] of splits) {
      const lineup: CourtLineup = {
        teamA: [teamA[0].id, teamA[1].id],
        teamB: [teamB[0].id, teamB[1].id],
      };
      const signature = makeLineupSignature(lineup);
      if (seenSignatures.has(signature)) continue;
      seenSignatures.add(signature);

      let score = scoreSplit(
        teamA,
        teamB,
        minMatches,
        maxSeq,
        stats,
        weights
      );

      if (genderMatching === 'same_or_mixed') {
        const category = getGenderMatchCategory(teamA, teamB);
        if (category === 'same' || category === 'mixed') {
          if (sameGenderPercent === 100 && category === 'mixed') {
            score += 500;
          } else if (sameGenderPercent === 0 && category === 'same') {
            score += 500;
          } else if (sameGenderPercent > 0 && sameGenderPercent < 100) {
            const nextSame = sameCount + (category === 'same' ? 1 : 0);
            const nextRatio = nextSame / (totalGenderMatches + 1);
            score += Math.abs(nextRatio - targetSameRatio) * 80;
          }
        }
      }

      const candidate = { lineup, signature, score };
      fallbackCandidates.push(candidate);
      if (isValidGenderMatch(teamA, teamB, genderMatching)) {
        validCandidates.push(candidate);
      }
    }
  }

  const candidates =
    validCandidates.length > 0 ? validCandidates : fallbackCandidates;
  candidates.sort((a, b) => a.score - b.score);
  return candidates;
}

/**
 * Picks a fair suggestion for a single open court.
 * Optionally excludes a list of signatures (used by reroll).
 */
export function suggestLineupForCourt(
  club: Club,
  targetCourtId: string,
  excludeSignatures: string[] = []
): CourtLineup {
  const targetCourt = club.courts.find((c) => c.id === targetCourtId);
  if (!targetCourt) {
    return { teamA: [null, null], teamB: [null, null] };
  }

  const ranked = generateRankedLineupsForCourt(club, targetCourtId);
  if (ranked.length === 0) {
    // Partial fill with pinned players so user still sees pinned players on the court
    const { pinned } = getEligibleCandidatesForCourt(club, targetCourtId);
    const slots: Array<string | null> = [
      pinned[0]?.id ?? null,
      pinned[1]?.id ?? null,
      pinned[2]?.id ?? null,
      pinned[3]?.id ?? null,
    ];
    return {
      teamA: [slots[0], slots[1]],
      teamB: [slots[2], slots[3]],
    };
  }

  const excludeSet = new Set(excludeSignatures);
  const fresh = ranked.find((c) => !excludeSet.has(c.signature));
  if (fresh) {
    return fresh.lineup;
  }

  // If all top options were cycled through, pick the next different one from current
  const currentSig = makeLineupSignature(targetCourt.lineup);
  const alt = ranked.find((c) => c.signature !== currentSig);
  return (alt ?? ranked[0]).lineup;
}

/**
 * Ensures all open courts have valid, conflict-free lineups.
 * Useful after adding players, changing settings, or toggling player active status.
 */
export function reconcileOpenCourts(club: Club): Club {
  let nextClub: Club = {
    ...club,
    courts: club.courts.map((c) => ({
      ...c,
      lineup: {
        teamA: [...c.lineup.teamA] as [string | null, string | null],
        teamB: [...c.lineup.teamB] as [string | null, string | null],
      },
      pinnedPlayerIds: [...c.pinnedPlayerIds],
    })),
  };

  const activePlayerIds = new Set(
    nextClub.players.filter((p) => p.isActive).map((p) => p.id)
  );
  const playingIds = new Set<string>();

  for (const court of nextClub.courts) {
    if (court.status === 'playing') {
      getLineupPlayerIds(court.lineup).forEach((id) => playingIds.add(id));
    }
  }

  // Track players already claimed by earlier open courts
  const claimedOpenIds = new Set<string>();

  nextClub = {
    ...nextClub,
    courts: nextClub.courts.map((court) => {
      if (court.status === 'playing') return court;

      // Filter invalid pins (deleted, resting, or playing elsewhere)
      const validPins = court.pinnedPlayerIds.filter(
        (id) => activePlayerIds.has(id) && !playingIds.has(id)
      );

      // Check if existing suggested lineup is still completely valid and conflict-free
      const currentIds = getLineupPlayerIds(court.lineup);
      const allValid =
        currentIds.length === 4 &&
        currentIds.every((id) => {
          if (!activePlayerIds.has(id) || playingIds.has(id) || claimedOpenIds.has(id)) {
            return false;
          }
          if (nextClub.settings.queueMode === 'split') {
            const player = nextClub.players.find((p) => p.id === id);
            return (
              player?.assignedCourtId === court.id || validPins.includes(id)
            );
          }
          return true;
        }) &&
        validPins.every((pinId) => currentIds.includes(pinId));

      if (allValid) {
        currentIds.forEach((id) => claimedOpenIds.add(id));
        return { ...court, pinnedPlayerIds: validPins };
      }

      return { ...court, pinnedPlayerIds: validPins, lineup: { teamA: [null, null], teamB: [null, null] } };
    }),
  };

  // Second pass: fill any open court that isn't complete
  for (let i = 0; i < nextClub.courts.length; i++) {
    const court = nextClub.courts[i];
    if (court.status === 'open' && !isLineupComplete(court.lineup)) {
      const suggested = suggestLineupForCourt(nextClub, court.id);
      nextClub.courts[i] = {
        ...court,
        lineup: suggested,
      };
    }
  }

  return nextClub;
}

/**
 * Starts the match on an open court if it has 4 players.
 */
export function startCourtMatch(club: Club, courtId: string, now = Date.now()): Club {
  const court = club.courts.find((c) => c.id === courtId);
  if (!court || court.status !== 'open' || !isLineupComplete(court.lineup)) {
    return club;
  }

  const startedIds = new Set(getLineupPlayerIds(court.lineup));

  const updatedClub: Club = {
    ...club,
    courts: club.courts.map((c) => {
      if (c.id === courtId) {
        return {
          ...c,
          status: 'playing',
          startedAt: now,
        };
      }
      // Clear any suggested overlap from other open courts
      if (c.status === 'open') {
        const hasOverlap = getLineupPlayerIds(c.lineup).some((id) =>
          startedIds.has(id)
        );
        if (hasOverlap) {
          return {
            ...c,
            lineup: { teamA: [null, null], teamB: [null, null] },
          };
        }
      }
      return c;
    }),
  };

  return reconcileOpenCourts(updatedClub);
}

/**
 * Finishes an active match on `courtId`, records stats, updates player match counts,
 * opens the court, and IMMEDIATELY suggests the next fair lineup just for that court.
 */
export function finishCourtMatch(
  club: Club,
  courtId: string,
  now = Date.now()
): Club {
  const court = club.courts.find((c) => c.id === courtId);
  if (!court || court.status !== 'playing' || !isLineupComplete(court.lineup)) {
    return club;
  }

  const teamA = court.lineup.teamA as [string, string];
  const teamB = court.lineup.teamB as [string, string];
  const playedIds = new Set([...teamA, ...teamB]);
  const nextSeq = club.sequenceCounter + 1;

  const newRecord: MatchRecord = {
    id: `rec_${now}_${Math.random().toString(36).slice(2, 7)}`,
    courtId: court.id,
    courtNumber: court.number,
    courtName: court.name,
    teamA,
    teamB,
    timestamp: now,
  };

  const updatedPlayers = club.players.map((p) => {
    if (!playedIds.has(p.id)) return p;
    return {
      ...p,
      matchesPlayed: p.matchesPlayed + 1,
      lastPlayedAt: nextSeq,
    };
  });

  // Reset only the finished court to 'open' with cleared lineup first
  const intermediateClub: Club = {
    ...club,
    sequenceCounter: nextSeq,
    players: updatedPlayers,
    records: [...club.records, newRecord],
    courts: club.courts.map((c) =>
      c.id === courtId
        ? {
            ...c,
            status: 'open',
            startedAt: null,
            lineup: { teamA: [null, null], teamB: [null, null] },
          }
        : c
    ),
  };

  // Immediately generate a fresh fair suggestion JUST for this newly opened court
  const nextSuggestion = suggestLineupForCourt(intermediateClub, courtId);

  return {
    ...intermediateClub,
    courts: intermediateClub.courts.map((c) =>
      c.id === courtId ? { ...c, lineup: nextSuggestion } : c
    ),
  };
}

/**
 * Swaps two slots on the same court, OR swaps a court slot with a waiting player from queue.
 */
export function swapSlotWithPlayerOrSlot(
  club: Club,
  courtId: string,
  slotIndex: 0 | 1 | 2 | 3,
  target:
    | { type: 'slot'; slotIndex: 0 | 1 | 2 | 3 }
    | { type: 'player'; playerId: string }
): Club {
  const court = club.courts.find((c) => c.id === courtId);
  if (!court) return club;

  const slots: Array<string | null> = [
    court.lineup.teamA[0],
    court.lineup.teamA[1],
    court.lineup.teamB[0],
    court.lineup.teamB[1],
  ];

  if (target.type === 'slot') {
    const temp = slots[slotIndex];
    slots[slotIndex] = slots[target.slotIndex];
    slots[target.slotIndex] = temp;

    return {
      ...club,
      courts: club.courts.map((c) =>
        c.id === courtId
          ? {
              ...c,
              lineup: {
                teamA: [slots[0], slots[1]],
                teamB: [slots[2], slots[3]],
              },
            }
          : c
      ),
    };
  }

  // Swapping with a waiting player
  const incomingId = target.playerId;
  const outgoingId = slots[slotIndex];

  // If incoming player is already in another slot of this court, swap them
  const existingIdx = slots.indexOf(incomingId);
  if (existingIdx !== -1) {
    slots[existingIdx] = outgoingId;
    slots[slotIndex] = incomingId;
    return {
      ...club,
      courts: club.courts.map((c) =>
        c.id === courtId
          ? {
              ...c,
              lineup: {
                teamA: [slots[0], slots[1]],
                teamB: [slots[2], slots[3]],
              },
            }
          : c
      ),
    };
  }

  slots[slotIndex] = incomingId;

  // If incoming player was pinned/suggested on another open court, clear them from there
  const updatedClub: Club = {
    ...club,
    courts: club.courts.map((c) => {
      if (c.id === courtId) {
        const updatedPins = outgoingId
          ? c.pinnedPlayerIds.filter((id) => id !== outgoingId)
          : c.pinnedPlayerIds;
        return {
          ...c,
          pinnedPlayerIds: updatedPins,
          lineup: {
            teamA: [slots[0], slots[1]],
            teamB: [slots[2], slots[3]],
          },
        };
      }
      if (c.status === 'open') {
        const otherSlots = [
          c.lineup.teamA[0],
          c.lineup.teamA[1],
          c.lineup.teamB[0],
          c.lineup.teamB[1],
        ].map((id) => (id === incomingId ? null : id));
        return {
          ...c,
          pinnedPlayerIds: c.pinnedPlayerIds.filter((id) => id !== incomingId),
          lineup: {
            teamA: [otherSlots[0], otherSlots[1]],
            teamB: [otherSlots[2], otherSlots[3]],
          },
        };
      }
      return c;
    }),
  };

  return reconcileOpenCourts(updatedClub);
}

/**
 * Computes match-count evenness summary for the Records screen.
 */
export function computeEvennessStats(club: Club): EvennessStats {
  const active = club.players.filter((p) => p.isActive || p.matchesPlayed > 0);
  if (active.length === 0) {
    return {
      totalMatches: club.records.length,
      activePlayersCount: 0,
      averageMatches: 0,
      minMatches: 0,
      maxMatches: 0,
      evennessPercent: 100,
    };
  }

  const counts = active.map((p) => p.matchesPlayed);
  const sum = counts.reduce((acc, n) => acc + n, 0);
  const avg = sum / counts.length;
  const min = Math.min(...counts);
  const max = Math.max(...counts);

  // Normalized evenness: 100% when max - min <= 1 or stdDev is 0
  let evennessPercent = 100;
  if (avg > 0) {
    const variance =
      counts.reduce((acc, n) => acc + (n - avg) ** 2, 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / Math.max(1, avg);
    evennessPercent = Math.max(0, Math.min(100, Math.round((1 - cv * 0.85) * 100)));
  }

  return {
    totalMatches: club.records.length,
    activePlayersCount: active.length,
    averageMatches: Number(avg.toFixed(1)),
    minMatches: min,
    maxMatches: max,
    evennessPercent,
  };
}

export function applyClubConfiguration(
  club: Club,
  config: {
    settings: ClubSettings;
    courtCount: number;
    clubName: string;
  }
): Club {
  const trimmedName = config.clubName.trim() || club.name;
  const clampedCount = Math.max(1, Math.min(12, Math.round(config.courtCount)));

  let nextCourts: Court[] = club.courts;
  if (clampedCount > club.courts.length) {
    const added: Court[] = [];
    for (let num = club.courts.length + 1; num <= clampedCount; num++) {
      added.push({
        id: `${club.id}_court_${Date.now()}_${num}`,
        number: num,
        name: `Lapangan ${num}`,
        status: 'open',
        lineup: { teamA: [null, null], teamB: [null, null] },
        pinnedPlayerIds: [],
        startedAt: null,
      });
    }
    nextCourts = [...club.courts, ...added];
  } else if (clampedCount < club.courts.length) {
    nextCourts = club.courts.slice(0, clampedCount).map((c, idx) => ({
      ...c,
      number: idx + 1,
      name: `Lapangan ${idx + 1}`,
    }));
  }

  const validCourtIds = new Set(nextCourts.map((c) => c.id));
  const fallbackCourtId = nextCourts[0]?.id ?? null;

  let nextPlayers = club.players.map((p) =>
    p.assignedCourtId && !validCourtIds.has(p.assignedCourtId)
      ? { ...p, assignedCourtId: fallbackCourtId }
      : p
  );

  if (config.settings.queueMode === 'split' && nextCourts.length > 0) {
    nextPlayers = nextPlayers.map((p, idx) =>
      p.assignedCourtId && validCourtIds.has(p.assignedCourtId)
        ? p
        : {
            ...p,
            assignedCourtId: nextCourts[idx % nextCourts.length].id,
          }
    );
  }

  const shouldResuggest =
    config.settings.matchingMode !== club.settings.matchingMode ||
    config.settings.genderMatching !== club.settings.genderMatching ||
    config.settings.sameGenderPercent !== club.settings.sameGenderPercent ||
    config.settings.queueMode !== club.settings.queueMode;

  if (shouldResuggest) {
    nextCourts = nextCourts.map((c) =>
      c.status === 'open'
        ? {
            ...c,
            lineup: { teamA: [null, null], teamB: [null, null] },
          }
        : c
    );
  }

  return reconcileOpenCourts({
    ...club,
    name: trimmedName,
    settings: { ...config.settings },
    players: nextPlayers,
    courts: nextCourts,
  });
}
