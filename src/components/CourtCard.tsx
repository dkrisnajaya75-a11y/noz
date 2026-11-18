import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Pin,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Court,
  GenderStyle,
  Player,
} from '../types/badminton';
import {
  getGenderCardClasses,
  getGenderFullLabel,
  getGenderLabelClasses,
  getGenderShortLabel,
  LEVEL_DESCRIPTIONS,
  LEVEL_LABELS,
} from '../utils/genderStyle';
import { isLineupComplete } from '../utils/scheduler';

export interface SwapSource {
  courtId: string;
  slotIndex: 0 | 1 | 2 | 3;
  playerName: string;
}

interface CourtCardProps {
  court: Court;
  playersById: Map<string, Player>;
  genderStyle: GenderStyle;
  canRemoveCourt: boolean;
  swapSource: SwapSource | null;
  onStartMatch: (courtId: string) => void;
  onFinishMatch: (courtId: string) => void;
  onRerollCourt: (courtId: string) => void;
  onTogglePin: (courtId: string, playerId: string) => void;
  onSelectSlotForSwap: (courtId: string, slotIndex: 0 | 1 | 2 | 3) => void;
  onRemoveCourt: (courtId: string) => void;
}

function formatDuration(startedAt: number | null, now: number): string {
  if (!startedAt) return '00:00';
  const totalSec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CourtCard({
  court,
  playersById,
  genderStyle,
  canRemoveCourt,
  swapSource,
  onStartMatch,
  onFinishMatch,
  onRerollCourt,
  onTogglePin,
  onSelectSlotForSwap,
  onRemoveCourt,
}: CourtCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (court.status !== 'playing') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [court.status]);

  const isPlaying = court.status === 'playing';
  const complete = isLineupComplete(court.lineup);

  const slots: Array<{
    slotIndex: 0 | 1 | 2 | 3;
    team: 'A' | 'B';
    player: Player | null;
  }> = [
    {
      slotIndex: 0,
      team: 'A',
      player: court.lineup.teamA[0]
        ? playersById.get(court.lineup.teamA[0]) ?? null
        : null,
    },
    {
      slotIndex: 1,
      team: 'A',
      player: court.lineup.teamA[1]
        ? playersById.get(court.lineup.teamA[1]) ?? null
        : null,
    },
    {
      slotIndex: 2,
      team: 'B',
      player: court.lineup.teamB[0]
        ? playersById.get(court.lineup.teamB[0]) ?? null
        : null,
    },
    {
      slotIndex: 3,
      team: 'B',
      player: court.lineup.teamB[1]
        ? playersById.get(court.lineup.teamB[1]) ?? null
        : null,
    },
  ];

  const teamALevel =
    (slots[0].player?.level ?? 0) + (slots[1].player?.level ?? 0);
  const teamBLevel =
    (slots[2].player?.level ?? 0) + (slots[3].player?.level ?? 0);

  const renderSlot = (slot: (typeof slots)[number]) => {
    const { player, slotIndex } = slot;
    const isThisSwapSource =
      swapSource?.courtId === court.id && swapSource?.slotIndex === slotIndex;
    const isSwapTargetCandidate = swapSource !== null && !isThisSwapSource;

    if (!player) {
      return (
        <button
          key={slotIndex}
          type="button"
          onClick={() => onSelectSlotForSwap(court.id, slotIndex)}
          className={`w-full min-h-[54px] px-3 py-2 rounded-lg border border-dashed text-left transition-colors flex items-center justify-between cursor-pointer ${
            isSwapTargetCandidate
              ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800'
              : 'border-slate-300 bg-slate-50/70 text-slate-400 hover:border-slate-400'
          }`}
        >
          <span className="text-xs font-medium">
            {isSwapTargetCandidate ? 'Pilih untuk isi slot ini' : 'Slot kosong'}
          </span>
        </button>
      );
    }

    const isPinned = court.pinnedPlayerIds.includes(player.id);
    const cardClasses = getGenderCardClasses(
      player.gender,
      genderStyle,
      isThisSwapSource
    );
    const genderLabelClasses = getGenderLabelClasses(player.gender, genderStyle);

    return (
      <div
        key={slotIndex}
        className={`rounded-lg border px-2.5 py-2 transition-colors flex items-center justify-between gap-1.5 ${cardClasses} ${
          isSwapTargetCandidate ? 'ring-1 ring-emerald-400/70' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectSlotForSwap(court.id, slotIndex)}
          className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-none"
          title={
            isThisSwapSource
              ? 'Batalkan tukar'
              : swapSource
              ? `Tukar dengan ${swapSource.playerName}`
              : `Tukar ${player.name}`
          }
        >
          <div className="flex items-center gap-1 min-w-0">
            <span
              className={`text-[11px] font-mono shrink-0 ${genderLabelClasses}`}
              title={getGenderFullLabel(player.gender)}
              aria-label={getGenderFullLabel(player.gender)}
            >
              {getGenderShortLabel(player.gender)}
            </span>
            <span className="text-sm font-semibold text-slate-900 truncate">
              {player.name}
            </span>
            <span
              className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums shrink-0 whitespace-nowrap"
              title={`Sudah main ${player.matchesPlayed} kali`}
              aria-label={`Sudah main ${player.matchesPlayed} kali`}
            >
              ({player.matchesPlayed}x)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
            <span title={LEVEL_DESCRIPTIONS[player.level] ?? ''}>
              Lv.{player.level} · {LEVEL_LABELS[player.level] ?? ''}
            </span>
            {isPinned && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-sans font-semibold">
                  Disematkan
                </span>
              </>
            )}
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onTogglePin(court.id, player.id)}
            aria-label={
              isPinned
                ? `Lepas sematan ${player.name}`
                : `Sematkan ${player.name} ke ${court.name}`
            }
            aria-pressed={isPinned}
            title={isPinned ? 'Lepas sematan' : 'Sematkan ke lapangan ini'}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isPinned
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'text-slate-400 hover:text-slate-700 hover:bg-white/80'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectSlotForSwap(court.id, slotIndex)}
            aria-label={`Tukar ${player.name} di ${court.name}`}
            aria-pressed={isThisSwapSource}
            title={isThisSwapSource ? 'Batal tukar' : 'Tukar pemain'}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isThisSwapSource
                ? 'bg-emerald-700 text-white'
                : 'text-slate-400 hover:text-emerald-700 hover:bg-white/80'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label={court.name}
      data-testid={`court-card-${court.number}`}
      className={`bg-white rounded-xl border transition-colors flex flex-col ${
        isPlaying ? 'border-emerald-600/70' : 'border-slate-200'
      }`}
    >
      {/* Court Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="text-base font-bold text-slate-900 whitespace-nowrap shrink-0">
              {court.name}
            </h3>
            <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
              ·
            </span>
            {isPlaying ? (
              <span className="text-xs font-semibold text-emerald-700 font-mono tabular-nums whitespace-nowrap">
                Sedang Main · {formatDuration(court.startedAt, now)}
              </span>
            ) : complete ? (
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                Saran Otomatis Siap
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-700 whitespace-nowrap">
                Menunggu Pemain
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isPlaying && (
            <button
              type="button"
              onClick={() => onRerollCourt(court.id)}
              aria-label={`Acak ulang ${court.name}`}
              title="Acak ulang susunan pemain"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Acak Ulang</span>
            </button>
          )}
          {canRemoveCourt && (
            <button
              type="button"
              onClick={() => onRemoveCourt(court.id)}
              aria-label={`Hapus ${court.name}`}
              title={`Hapus ${court.name}`}
              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Court Surface: Team A vs Net vs Team B */}
      <div className="p-4 flex-1 flex flex-col gap-3 bg-emerald-950/[0.025]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 px-0.5">
            <span>Tim A</span>
            {slots[0].player && slots[1].player && (
              <span className="font-mono tabular-nums">
                Total Lv.{teamALevel}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {renderSlot(slots[0])}
            {renderSlot(slots[1])}
          </div>
        </div>

        {/* Badminton Net Divider */}
        <div className="flex items-center gap-2.5 py-0.5">
          <div
            aria-hidden="true"
            className="flex-1 border-t border-dashed border-emerald-700/25"
          />
          <span className="text-[11px] font-mono font-semibold text-emerald-800/70">
            NET
          </span>
          <div
            aria-hidden="true"
            className="flex-1 border-t border-dashed border-emerald-700/25"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 px-0.5">
            <span>Tim B</span>
            {slots[2].player && slots[3].player && (
              <span className="font-mono tabular-nums">
                Total Lv.{teamBLevel}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {renderSlot(slots[2])}
            {renderSlot(slots[3])}
          </div>
        </div>
      </div>

      {/* Court Footer Action */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white rounded-b-xl">
        {isPlaying ? (
          <button
            type="button"
            onClick={() => onFinishMatch(court.id)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Selesai &amp; Saran Berikutnya</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStartMatch(court.id)}
            disabled={!complete}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>
              {complete
                ? 'Mulai Pertandingan'
                : 'Butuh 4 Pemain Siap untuk Mulai'}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
