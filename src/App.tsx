import { useEffect, useMemo, useState } from 'react';
import {
  ActiveTab,
  AppState,
  Club,
  ClubSettings,
  Court,
  Gender,
  Player,
} from './types/badminton';
import { createInitialAppState } from './utils/seedData';
import { clampLevel } from './utils/genderStyle';
import {
  applyClubConfiguration,
  finishCourtMatch,
  getLineupPlayerIds,
  makeLineupSignature,
  reconcileOpenCourts,
  startCourtMatch,
  suggestLineupForCourt,
  swapSlotWithPlayerOrSlot,
} from './utils/scheduler';
import { TopNav } from './components/TopNav';
import { CourtCard, SwapSource } from './components/CourtCard';
import { WaitingQueue } from './components/WaitingQueue';
import { RosterView } from './components/RosterView';
import { RecordsView } from './components/RecordsView';
import { SettingsView } from './components/SettingsView';
import { BulkPasteModal } from './components/BulkPasteModal';

const STORAGE_KEY = 'noz_state_v2';

function loadInitialState(): AppState {
  try {
    window.localStorage.removeItem('noz_state_v1');
    window.localStorage.removeItem('koklapang_state_v1');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialAppState();
    const parsed = JSON.parse(raw) as AppState;
    if (
      parsed &&
      Array.isArray(parsed.clubs) &&
      parsed.clubs.length > 0 &&
      typeof parsed.activeClubId === 'string'
    ) {
      return {
        ...parsed,
        clubs: parsed.clubs.map((c) => ({
          ...c,
          players: Array.isArray(c.players)
            ? c.players.map((p) => ({
                ...p,
                level: clampLevel(p.level),
              }))
            : [],
          settings: {
            ...c.settings,
            genderMatching: c.settings?.genderMatching ?? 'free',
            sameGenderPercent:
              typeof c.settings?.sameGenderPercent === 'number'
                ? Math.max(0, Math.min(100, Math.round(c.settings.sameGenderPercent)))
                : 50,
          },
        })),
      };
    }
  } catch {
    // Ignore storage errors and use seed data
  }
  return createInitialAppState();
}

