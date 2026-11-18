import { useState } from 'react';
import { Coffee, Pin, Plus, RotateCcw, X } from 'lucide-react';
import {
  Court,
  Gender,
  GenderStyle,
  Player,
  QueueMode,
} from '../types/badminton';
import {
  getGenderCardClasses,
  getGenderFullLabel,
  getGenderLabelClasses,
  getGenderShortLabel,
  LEVEL_DESCRIPTIONS,
  LEVEL_LABELS,
} from '../utils/genderStyle';
import { getLineupPlayerIds } from '../utils/scheduler';
import { SwapSource } from './CourtCard';

interface WaitingQueueProps {
  players: Player[];
  courts: Court[];
  queueMode: QueueMode;
  genderStyle: GenderStyle;
  swapSource: SwapSource | null;
  onCancelSwap: () => void;
  onSwapWithPlayer: (playerId: string) => void;
  onToggleActive: (playerId: string) => void;
  onAssignPlayerCourt: (playerId: string, courtId: string | null) => void;
  onPinPlayerToCourt: (courtId: string, playerId: string) => void;
  onQuickAddPlayer: (name: string, gender: Gender, level: number) => void;
}

export function WaitingQueue({
  players,
  courts,
  queueMode,
  genderStyle,
  swapSource,
  onCancelSwap,
  onSwapWithPlayer,
  onToggleActive,
  onAssignPlayerCourt,
  onPinPlayerToCourt,
  onQuickAddPlayer,
}: WaitingQueueProps) {
  const [quickName, setQuickName] = useState('');
  const [quickGender, setQuickGender] = useState<Gender>('M');
  const [quickLevel, setQuickLevel] = useState(2);
  const [selectedSplitCourtId, setSelectedSplitCourtId] = useState<string>(
    courts[0]?.id ?? ''
  );

  // Players currently on any court (playing or suggested)
  const onCourtPlayingIds = new Set<string>();
  const onCourtSuggestedIds = new Set<string>();
  const pinnedCourtByPlayer = new Map<string, Court>();

  for (const c of courts) {
    const ids = getLineupPlayerIds(c.lineup);
    if (c.status === 'playing') {
      ids.forEach((id) => onCourtPlayingIds.add(id));
    } else {
      ids.forEach((id) => onCourtSuggestedIds.add(id));
    }
    c.pinnedPlayerIds.forEach((pid) => pinnedCourtByPlayer.set(pid, c));
  }

  // Waiting players: active and not currently playing on a court
  const waitingPlayers = players
    .filter((p) => p.isActive && !onCourtPlayingIds.has(p.id))
    .sort((a, b) => {
      // Put truly unassigned/un-suggested waiting players first, then suggested
      const aSug = onCourtSuggestedIds.has(a.id) ? 1 : 0;
      const bSug = onCourtSuggestedIds.has(b.id) ? 1 : 0;
      if (aSug !== bSug) return aSug - bSug;
      if (a.matchesPlayed !== b.matchesPlayed) {
        return a.matchesPlayed - b.matchesPlayed;
      }
      return a.lastPlayedAt - b.lastPlayedAt;
    });

  const restingPlayers = players.filter((p) => !p.isActive);

  const openCourts = courts.filter((c) => c.status === 'open');
  const effectiveSplitCourtId =
    courts.some((c) => c.id === selectedSplitCourtId)
      ? selectedSplitCourtId
      : courts[0]?.id ?? '';

  const displayedWaiting =
    queueMode === 'split'
      ? waitingPlayers.filter((p) => p.assignedCourtId === effectiveSplitCourtId)
      : waitingPlayers;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickName.trim();
    if (!trimmed) return;
    onQuickAddPlayer(trimmed, quickGender, quickLevel);
    setQuickName('');
  };

  return (
    <aside
      aria-label="Daftar Tunggu Pemain"
      className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden"
    >
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {queueMode === 'shared'
              ? 'Daftar Tunggu Bersama'
              : 'Antrean Per Lapangan'}
          </h2>
          <p className="text-xs text-slate-500 tabular-nums mt-0.5">
            {waitingPlayers.length} pemain menunggu · {restingPlayers.length} istirahat
          </p>
        </div>
      </div>

      {/* Swap Mode Banner */}
      {swapSource && (
        <div
          role="status"
          className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-2"
        >
          <p className="text-xs font-medium text-emerald-900">
            Menukar <strong>{swapSource.playerName}</strong>. Ketuk pemain di bawah atau slot lapangan lain.
          </p>
          <button
            type="button"
            onClick={onCancelSwap}
            aria-label="Batalkan tukar pemain"
            className="p-1 text-emerald-800 hover:bg-emerald-100 rounded cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Split-per-court selector tabs */}
      {queueMode === 'split' && (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {courts.map((c) => {
              const count = waitingPlayers.filter(
                (p) => p.assignedCourtId === c.id
              ).length;
              const isSelected = c.id === effectiveSplitCourtId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedSplitCourtId(c.id)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer tabular-nums ${
                    isSelected
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Lap {c.number} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Inline Add Player */}
      <form
        onSubmit={handleQuickAdd}
        className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 space-y-2"
      >
        <input
          type="text"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          placeholder="Tambah cepat nama pemain..."
          aria-label="Tambah cepat nama pemain"
          className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <div className="flex items-center gap-1.5">
          <select
            value={quickGender}
            onChange={(e) => setQuickGender(e.target.value as Gender)}
            aria-label="Gender pemain baru"
            className="min-w-0 flex-1 text-xs font-medium bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="M">L (Putra)</option>
            <option value="F">P (Putri)</option>
          </select>
          <select
            value={quickLevel}
            onChange={(e) => setQuickLevel(Number(e.target.value))}
            aria-label="Level pemain baru"
            className="min-w-0 flex-1 text-xs font-medium bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer tabular-nums"
          >
            <option value={1}>1 - Pemula</option>
            <option value={2}>2 - Menengah</option>
            <option value={3}>3 - Mahir</option>
          </select>
          <button
            type="submit"
            aria-label="Tambah pemain ke antrean"
            disabled={!quickName.trim()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tambah</span>
          </button>
        </div>
      </form>

      {/* Waiting Players List */}
      <div className="p-3 space-y-2 max-h-[540px] overflow-y-auto">
        {displayedWaiting.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {queueMode === 'split'
              ? 'Belum ada pemain menunggu di antrean lapangan ini.'
              : 'Semua pemain siap sedang bermain di lapangan.'}
          </div>
        ) : (
          displayedWaiting.map((player) => {
            const isSuggested = onCourtSuggestedIds.has(player.id);
            const pinnedCourt = pinnedCourtByPlayer.get(player.id);
            const cardClasses = getGenderCardClasses(player.gender, genderStyle);
            const labelClasses = getGenderLabelClasses(player.gender, genderStyle);

            return (
              <div
                key={player.id}
                className={`rounded-lg border px-3 py-2 transition-colors flex items-center justify-between gap-2 ${cardClasses} ${
                  swapSource ? 'ring-1 ring-emerald-400' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (swapSource) {
                      onSwapWithPlayer(player.id);
                    }
                  }}
                  disabled={!swapSource}
                  className={`flex-1 min-w-0 text-left ${
                    swapSource ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={`text-[11px] font-mono shrink-0 ${labelClasses}`}
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
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                    <span title={LEVEL_DESCRIPTIONS[player.level] ?? ''}>
                      Lv.{player.level} {LEVEL_LABELS[player.level] ?? ''}
                    </span>
                    {isSuggested && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-sans font-medium">
                          Di saran lapangan
                        </span>
                      </>
                    )}
                    {pinnedCourt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 font-sans font-medium">
                          Semat Lap {pinnedCourt.number}
                        </span>
                      </>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {queueMode === 'split' && (
                    <select
                      value={player.assignedCourtId ?? ''}
                      onChange={(e) =>
                        onAssignPlayerCourt(
                          player.id,
                          e.target.value || null
                        )
                      }
                      aria-label={`Pindah antrean lapangan untuk ${player.name}`}
                      className="text-[11px] font-medium bg-white border border-slate-300 rounded px-1.5 py-1 text-slate-700 cursor-pointer"
                    >
                      {courts.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lap {c.number}
                        </option>
                      ))}
                    </select>
                  )}

                  {openCourts.length > 0 && !swapSource && (
                    <select
                      value={pinnedCourt?.id ?? ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          onPinPlayerToCourt(e.target.value, player.id);
                        }
                      }}
                      aria-label={`Sematkan ${player.name} ke lapangan`}
                      title="Sematkan ke lapangan"
                      className="text-[11px] font-medium bg-white/90 border border-slate-300 rounded px-1.5 py-1 text-slate-700 cursor-pointer"
                    >
                      <option value="">Sematkan</option>
                      {openCourts.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lap {c.number}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleActive(player.id)}
                    title="Istirahatkan sementara"
                    aria-label={`Istirahatkan ${player.name}`}
                    className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-white rounded-md transition-colors cursor-pointer"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Unassigned players warning in split mode */}
        {queueMode === 'split' &&
          waitingPlayers.filter(
            (p) => !p.assignedCourtId || !courts.some((c) => c.id === p.assignedCourtId)
          ).length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500 px-1">
                Belum Masuk Antrean Lapangan
              </div>
              {waitingPlayers
                .filter(
                  (p) =>
                    !p.assignedCourtId ||
                    !courts.some((c) => c.id === p.assignedCourtId)
                )
                .map((player) => (
                  <div
                    key={player.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-medium text-slate-800 truncate">
                      {getGenderShortLabel(player.gender)} · {player.name}{' '}
                      <span className="font-mono text-slate-500 tabular-nums">
                        · {player.matchesPlayed}x main
                      </span>
                    </span>
                    <select
                      value=""
                      onChange={(e) =>
                        onAssignPlayerCourt(player.id, e.target.value)
                      }
                      aria-label={`Pilih lapangan untuk ${player.name}`}
                      className="text-xs bg-white border border-slate-300 rounded px-2 py-1"
                    >
                      <option value="">Pilih Lapangan</option>
                      {courts.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lapangan {c.number}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          )}

        {/* Resting Players Section */}
        {restingPlayers.length > 0 && (
          <div className="pt-3 mt-2 border-t border-slate-200 space-y-1.5">
            <div className="text-xs font-semibold text-slate-500 px-1">
              Sedang Istirahat ({restingPlayers.length})
            </div>
            {restingPlayers.map((player) => (
              <div
                key={player.id}
                className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 flex items-center justify-between gap-2 opacity-80"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {getGenderShortLabel(player.gender)}
                    </span>
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {player.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0 whitespace-nowrap">
                      ({player.matchesPlayed}x)
                    </span>
                  </div>
                  <div
                    className="text-[11px] font-mono text-slate-400 tabular-nums"
                    title={LEVEL_DESCRIPTIONS[player.level] ?? ''}
                  >
                    Lv.{player.level} · {LEVEL_LABELS[player.level] ?? ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleActive(player.id)}
                  aria-label={`Aktifkan kembali ${player.name}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-white border border-slate-200 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Siap Main</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
