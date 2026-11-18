import { AppState, Club, Court, MatchRecord, Player } from '../types/badminton';
import { reconcileOpenCourts } from './scheduler';

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
  const garudaPlayers: Player[] = [
    { id: 'g_1', name: 'Rizky Pratama', gender: 'M', level: 3, isActive: true, assignedCourtId: 'garuda_court_1', matchesPlayed: 2, lastPlayedAt: 4 },
    { id: 'g_2', name: 'Siti Rahmawati', gender: 'F', level: 2, isActive: true, assignedCourtId: 'garuda_court_1', matchesPlayed: 2, lastPlayedAt: 5 },
    { id: 'g_3', name: 'Dimas Saputra', gender: 'M', level: 3, isActive: true, assignedCourtId: 'garuda_court_2', matchesPlayed: 1, lastPlayedAt: 1 },
    { id: 'g_4', name: 'Nadia Kusuma', gender: 'F', level: 3, isActive: true, assignedCourtId: 'garuda_court_2', matchesPlayed: 1, lastPlayedAt: 2 },
    { id: 'g_5', name: 'Bagas Wijaya', gender: 'M', level: 2, isActive: true, assignedCourtId: 'garuda_court_3', matchesPlayed: 1, lastPlayedAt: 3 },
    { id: 'g_6', name: 'Putri Wulandari', gender: 'F', level: 2, isActive: true, assignedCourtId: 'garuda_court_3', matchesPlayed: 1, lastPlayedAt: 6 },
    { id: 'g_7', name: 'Fajar Nugroho', gender: 'M', level: 2, isActive: true, assignedCourtId: 'garuda_court_1', matchesPlayed: 2, lastPlayedAt: 7 },
    { id: 'g_8', name: 'Dewi Lestari', gender: 'F', level: 1, isActive: true, assignedCourtId: 'garuda_court_2', matchesPlayed: 1, lastPlayedAt: 3 },
    { id: 'g_9', name: 'Hendra Gunawan', gender: 'M', level: 3, isActive: true, assignedCourtId: 'garuda_court_1', matchesPlayed: 1, lastPlayedAt: 2 },
    { id: 'g_10', name: 'Ayu Permata', gender: 'F', level: 2, isActive: true, assignedCourtId: 'garuda_court_2', matchesPlayed: 2, lastPlayedAt: 6 },
    { id: 'g_11', name: 'Kevin Santoso', gender: 'M', level: 2, isActive: true, assignedCourtId: 'garuda_court_3', matchesPlayed: 1, lastPlayedAt: 4 },
    { id: 'g_12', name: 'Tania Anggraini', gender: 'F', level: 1, isActive: true, assignedCourtId: 'garuda_court_3', matchesPlayed: 1, lastPlayedAt: 5 },
    { id: 'g_13', name: 'Yusuf Maulana', gender: 'M', level: 1, isActive: true, assignedCourtId: 'garuda_court_1', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 'g_14', name: 'Citra Maharani', gender: 'F', level: 2, isActive: false, assignedCourtId: 'garuda_court_2', matchesPlayed: 0, lastPlayedAt: 0 },
  ];

  const now = Date.now();
  const garudaRecords: MatchRecord[] = [
    {
      id: 'rec_seed_1',
      courtId: 'garuda_court_1',
      courtNumber: 1,
      courtName: 'Lapangan 1',
      teamA: ['g_1', 'g_2'],
      teamB: ['g_3', 'g_4'],
      timestamp: now - 35 * 60000,
    },
    {
      id: 'rec_seed_2',
      courtId: 'garuda_court_2',
      courtNumber: 2,
      courtName: 'Lapangan 2',
      teamA: ['g_5', 'g_6'],
      teamB: ['g_7', 'g_8'],
      timestamp: now - 25 * 60000,
    },
    {
      id: 'rec_seed_3',
      courtId: 'garuda_court_1',
      courtNumber: 1,
      courtName: 'Lapangan 1',
      teamA: ['g_9', 'g_10'],
      teamB: ['g_11', 'g_12'],
      timestamp: now - 15 * 60000,
    },
    {
      id: 'rec_seed_4',
      courtId: 'garuda_court_3',
      courtNumber: 3,
      courtName: 'Lapangan 3',
      teamA: ['g_1', 'g_7'],
      teamB: ['g_2', 'g_10'],
      timestamp: now - 8 * 60000,
    },
  ];

  const garudaCourts = createCourts(3, 'garuda');
  // Put Court 1 into 'playing' state with 4 players so user sees both active court & open instant-suggestion courts
  garudaCourts[0] = {
    ...garudaCourts[0],
    status: 'playing',
    lineup: { teamA: ['g_1', 'g_4'], teamB: ['g_7', 'g_10'] },
    startedAt: now - 6 * 60000,
  };

  let garudaClub: Club = {
    id: 'club_garuda',
    name: 'PB Garuda Jaya',
    players: garudaPlayers,
    courts: garudaCourts,
    records: garudaRecords,
    settings: {
      matchingMode: 'balanced',
      genderMatching: 'free',
      sameGenderPercent: 50,
      queueMode: 'shared',
      genderStyle: 'soft_bg',
    },
    sequenceCounter: 7,
  };
  garudaClub = reconcileOpenCourts(garudaClub);

  const senayanPlayers: Player[] = [
    { id: 's_1', name: 'Arif Budiman', gender: 'M', level: 3, isActive: true, assignedCourtId: 'senayan_court_1', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_2', name: 'Maya Sari', gender: 'F', level: 3, isActive: true, assignedCourtId: 'senayan_court_1', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_3', name: 'Raka Aditya', gender: 'M', level: 2, isActive: true, assignedCourtId: 'senayan_court_2', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_4', name: 'Intan Pertiwi', gender: 'F', level: 2, isActive: true, assignedCourtId: 'senayan_court_2', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_5', name: 'Galih Prasetyo', gender: 'M', level: 3, isActive: true, assignedCourtId: 'senayan_court_1', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_6', name: 'Larasati Dewi', gender: 'F', level: 2, isActive: true, assignedCourtId: 'senayan_court_1', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_7', name: 'Bima Sakti', gender: 'M', level: 1, isActive: true, assignedCourtId: 'senayan_court_2', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_8', name: 'Vina Oktavia', gender: 'F', level: 1, isActive: true, assignedCourtId: 'senayan_court_2', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_9', name: 'Eko Purnomo', gender: 'M', level: 2, isActive: true, assignedCourtId: 'senayan_court_1', matchesPlayed: 0, lastPlayedAt: 0 },
    { id: 's_10', name: 'Siska Amelia', gender: 'F', level: 3, isActive: true, assignedCourtId: 'senayan_court_2', matchesPlayed: 0, lastPlayedAt: 0 },
  ];

  let senayanClub: Club = {
    id: 'club_senayan',
    name: 'PB Senayan Malam',
    players: senayanPlayers,
    courts: createCourts(2, 'senayan'),
    records: [],
    settings: {
      matchingMode: 'fairness',
      genderMatching: 'free',
      sameGenderPercent: 50,
      queueMode: 'shared',
      genderStyle: 'thin_edge',
    },
    sequenceCounter: 0,
  };
  senayanClub = reconcileOpenCourts(senayanClub);

  return {
    clubs: [garudaClub, senayanClub],
    activeClubId: garudaClub.id,
  };
}
