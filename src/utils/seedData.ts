import { AppState, Club, Court } from '../types/badminton';

function createCourts(count: number, clubPrefix: string): Court[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `${clubPrefix}_court_${idx + 1}`,
    number: idx + 1,
    name: `Lapangan ${idx + 1}`,
    status: 'open',
    lineup: { teamA: [null, null], teamB: [null, null] },
    pinnedPlayerIds: [],
    startedAt: null,
  }));
}

export function createInitialAppState(): AppState {
  const pbNozClub: Club = {
    id: 'club_pb_noz',
    name: 'PB Noz',
    players: [],
    courts: createCourts(2, 'pb_noz'),
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

  return {
    clubs: [pbNozClub],
    activeClubId: pbNozClub.id,
  };
}
