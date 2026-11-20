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
  isPresent?: boolean; // true/undefined = hadir, false = belum hadir
  checkedInAt?: number | null;
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

export type PlayerPreferenceMode = 'same_team' | 'same_court';

export interface PlayerPreferenceGroup {
  id: string;
  mode: PlayerPreferenceMode;
  playerIds: string[]; // 2 pemain untuk same_team, 2..4 pemain untuk same_court
  courtId?: string | null; // null/undefined = lapangan mana saja, atau id lapangan tertentu
  createdAt: number;
}

export interface Club {
  id: string;
  name: string;
  players: Player[];
  courts: Court[];
  records: MatchRecord[];
  playerGroups?: PlayerPreferenceGroup[];
  settings: ClubSettings;
  sequenceCounter: number;
}

export interface AppState {
  clubs: Club[];
  activeClubId: string;
}

export type ActiveTab = 'courts' | 'roster' | 'records' | 'attendance' | 'settings';