export default function App() {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<ActiveTab>('courts');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [swapSource, setSwapSource] = useState<SwapSource | null>(null);
  const [rerollHistory, setRerollHistory] = useState<Record<string, string[]>>({});

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  const activeClub = useMemo(
    () =>
      state.clubs.find((c) => c.id === state.activeClubId) ?? state.clubs[0],
    [state.clubs, state.activeClubId]
  );

  const playersById = useMemo(
    () => new Map(activeClub.players.map((p) => [p.id, p])),
    [activeClub.players]
  );

  const updateActiveClub = (updater: (club: Club) => Club) => {
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === activeClub.id ? updater(c) : c
      ),
    }));
  };

  const handleSelectClub = (clubId: string) => {
    setSwapSource(null);
    setRerollHistory({});
    setState((prev) => ({
      ...prev,
      activeClubId: clubId,
    }));
  };

  const handleStartMatch = (courtId: string) => {
    setSwapSource(null);
    setRerollHistory((prev) => ({ ...prev, [courtId]: [] }));
    updateActiveClub((club) => startCourtMatch(club, courtId));
  };

  const handleFinishMatch = (courtId: string) => {
    setSwapSource(null);
    setRerollHistory((prev) => ({ ...prev, [courtId]: [] }));
    updateActiveClub((club) => finishCourtMatch(club, courtId));
  };

  const handleRerollCourt = (courtId: string) => {
    setSwapSource(null);
    const court = activeClub.courts.find((c) => c.id === courtId);
    if (!court || court.status !== 'open') return;

    const currentSig = makeLineupSignature(court.lineup);
    const prevHistory = rerollHistory[courtId] ?? [];
    const seen = Array.from(new Set([...prevHistory, currentSig]));

    const nextLineup = suggestLineupForCourt(activeClub, courtId, seen);
    const nextSig = makeLineupSignature(nextLineup);

    // If we cycled back to start, reset history to just the newly chosen signature
    const updatedSeen = seen.includes(nextSig) ? [nextSig] : [...seen, nextSig];
    setRerollHistory((prev) => ({ ...prev, [courtId]: updatedSeen }));

    updateActiveClub((club) => ({
      ...club,
      courts: club.courts.map((c) =>
        c.id === courtId ? { ...c, lineup: nextLineup } : c
      ),
    }));
  };

  const handleTogglePin = (courtId: string, playerId: string) => {
    updateActiveClub((club) => {
      const target = club.courts.find((c) => c.id === courtId);
      if (!target) return club;
      const exists = target.pinnedPlayerIds.includes(playerId);
      const nextPins = exists
        ? target.pinnedPlayerIds.filter((id) => id !== playerId)
        : [...target.pinnedPlayerIds, playerId].slice(0, 4);

      const updated: Club = {
        ...club,
        courts: club.courts.map((c) => {
          if (c.id === courtId) {
            return { ...c, pinnedPlayerIds: nextPins };
          }
          // Remove pin from other courts if pinning here
          if (!exists && c.pinnedPlayerIds.includes(playerId)) {
            return {
              ...c,
              pinnedPlayerIds: c.pinnedPlayerIds.filter((id) => id !== playerId),
            };
          }
          return c;
        }),
      };

      return updated;
    });
  };

  const handlePinPlayerToCourt = (courtId: string, playerId: string) => {
    updateActiveClub((club) => {
      const target = club.courts.find((c) => c.id === courtId);
      if (!target || target.status !== 'open') return club;

      const updated: Club = {
        ...club,
        courts: club.courts.map((c) => {
          if (c.id === courtId) {
            const nextPins = c.pinnedPlayerIds.includes(playerId)
              ? c.pinnedPlayerIds
              : [...c.pinnedPlayerIds, playerId].slice(0, 4);
            // Clear lineup so reconcileOpenCourts immediately includes the pinned player
            return {
              ...c,
              pinnedPlayerIds: nextPins,
              lineup: { teamA: [null, null], teamB: [null, null] },
            };
          }
          return {
            ...c,
            pinnedPlayerIds: c.pinnedPlayerIds.filter((id) => id !== playerId),
            lineup:
              c.status === 'open' && getLineupPlayerIds(c.lineup).includes(playerId)
                ? { teamA: [null, null], teamB: [null, null] }
                : c.lineup,
          };
        }),
      };

      return reconcileOpenCourts(updated);
    });
  };

  const handleSelectSlotForSwap = (
    courtId: string,
    slotIndex: 0 | 1 | 2 | 3
  ) => {
    const targetCourt = activeClub.courts.find((c) => c.id === courtId);
    if (!targetCourt) return;

    // Clicking the same source slot cancels swap mode
    if (
      swapSource &&
      swapSource.courtId === courtId &&
      swapSource.slotIndex === slotIndex
    ) {
      setSwapSource(null);
      return;
    }

    // Clicking another slot on the SAME court swaps them immediately
    if (swapSource && swapSource.courtId === courtId) {
      updateActiveClub((club) =>
        swapSlotWithPlayerOrSlot(club, courtId, swapSource.slotIndex, {
          type: 'slot',
          slotIndex,
        })
      );
      setSwapSource(null);
      return;
    }

    // Clicking a slot on a DIFFERENT court swaps players across courts if both open, or sets new source
    if (swapSource && swapSource.courtId !== courtId) {
      const sourceCourt = activeClub.courts.find(
        (c) => c.id === swapSource.courtId
      );
      const sourceSlots = sourceCourt
        ? [
            sourceCourt.lineup.teamA[0],
            sourceCourt.lineup.teamA[1],
            sourceCourt.lineup.teamB[0],
            sourceCourt.lineup.teamB[1],
          ]
        : [];
      const targetSlots = [
        targetCourt.lineup.teamA[0],
        targetCourt.lineup.teamA[1],
        targetCourt.lineup.teamB[0],
        targetCourt.lineup.teamB[1],
      ];
      const sourcePlayerId = sourceSlots[swapSource.slotIndex];
      const targetPlayerId = targetSlots[slotIndex];

      if (sourceCourt && sourcePlayerId) {
        updateActiveClub((club) => ({
          ...club,
          courts: club.courts.map((c) => {
            if (c.id === sourceCourt.id) {
              const next = [...sourceSlots];
              next[swapSource.slotIndex] = targetPlayerId;
              return {
                ...c,
                lineup: {
                  teamA: [next[0], next[1]],
                  teamB: [next[2], next[3]],
                },
              };
            }
            if (c.id === targetCourt.id) {
              const next = [...targetSlots];
              next[slotIndex] = sourcePlayerId;
              return {
                ...c,
                lineup: {
                  teamA: [next[0], next[1]],
                  teamB: [next[2], next[3]],
                },
              };
            }
            return c;
          }),
        }));
        setSwapSource(null);
        return;
      }
    }

    // Initiate swap mode from this slot
    const slots = [
      targetCourt.lineup.teamA[0],
      targetCourt.lineup.teamA[1],
      targetCourt.lineup.teamB[0],
      targetCourt.lineup.teamB[1],
    ];
    const pid = slots[slotIndex];
    const playerName = pid
      ? playersById.get(pid)?.name ?? 'Pemain'
      : 'Slot Kosong';

    setSwapSource({ courtId, slotIndex, playerName });
  };

  const handleSwapWithPlayer = (playerId: string) => {
    if (!swapSource) return;
    updateActiveClub((club) =>
      swapSlotWithPlayerOrSlot(club, swapSource.courtId, swapSource.slotIndex, {
        type: 'player',
        playerId,
      })
    );
    setSwapSource(null);
  };

  const handleSetCourtCount = (desiredCount: number) => {
    const clamped = Math.max(1, Math.min(12, desiredCount));
    setSwapSource(null);

    updateActiveClub((club) => {
      if (clamped === club.courts.length) return club;

      let nextCourts: Court[];
      if (clamped > club.courts.length) {
        const added: Court[] = [];
        for (let num = club.courts.length + 1; num <= clamped; num++) {
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
      } else {
        // Remove from the end, renumber cleanly
        nextCourts = club.courts.slice(0, clamped).map((c, idx) => ({
          ...c,
          number: idx + 1,
          name: `Lapangan ${idx + 1}`,
        }));
      }

      const validCourtIds = new Set(nextCourts.map((c) => c.id));
      const fallbackCourtId = nextCourts[0]?.id ?? null;

      const updatedPlayers = club.players.map((p) =>
        p.assignedCourtId && !validCourtIds.has(p.assignedCourtId)
          ? { ...p, assignedCourtId: fallbackCourtId }
          : p
      );

      return reconcileOpenCourts({
        ...club,
        courts: nextCourts,
        players: updatedPlayers,
      });
    });
  };

  const handleRemoveSpecificCourt = (courtId: string) => {
    if (activeClub.courts.length <= 1) return;
    setSwapSource(null);

    updateActiveClub((club) => {
      const remaining = club.courts
        .filter((c) => c.id !== courtId)
        .map((c, idx) => ({
          ...c,
          number: idx + 1,
          name: `Lapangan ${idx + 1}`,
        }));
      const fallbackCourtId = remaining[0]?.id ?? null;

      const updatedPlayers = club.players.map((p) =>
        p.assignedCourtId === courtId
          ? { ...p, assignedCourtId: fallbackCourtId }
          : p
      );

      return reconcileOpenCourts({
        ...club,
        courts: remaining,
        players: updatedPlayers,
      });
    });
  };

  const handleAddPlayer = (name: string, gender: Gender, level: number) => {
    updateActiveClub((club) => {
      const newPlayer: Player = {
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        gender,
        level,
        isActive: true,
        assignedCourtId: club.courts[0]?.id ?? null,
        matchesPlayed: 0,
        lastPlayedAt: 0,
      };
      return reconcileOpenCourts({
        ...club,
        players: [...club.players, newPlayer],
      });
    });
  };

  const handleBulkImportPlayers = (
    imported: Array<{ name: string; gender: Gender; level: number }>
  ) => {
    updateActiveClub((club) => {
      const courtCount = Math.max(1, club.courts.length);
      const newPlayers: Player[] = imported.map((item, idx) => ({
        id: `p_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        gender: item.gender,
        level: item.level,
        isActive: true,
        assignedCourtId: club.courts[idx % courtCount]?.id ?? null,
        matchesPlayed: 0,
        lastPlayedAt: 0,
      }));
      return reconcileOpenCourts({
        ...club,
        players: [...club.players, ...newPlayers],
      });
    });
  };

  const handleRemovePlayer = (playerId: string) => {
    setSwapSource(null);
    updateActiveClub((club) => {
      const updatedCourts = club.courts.map((c) => ({
        ...c,
        pinnedPlayerIds: c.pinnedPlayerIds.filter((id) => id !== playerId),
        lineup: {
          teamA: [
            c.lineup.teamA[0] === playerId ? null : c.lineup.teamA[0],
            c.lineup.teamA[1] === playerId ? null : c.lineup.teamA[1],
          ] as [string | null, string | null],
          teamB: [
            c.lineup.teamB[0] === playerId ? null : c.lineup.teamB[0],
            c.lineup.teamB[1] === playerId ? null : c.lineup.teamB[1],
          ] as [string | null, string | null],
        },
      }));

      return reconcileOpenCourts({
        ...club,
        players: club.players.filter((p) => p.id !== playerId),
        courts: updatedCourts,
      });
    });
  };

  const handleUpdatePlayer = (
    playerId: string,
    updates: Partial<
      Pick<Player, 'name' | 'gender' | 'level' | 'isActive' | 'assignedCourtId'>
    >
  ) => {
    updateActiveClub((club) => {
      const updatedPlayers = club.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      );
      return reconcileOpenCourts({
        ...club,
        players: updatedPlayers,
      });
    });
  };

  const handleTogglePlayerActive = (playerId: string) => {
    const player = playersById.get(playerId);
    if (!player) return;
    handleUpdatePlayer(playerId, { isActive: !player.isActive });
  };

  const handleAssignPlayerCourt = (
    playerId: string,
    courtId: string | null
  ) => {
    handleUpdatePlayer(playerId, { assignedCourtId: courtId });
  };


  const handleSaveClubChanges = (config: {
    settings: ClubSettings;
    courtCount: number;
    clubName: string;
  }) => {
    setRerollHistory({});
    setSwapSource(null);
    updateActiveClub((club) => applyClubConfiguration(club, config));
  };

  const handleCreateClub = (name: string, courtCount: number) => {
    const clamped = Math.max(1, Math.min(12, courtCount));
    const id = `club_${Date.now()}`;
    const newCourts: Court[] = Array.from({ length: clamped }, (_, i) => ({
      id: `${id}_court_${i + 1}`,
      number: i + 1,
      name: `Lapangan ${i + 1}`,
      status: 'open',
      lineup: { teamA: [null, null], teamB: [null, null] },
      pinnedPlayerIds: [],
      startedAt: null,
    }));

    const newClub: Club = {
      id,
      name,
      players: [],
      courts: newCourts,
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

    setState((prev) => ({
      clubs: [...prev.clubs, newClub],
      activeClubId: id,
    }));
    setActiveTab('roster');
  };

  const handleRenameClub = (clubId: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === clubId ? { ...c, name: newName } : c
      ),
    }));
  };

  const handleDeleteClub = (clubId: string) => {
    if (state.clubs.length <= 1) return;
    setState((prev) => {
      const remaining = prev.clubs.filter((c) => c.id !== clubId);
      const nextActiveId =
        prev.activeClubId === clubId ? remaining[0].id : prev.activeClubId;
      return {
        clubs: remaining,
        activeClubId: nextActiveId,
      };
    });
  };

  const handleResetRecords = () => {
    setRerollHistory({});
    updateActiveClub((club) =>
      reconcileOpenCourts({
        ...club,
        records: [],
        sequenceCounter: 0,
        players: club.players.map((p) => ({
          ...p,
          matchesPlayed: 0,
          lastPlayedAt: 0,
        })),
        courts: club.courts.map((c) =>
          c.status === 'open'
            ? { ...c, lineup: { teamA: [null, null], teamB: [null, null] } }
            : c
        ),
      })
    );
  };

  const courtGridCols =
    activeClub.courts.length === 1
      ? 'grid-cols-1 max-w-2xl'
      : activeClub.courts.length <= 4
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSwapSource(null);
          setActiveTab(tab);
        }}
        clubs={state.clubs}
        activeClub={activeClub}
        onSelectClub={handleSelectClub}
        onAddCourt={() => handleSetCourtCount(activeClub.courts.length + 1)}
        onOpenBulkImport={() => setIsBulkModalOpen(true)}
        onNavigateToNewClub={() => setActiveTab('settings')}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'courts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 xl:col-span-9 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Lapangan {activeClub.name}
                </h1>
                <p className="text-xs text-slate-500">
                  Ketuk Tukar untuk mengganti pemain, atau Sematkan untuk menahan pemain di lapangan.
                </p>
              </div>

              {activeClub.players.length < 4 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-amber-900">
                    Klub ini baru memiliki{' '}
                    <strong className="font-mono">{activeClub.players.length}</strong>{' '}
                    pemain. Tambahkan minimal 4 pemain agar saran otomatis lapangan aktif.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Tempel Daftar Pemain
                  </button>
                </div>
              )}

              <div className={`grid gap-4 ${courtGridCols}`}>
                {activeClub.courts.map((court) => (
                  <CourtCard
                    key={court.id}
                    court={court}
                    playersById={playersById}
                    genderStyle={activeClub.settings.genderStyle}
                    canRemoveCourt={activeClub.courts.length > 1}
                    swapSource={swapSource}
                    onStartMatch={handleStartMatch}
                    onFinishMatch={handleFinishMatch}
                    onRerollCourt={handleRerollCourt}
                    onTogglePin={handleTogglePin}
                    onSelectSlotForSwap={handleSelectSlotForSwap}
                    onRemoveCourt={handleRemoveSpecificCourt}
                  />
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-4">
              <WaitingQueue
                players={activeClub.players}
                courts={activeClub.courts}
                queueMode={activeClub.settings.queueMode}
                genderStyle={activeClub.settings.genderStyle}
                swapSource={swapSource}
                onCancelSwap={() => setSwapSource(null)}
                onSwapWithPlayer={handleSwapWithPlayer}
                onToggleActive={handleTogglePlayerActive}
                onAssignPlayerCourt={handleAssignPlayerCourt}
                onPinPlayerToCourt={handlePinPlayerToCourt}
                onQuickAddPlayer={handleAddPlayer}
              />
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <RosterView
            players={activeClub.players}
            courts={activeClub.courts}
            queueMode={activeClub.settings.queueMode}
            genderStyle={activeClub.settings.genderStyle}
            onAddPlayer={handleAddPlayer}
            onRemovePlayer={handleRemovePlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onOpenBulkImport={() => setIsBulkModalOpen(true)}
          />
        )}

        {activeTab === 'records' && (
          <RecordsView club={activeClub} onResetRecords={handleResetRecords} />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            key={activeClub.id}
            clubs={state.clubs}
            activeClub={activeClub}
            onSaveChanges={handleSaveClubChanges}
            onCreateClub={handleCreateClub}
            onRenameClub={handleRenameClub}
            onDeleteClub={handleDeleteClub}
          />
        )}
      </main>

      <BulkPasteModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        existingNames={activeClub.players.map((p) => p.name)}
        onImportPlayers={handleBulkImportPlayers}
      />
    </div>
  );
}
