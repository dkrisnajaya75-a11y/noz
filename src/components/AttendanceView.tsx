import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Search,
  Upload,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Gender, GenderStyle, Player } from '../types/badminton';
import {
  getGenderFullLabel,
  getGenderLabelClasses,
  getGenderShortLabel,
  LEVEL_DESCRIPTIONS,
  LEVEL_LABELS,
} from '../utils/genderStyle';
import { isPlayerPresent } from '../utils/scheduler';

interface AttendanceViewProps {
  clubName: string;
  players: Player[];
  playingPlayerIds: Set<string>;
  genderStyle: GenderStyle;
  onSetPlayerAttendance: (playerId: string, isPresent: boolean) => void;
  onSetBulkAttendance: (isPresent: boolean) => void;
  onOpenBulkImport: () => void;
}

type AttendanceFilter = 'ALL' | 'PRESENT' | 'ABSENT';

export function AttendanceView({
  clubName,
  players,
  playingPlayerIds,
  genderStyle,
  onSetPlayerAttendance,
  onSetBulkAttendance,
  onOpenBulkImport,
}: AttendanceViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceFilter>('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | Gender>('ALL');

  const presentCount = useMemo(
    () => players.filter((p) => isPlayerPresent(p)).length,
    [players]
  );
  const absentCount = players.length - presentCount;
  const attendancePercent =
    players.length > 0 ? Math.round((presentCount / players.length) * 100) : 0;

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...players]
      .filter((p) => {
        const present = isPlayerPresent(p);
        if (statusFilter === 'PRESENT' && !present) return false;
        if (statusFilter === 'ABSENT' && present) return false;
        if (genderFilter !== 'ALL' && p.gender !== genderFilter) return false;
        if (q && !p.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const aPresent = isPlayerPresent(a) ? 1 : 0;
        const bPresent = isPlayerPresent(b) ? 1 : 0;
        if (aPresent !== bPresent) return aPresent - bPresent;
        return a.name.localeCompare(b.name);
      });
  }, [players, search, statusFilter, genderFilter]);

  const formatCheckedInTime = (ts?: number | null) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Absen Kehadiran — {clubName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tandai pemain yang sudah hadir di lapangan atau belum hadir. Hanya pemain berstatus Hadir yang masuk antrean dan saran otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSetBulkAttendance(true)}
            disabled={players.length === 0 || presentCount === players.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4" aria-hidden="true" />
            <span>Tandai Semua Hadir</span>
          </button>
          <button
            type="button"
            onClick={() => onSetBulkAttendance(false)}
            disabled={
              players.length === 0 ||
              players.every((p) => !isPlayerPresent(p) || playingPlayerIds.has(p.id))
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            <UserX className="w-4 h-4" aria-hidden="true" />
            <span>Semua Belum Hadir</span>
          </button>
        </div>
      </div>

      {/* 4-column Attendance KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Total Pemain Terdaftar
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {players.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Hadir</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            {presentCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Belum Hadir</div>
          <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
            {absentCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Tingkat Kehadiran
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {attendancePercent}%
          </div>
        </div>
      </div>

      {/* Filter & Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pemain..."
              aria-label="Cari nama pemain di absen"
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter status kehadiran"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {[
                { id: 'ALL' as const, label: `Semua (${players.length})` },
                { id: 'PRESENT' as const, label: `Hadir (${presentCount})` },
                { id: 'ABSENT' as const, label: `Belum Hadir (${absentCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  aria-pressed={statusFilter === tab.id}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer tabular-nums ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Filter gender di absen"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {[
                { id: 'ALL' as const, label: 'L & P' },
                { id: 'M' as const, label: 'L' },
                { id: 'F' as const, label: 'P' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGenderFilter(tab.id)}
                  aria-pressed={genderFilter === tab.id}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    genderFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <p className="text-sm text-slate-500">
              Belum ada pemain di klub ini. Tambahkan pemain di menu Pemain atau impor daftar terlebih dahulu.
            </p>
            <button
              type="button"
              onClick={onOpenBulkImport}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Impor Pemain</span>
            </button>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Tidak ada pemain yang cocok dengan filter absen saat ini.
          </div>
        ) : (
          <>
            {/* Mobile Card List (avoids horizontal scroll clipping action toggles on phones) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredPlayers.map((player) => {
                const present = isPlayerPresent(player);
                const isCurrentlyPlaying = playingPlayerIds.has(player.id);
                const rowTint =
                  genderStyle === 'soft_bg'
                    ? player.gender === 'M'
                      ? 'bg-sky-50/35'
                      : 'bg-rose-50/35'
                    : genderStyle === 'thin_edge'
                    ? player.gender === 'M'
                      ? 'border-l-2 border-l-sky-500'
                      : 'border-l-2 border-l-rose-500'
                    : '';

                return (
                  <div
                    key={player.id}
                    className={`p-4 space-y-2.5 ${rowTint} ${
                      !present ? 'opacity-80' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <span
                            className={`inline-block w-4 font-mono text-xs shrink-0 ${getGenderLabelClasses(
                              player.gender,
                              genderStyle
                            )}`}
                            title={getGenderFullLabel(player.gender)}
                          >
                            {getGenderShortLabel(player.gender)}
                          </span>
                          <span className="truncate">{player.name}</span>
                          {isCurrentlyPlaying && (
                            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                              Sedang Main
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                          Lv.{player.level} · {player.matchesPlayed}x main ·{' '}
                          {present
                            ? `Hadir ${formatCheckedInTime(player.checkedInAt)}`
                            : 'Belum hadir'}
                        </div>
                      </div>
                    </div>

                    <div
                      role="group"
                      aria-label={`Status absen mobile ${player.name}`}
                      className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => onSetPlayerAttendance(player.id, true)}
                        aria-pressed={present}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          present
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Hadir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetPlayerAttendance(player.id, false)}
                        aria-pressed={!present}
                        disabled={isCurrentlyPlaying}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                          !present
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Belum Hadir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Attendance Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="py-3 px-4">Nama Pemain</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Main</th>
                    <th className="py-3 px-4">Waktu Hadir</th>
                    <th className="py-3 px-4 text-right">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPlayers.map((player) => {
                    const present = isPlayerPresent(player);
                    const isCurrentlyPlaying = playingPlayerIds.has(player.id);
                    const rowTint =
                      genderStyle === 'soft_bg'
                        ? player.gender === 'M'
                          ? 'bg-sky-50/35'
                          : 'bg-rose-50/35'
                        : genderStyle === 'thin_edge'
                        ? player.gender === 'M'
                          ? 'border-l-2 border-l-sky-500'
                          : 'border-l-2 border-l-rose-500'
                        : '';

                    return (
                      <tr
                        key={player.id}
                        className={`hover:bg-slate-50/90 transition-colors ${rowTint} ${
                          !present ? 'opacity-80' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block w-4 font-mono text-xs shrink-0 ${getGenderLabelClasses(
                                player.gender,
                                genderStyle
                              )}`}
                              title={getGenderFullLabel(player.gender)}
                            >
                              {getGenderShortLabel(player.gender)}
                            </span>
                            <span>{player.name}</span>
                            {isCurrentlyPlaying && (
                              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Sedang Main
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">
                          <span title={LEVEL_DESCRIPTIONS[player.level] ?? ''}>
                            Lv.{player.level} · {LEVEL_LABELS[player.level] ?? ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-700">
                          {player.matchesPlayed}x
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                          {present
                            ? formatCheckedInTime(player.checkedInAt)
                            : 'Belum hadir'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div
                            role="group"
                            aria-label={`Status absen ${player.name}`}
                            className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200"
                          >
                            <button
                              type="button"
                              onClick={() => onSetPlayerAttendance(player.id, true)}
                              aria-pressed={present}
                              aria-label={`Tandai ${player.name} hadir`}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                present
                                  ? 'bg-emerald-700 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Hadir</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSetPlayerAttendance(player.id, false)}
                              aria-pressed={!present}
                              disabled={isCurrentlyPlaying}
                              aria-label={`Tandai ${player.name} belum hadir`}
                              title={
                                isCurrentlyPlaying
                                  ? 'Selesaikan pertandingan dulu sebelum menandai belum hadir'
                                  : 'Tandai belum hadir'
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                                !present
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Belum Hadir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
