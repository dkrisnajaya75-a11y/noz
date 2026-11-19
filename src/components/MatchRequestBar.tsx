import { useMemo, useState } from 'react';
import { Swords, Users, X } from 'lucide-react';
import {
  Court,
  MatchRequest,
  MatchRequestType,
  Player,
} from '../types/badminton';
import { getGenderShortLabel } from '../utils/genderStyle';
import { isRequestFulfilledInLineup } from '../utils/scheduler';

interface MatchRequestBarProps {
  players: Player[];
  courts: Court[];
  requests: MatchRequest[];
  onAddRequest: (
    type: MatchRequestType,
    playerAId: string,
    playerBId: string
  ) => void;
  onRemoveRequest: (requestId: string) => void;
}

export function MatchRequestBar({
  players,
  courts,
  requests,
  onAddRequest,
  onRemoveRequest,
}: MatchRequestBarProps) {
  const [requestType, setRequestType] = useState<MatchRequestType>('teammate');
  const [playerAId, setPlayerAId] = useState<string>('');
  const [playerBId, setPlayerBId] = useState<string>('');

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [players]);

  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );

  const effectivePlayerAId =
    playerAId && playersById.has(playerAId)
      ? playerAId
      : sortedPlayers[0]?.id ?? '';

  const effectivePlayerBId =
    playerBId &&
    playersById.has(playerBId) &&
    playerBId !== effectivePlayerAId
      ? playerBId
      : sortedPlayers.find((p) => p.id !== effectivePlayerAId)?.id ?? '';

  const canSubmit =
    sortedPlayers.length >= 2 &&
    Boolean(effectivePlayerAId) &&
    Boolean(effectivePlayerBId) &&
    effectivePlayerAId !== effectivePlayerBId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAddRequest(requestType, effectivePlayerAId, effectivePlayerBId);
  };

  const getFulfillmentStatus = (req: MatchRequest): {
    label: string;
    tone: 'playing' | 'open' | 'waiting';
  } => {
    for (const court of courts) {
      if (isRequestFulfilledInLineup(req, court.lineup)) {
        if (court.status === 'playing') {
          return {
            label: `Sedang Main · ${court.name}`,
            tone: 'playing',
          };
        }
        return {
          label: `Terpenuhi · ${court.name}`,
          tone: 'open',
        };
      }
    }
    const pA = playersById.get(req.playerAId);
    const pB = playersById.get(req.playerBId);
    if (!pA?.isActive || !pB?.isActive) {
      return { label: 'Menunggu pemain aktif', tone: 'waiting' };
    }
    return { label: 'Menunggu giliran', tone: 'waiting' };
  };

  return (
    <section
      aria-label="Request satu tim dan lawan"
      className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Request Satu Tim &amp; Lawan
          </h2>
          <p className="text-xs text-slate-500">
            Atur pasangan satu tim atau lawan tanding yang diprioritaskan pada saran otomatis berikutnya.
          </p>
        </div>

        <div
          role="group"
          aria-label="Jenis request"
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0"
        >
          <button
            type="button"
            onClick={() => setRequestType('teammate')}
            aria-pressed={requestType === 'teammate'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              requestType === 'teammate'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Request Satu Tim</span>
          </button>
          <button
            type="button"
            onClick={() => setRequestType('opponent')}
            aria-pressed={requestType === 'opponent'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              requestType === 'opponent'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Swords className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Request Lawan</span>
          </button>
        </div>
      </div>

      {sortedPlayers.length < 2 ? (
        <p className="text-xs text-slate-500">
          Tambahkan minimal 2 pemain untuk membuat request satu tim atau lawan.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-center gap-2"
        >
          <select
            value={effectivePlayerAId}
            onChange={(e) => setPlayerAId(e.target.value)}
            aria-label="Pilih pemain pertama untuk request"
            className="min-w-0 flex-1 sm:min-w-[160px] text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            {sortedPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {getGenderShortLabel(p.gender)} · {p.name} ({p.matchesPlayed}x)
                {!p.isActive ? ' [Istirahat]' : ''}
              </option>
            ))}
          </select>

          <span
            className={`px-2 py-1 text-xs font-mono font-bold rounded-md shrink-0 ${
              requestType === 'teammate'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {requestType === 'teammate' ? '1 TIM' : 'VS'}
          </span>

          <select
            value={effectivePlayerBId}
            onChange={(e) => setPlayerBId(e.target.value)}
            aria-label="Pilih pemain kedua untuk request"
            className="min-w-0 flex-1 sm:min-w-[160px] text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            {sortedPlayers
              .filter((p) => p.id !== effectivePlayerAId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {getGenderShortLabel(p.gender)} · {p.name} ({p.matchesPlayed}x)
                  {!p.isActive ? ' [Istirahat]' : ''}
                </option>
              ))}
          </select>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer shrink-0 disabled:bg-slate-200 disabled:text-slate-400 ${
              requestType === 'teammate'
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {requestType === 'teammate'
              ? '+ Tambah Satu Tim'
              : '+ Tambah Lawan'}
          </button>
        </form>
      )}

      {requests.length > 0 && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
          {requests.map((req) => {
            const pA = playersById.get(req.playerAId);
            const pB = playersById.get(req.playerBId);
            if (!pA || !pB) return null;
            const status = getFulfillmentStatus(req);
            const isTeammate = req.type === 'teammate';

            return (
              <div
                key={req.id}
                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                  isTeammate
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <span
                  className={`font-semibold uppercase tracking-wide text-[10px] px-1.5 py-0.5 rounded ${
                    isTeammate
                      ? 'bg-emerald-700 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {isTeammate ? 'Satu Tim' : 'Lawan'}
                </span>
                <span className="font-semibold">
                  {pA.name}{' '}
                  <span className="font-mono font-normal opacity-75">
                    {isTeammate ? '&' : 'vs'}
                  </span>{' '}
                  {pB.name}
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    status.tone === 'waiting'
                      ? 'text-slate-600'
                      : 'text-emerald-800'
                  }`}
                >
                  · {status.label}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveRequest(req.id)}
                  aria-label={`Hapus request ${pA.name} ${
                    isTeammate ? 'satu tim' : 'lawan'
                  } ${pB.name}`}
                  title="Hapus request"
                  className="p-0.5 rounded hover:bg-black/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
