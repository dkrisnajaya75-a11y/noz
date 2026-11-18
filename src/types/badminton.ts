export type Gender = 'M' | 'F';

export type MatchingMode = 'balanced' | 'fairness' | 'level';

export type GenderMatchingMode = 'free' | 'same_or_mixed';

export type QueueMode = 'shared' | 'split';

export type GenderStyle = 'soft_bg' | 'thin_edge' | 'none';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  level: number; // 1..3 (1=Pemula, 2=Menengah, 3=Mahir)
  isActive: boolean; // true = siap main, false = istirahat
  assignedCourtId: string | null; // digunakan saat queueMode === 'split'
  matchesPlayed: number;
  lastPlayedAt: number; // sequence counter untuk prioritas waktu tunggu
}

export interface CourtLineup {
  teamA: [string | null, string | null];
  teamB: [string | null, string | null];
}

export interface Court {
  id: string;
  number: number;
  name: string;
  status: 'open' | 'playing';
  lineup: CourtLineup;
  pinnedPlayerIds: string[];
  startedAt: number | null;
}

export interface MatchRecord {
  id: string;
  courtId: string;
  courtNumber: number;
  courtName: string;
  teamA: [string, string];
  teamB: [string, string];
  timestamp: number;
}

export interface ClubSettings {
  matchingMode: MatchingMode;
  genderMatching: GenderMatchingMode;
  sameGenderPercent: number; // 0..100 (porsi satu gender, sisanya mix gender)
  queueMode: QueueMode;
  genderStyle: GenderStyle;
}

export interface Club {
  id: string;
  name: string;
  players: Player[];
  courts: Court[];
  records: MatchRecord[];
  settings: ClubSettings;
  sequenceCounter: number;
}

export interface AppState {
  clubs: Club[];
  activeClubId: string;
}

export type ActiveTab = 'courts' | 'roster' | 'records' | 'settings';
