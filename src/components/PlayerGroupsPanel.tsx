import { useMemo, useState } from 'react';
import { Check, LayoutGrid, Plus, Search, Trash2, Users } from 'lucide-react';
import {
  Court,
  GenderStyle,
  Player,
  PlayerPreferenceGroup,
  PlayerPreferenceMode,
} from '../types/badminton';
import {
  getGenderLabelClasses,
  getGenderShortLabel,
  LEVEL_LABELS,
} from '../utils/genderStyle';
import { isGroupFulfilledInCourt, isPlayerPresent } from '../utils/scheduler';

interface PlayerGroupsPanelProps {
  players: Player[];
  courts: Court[];
  groups: PlayerPreferenceGroup[];
  genderStyle: GenderStyle;
  onAddGroup: (input: {
    mode: PlayerPreferenceMode;
    playerIds: string[];
    courtId: string | null;
  }) => void;
  onRemoveGroup: (groupId: string) => void;
}

export function PlayerGroupsPanel({
  players,
  courts,
  groups,
  genderStyle,
  onAddGroup,
  onRemoveGroup,
}: PlayerGroupsPanelProps) {
  const [mode, setMode] = useState<PlayerPreferenceMode>('same_team');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetCourtId, setTargetCourtId] = useState<string>('');
  const [search, setSearch] = useState('');

  const maxSelect = mode === 'same_team' ? 2 : 4;
  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );
  const courtsById = useMemo(
    () => new Map(courts.map((c) => [c.id, c])),
    [courts]
  );

  const sortedPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...players]
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        const aReady = a.isActive && isPlayerPresent(a) ? 0 : 1;
        const bReady = b.isActive && isPlayerPresent(b) ? 0 : 1;
        if (aReady !== bReady) return aReady - bReady;
        return a.name.localeCompare(b.name);
      });
  }, [players, search]);

  const effectiveTargetCourtId =
    targetCourtId && courtsById.has(targetCourtId) ? targetCourtId : '';

  const handleChangeMode = (nextMode: PlayerPreferenceMode) => {
    setMode(nextMode);
    if (nextMode === 'same_team' && selectedIds.length > 2) {
      setSelectedIds((prev) => prev.slice(0, 2));
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= maxSelect) {
        return prev;
      }
      return [...prev, playerId];
    });
  };

  const validSelectionCount = selectedIds.filter((id) => playersById.has(id));
  const canSubmit =
    mode === 'same_team'
      ? validSelectionCount.length === 2
      : validSelectionCount.length >= 2 && validSelectionCount.length <= 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAddGroup({
      mode,
      playerIds: validSelectionCount,
      courtId: effectiveTargetCourtId || null,
    });
    setSelectedIds([]);
    setSearch('');
  };

  const getGroupStatus = (
    group: PlayerPreferenceGroup
  ): { label: string; tone: 'active' | 'waiting' } => {
    for (const c of courts) {
      if (isGroupFulfilledInCourt(group, c)) {
        return c.status === 'playing'
          ? { label: `Sedang Main · ${c.name}`, tone: 'active' }
          : { label: `Terpenuhi · ${c.name}`, tone: 'active' };
      }
    }

    const hasInactiveOrAbsent = group.playerIds.some((id) => {
      const p = playersById.get(id);
      return !p || !p.isActive || !isPlayerPresent(p);
    });
    if (hasInactiveOrAbsent) {
      return { label: 'Ada pemain belum hadir / istirahat', tone: 'waiting' };
    }

    return { label: 'Menunggu giliran', tone: 'waiting' };
  };

  return (
    <section
      aria-label="Daftar pemain satu tim dan satu lapangan"
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Daftar Pemain Satu Tim &amp; Satu Lapangan
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Tambahkan pasangan yang ingin selalu <strong>satu tim saja</strong> (2 pemain) atau kelompok yang ingin bermain <strong>satu lapangan saja</strong> (2–4 pemain).
          </p>
        </div>

        <div
          role="group"
          aria-label="Pilih jenis daftar pemain"
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0"
        >
          <button
            type="button"
            onClick={() => handleChangeMode('same_team')}
            aria-pressed={mode === 'same_team'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'same_team'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Satu Tim Saja</span>
          </button>
          <button
            type="button"
            onClick={() => handleChangeMode('same_court')}
            aria-pressed={mode === 'same_court'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'same_court'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Satu Lapangan Saja</span>
          </button>
        </div>
      </div>

      {players.length < 2 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-center text-xs sm:text-sm text-slate-500">
          Tambahkan minimal 2 pemain di klub ini untuk membuat daftar satu tim atau satu lapangan.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            <div className="sm:col-span-6 relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama pemain untuk dipilih..."
                aria-label="Cari pemain untuk daftar satu tim atau satu lapangan"
                className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-6 flex items-center gap-2">
              <label
                htmlFor="group-target-court"
                className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0"
              >
                Lapangan:
              </label>
              <select
                id="group-target-court"
                value={effectiveTargetCourtId}
                onChange={(e) => setTargetCourtId(e.target.value)}
                aria-label="Pilih target lapangan daftar pemain"
                className="flex-1 min-w-0 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              >
                <option value="">
                  {mode === 'same_team'
                    ? 'Lapangan Mana Saja (Otomatis)'
                    : 'Satu Lapangan Bersama (Mana Saja)'}
                </option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    Khusus {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-select Player Chips */}
          <div
            role="group"
            aria-label="Pilih pemain ke dalam daftar"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1"
          >
            {sortedPlayers.map((player) => {
              const isSelected = validSelectionCount.includes(player.id);
              const limitReached =
                !isSelected && validSelectionCount.length >= maxSelect;
              const present = isPlayerPresent(player);
              const activeReady = player.isActive && present;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => togglePlayerSelection(player.id)}
                  aria-pressed={isSelected}
                  disabled={limitReached}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    isSelected
                      ? mode === 'same_team'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold'
                        : 'bg-sky-50 border-sky-600 text-sky-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={`font-mono text-[11px] shrink-0 ${getGenderLabelClasses(
                          player.gender,
                          genderStyle
                        )}`}
                      >
                        {getGenderShortLabel(player.gender)}
                      </span>
                      <span className="truncate">{player.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      Lv.{player.level} {LEVEL_LABELS[player.level] ?? ''}
                      {!present
                        ? ' · Belum hadir'
                        : !activeReady
                        ? ' · Istirahat'
                        : ''}
                    </div>
                  </div>
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        mode === 'same_team' ? 'text-emerald-700' : 'text-sky-700'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs text-slate-600 tabular-nums">
              {mode === 'same_team' ? (
                <>
                  Dipilih:{' '}
                  <strong className="text-slate-900">
                    {validSelectionCount.length}/2
                  </strong>{' '}
                  pemain (wajib tepat 2 pemain untuk 1 tim)
                </>
              ) : (
                <>
                  Dipilih:{' '}
                  <strong className="text-slate-900">
                    {validSelectionCount.length}/4
                  </strong>{' '}
                  pemain (pilih 2–4 pemain untuk 1 lapangan)
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              {validSelectionCount.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Reset Pilihan
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                  mode === 'same_team'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-sky-700 hover:bg-sky-800'
                }`}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>
                  {mode === 'same_team'
                    ? 'Tambah Daftar Satu Tim'
                    : 'Tambah Daftar Satu Lapangan'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Saved Player Group Lists */}
      {groups.length > 0 && (
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-slate-600">
            Daftar Aktif ({groups.length})
          </div>
          <div className="space-y-2">
            {groups.map((group) => {
              const memberNames = group.playerIds
                .map((id) => playersById.get(id)?.name)
                .filter((name): name is string => Boolean(name));
              if (memberNames.length < 2) return null;

              const isSameTeam = group.mode === 'same_team';
              const targetCourt = group.courtId
                ? courtsById.get(group.courtId)
                : null;
              const status = getGroupStatus(group);
              const joinedNames = isSameTeam
                ? memberNames.join(' & ')
                : memberNames.join(', ');

              return (
                <div
                  key={group.id}
                  className={`rounded-lg border px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 ${
                    isSameTeam
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-sky-50/50 border-sky-200'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          isSameTeam
                            ? 'bg-emerald-700 text-white'
                            : 'bg-sky-700 text-white'
                        }`}
                      >
                        {isSameTeam ? 'Satu Tim Saja' : 'Satu Lapangan Saja'}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {targetCourt
                          ? `Khusus ${targetCourt.name}`
                          : isSameTeam
                          ? 'Semua Lapangan'
                          : 'Satu Lapangan Bersama'}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          status.tone === 'active'
                            ? 'text-emerald-800'
                            : 'text-slate-600'
                        }`}
                      >
                        · {status.label}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-900">
                      {joinedNames}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveGroup(group.id)}
                    aria-label={`Hapus daftar ${joinedNames}`}
                    title="Hapus daftar ini"
                    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
