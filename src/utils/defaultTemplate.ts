import { AppState, Club, ClubSettings, Court, Player } from '../types/badminton';
import { clampLevel } from './genderStyle';
import { reconcileOpenCourts } from './scheduler';

export const DEFAULT_TEMPLATE_STORAGE_KEY = 'noz_default_v1';

export interface SavedDefaultTemplate {
  version: 1;
  savedAt: number;
  state: AppState;
}

function normalizeClubSettings(settings?: Partial<ClubSettings>): ClubSettings {
  return {
    matchingMode:
      settings?.matchingMode === 'fairness' ||
      settings?.matchingMode === 'level' ||
      settings?.matchingMode === 'balanced'
        ? settings.matchingMode
        : 'balanced',
    genderMatching:
      settings?.genderMatching === 'same_or_mixed' ? 'same_or_mixed' : 'free',
    sameGenderPercent:
      typeof settings?.sameGenderPercent === 'number' &&
      Number.isFinite(settings.sameGenderPercent)
        ? Math.max(0, Math.min(100, Math.round(settings.sameGenderPercent)))
        : 50,
    queueMode: settings?.queueMode === 'split' ? 'split' : 'shared',
    genderStyle:
      settings?.genderStyle === 'thin_edge' || settings?.genderStyle === 'none'
        ? settings.genderStyle
        : 'soft_bg',
  };
}

function normalizeClubForDefault(club: Club): Club {
  const courtsCount = Math.max(1, Math.min(12, club.courts?.length || 1));
  const normalizedCourts: Court[] = Array.from(
    { length: courtsCount },
    (_, idx) => {
      const existing = club.courts?.[idx];
      return {
        id: existing?.id || `${club.id}_court_${idx + 1}`,
        number: idx + 1,
        name: `Lapangan ${idx + 1}`,
        status: 'open',
        lineup: { teamA: [null, null], teamB: [null, null] },
        pinnedPlayerIds: [],
        startedAt: null,
      };
    }
  );

  const validCourtIds = new Set(normalizedCourts.map((c) => c.id));
  const fallbackCourtId = normalizedCourts[0]?.id ?? null;

  const normalizedPlayers: Player[] = (club.players ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    gender: p.gender === 'F' ? 'F' : 'M',
    level: clampLevel(p.level),
    isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
    assignedCourtId:
      p.assignedCourtId && validCourtIds.has(p.assignedCourtId)
        ? p.assignedCourtId
        : fallbackCourtId,
    matchesPlayed: 0,
    lastPlayedAt: 0,
  }));

  return reconcileOpenCourts({
    id: club.id,
    name: club.name.trim() || 'PB Noz',
    players: normalizedPlayers,
    courts: normalizedCourts,
    records: [],
    settings: normalizeClubSettings(club.settings),
    sequenceCounter: 0,
  });
}

export function createDefaultTemplate(
  state: AppState,
  now = Date.now()
): SavedDefaultTemplate {
  const clubs = state.clubs.map(normalizeClubForDefault);
  const activeClubId = clubs.some((c) => c.id === state.activeClubId)
    ? state.activeClubId
    : clubs[0]?.id ?? 'club_pb_noz';

  return {
    version: 1,
    savedAt: now,
    state: {
      clubs,
      activeClubId,
    },
  };
}

export function restoreStateFromDefaultTemplate(
  template: SavedDefaultTemplate
): AppState {
  const clubs = template.state.clubs.map(normalizeClubForDefault);
  const activeClubId = clubs.some((c) => c.id === template.state.activeClubId)
    ? template.state.activeClubId
    : clubs[0]?.id ?? 'club_pb_noz';

  return {
    clubs,
    activeClubId,
  };
}

export function parseDefaultTemplateJson(
  rawJson: string
): SavedDefaultTemplate | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<SavedDefaultTemplate> &
      Partial<AppState>;
    const candidateState: Partial<AppState> | undefined = parsed?.state
      ? parsed.state
      : Array.isArray(parsed?.clubs)
      ? { clubs: parsed.clubs, activeClubId: parsed.activeClubId }
      : undefined;

    if (
      !candidateState ||
      !Array.isArray(candidateState.clubs) ||
      candidateState.clubs.length === 0
    ) {
      return null;
    }

    const validClubs = candidateState.clubs.filter(
      (c): c is Club =>
        Boolean(c) &&
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        Array.isArray(c.players)
    );
    if (validClubs.length === 0) return null;

    return createDefaultTemplate(
      {
        clubs: validClubs,
        activeClubId:
          typeof candidateState.activeClubId === 'string'
            ? candidateState.activeClubId
            : validClubs[0].id,
      },
      typeof parsed?.savedAt === 'number' ? parsed.savedAt : Date.now()
    );
  } catch {
    return null;
  }
}

export function loadSavedDefaultTemplate(): SavedDefaultTemplate | null {
  try {
    const raw = window.localStorage.getItem(DEFAULT_TEMPLATE_STORAGE_KEY);
    if (!raw) return null;
    return parseDefaultTemplateJson(raw);
  } catch {
    return null;
  }
}
