import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Club, Player } from '../types/badminton';
import {
  buildPairStats,
  computeEvennessStats,
  makePairKey,
} from '../utils/scheduler';
import { getGenderShortLabel } from '../utils/genderStyle';

interface RecordsViewProps {
  club: Club;
  onResetRecords: () => void;
}

export function RecordsView({ club, onResetRecords }: RecordsViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('ALL');
  const [confirmReset, setConfirmReset] = useState(false);

  const playersById = useMemo(
    () => new Map(club.players.map((p) => [p.id, p])),
    [club.players]
  );

  const evenness = useMemo(() => computeEvennessStats(club), [club]);
  const pairStats = useMemo(() => buildPairStats(club.records), [club.records]);

  const sortedByMatches = useMemo(() => {
    return [...club.players].sort((a, b) => {
      if (b.matchesPlayed !== a.matchesPlayed) {
        return b.matchesPlayed - a.matchesPlayed;
      }
      return a.name.localeCompare(b.name);
    });
  }, [club.players]);

  const maxMatchesBar = Math.max(
    1,
    ...club.players.map((p) => p.matchesPlayed)
  );

  // Pair breakdown rows (who played with/against whom)
  const pairRows = useMemo(() => {
    const rows: Array<{
      playerA: Player;
      playerB: Player;
      partnerCount: number;
      opponentCount: number;
      totalInteractions: number;
    }> = [];

    for (let i = 0; i < club.players.length; i++) {
      for (let j = i + 1; j < club.players.length; j++) {
        const pA = club.players[i];
        const pB = club.players[j];
        if (
          selectedPlayerId !== 'ALL' &&
          pA.id !== selectedPlayerId &&
          pB.id !== selectedPlayerId
        ) {
          continue;
        }
        const key = makePairKey(pA.id, pB.id);
        const partnerCount = pairStats.partnerCounts.get(key) ?? 0;
        const opponentCount = pairStats.opponentCounts.get(key) ?? 0;
        if (partnerCount === 0 && opponentCount === 0) continue;

        rows.push({
          playerA: pA,
          playerB: pB,
          partnerCount,
          opponentCount,
          totalInteractions: partnerCount + opponentCount,
        });
      }
    }

    rows.sort((a, b) => {
      if (b.totalInteractions !== a.totalInteractions) {
        return b.totalInteractions - a.totalInteractions;
      }
      return b.partnerCount - a.partnerCount;
    });

    return rows;
  }, [club.players, pairStats, selectedPlayerId]);

  const recentMatches = useMemo(
    () => [...club.records].reverse(),
    [club.records]
  );

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Catatan &amp; Pemerataan Pertandingan
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pantau siapa bermain dengan siapa, frekuensi pasangan/lawan, dan seberapa merata jumlah main pemain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={club.records.length === 0 && club.players.every((p) => p.matchesPlayed === 0)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Catatan Sesi</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-medium text-rose-900">
                Hapus riwayat &amp; nolkan hitungan main?
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetRecords();
                  setConfirmReset(false);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded cursor-pointer"
              >
                Ya, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1 text-xs font-medium text-slate-700 hover:underline cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4-column Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Total Pertandingan
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {evenness.totalMatches}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Rata-Rata Main / Pemain
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {evenness.averageMatches}x
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Rentang Main (Min – Maks)
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {evenness.minMatches} – {evenness.maxMatches}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Pemerataan Jumlah Main
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            {evenness.evennessPercent}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Match Count Evenness Breakdown */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Distribusi Jumlah Main
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan jumlah pertandingan tiap pemain di sesi ini.
            </p>
          </div>
          <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto">
            {sortedByMatches.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                Belum ada pemain di klub ini.
              </p>
            ) : (
              sortedByMatches.map((p) => {
                const widthPct = Math.round(
                  (p.matchesPlayed / maxMatchesBar) * 100
                );
                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate pr-2">
                        <span className="font-mono text-slate-500 mr-1.5">
                          {getGenderShortLabel(p.gender)}
                        </span>
                        {p.name}
                        {!p.isActive && (
                          <span className="text-slate-400 ml-1.5">(Istirahat)</span>
                        )}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        {p.matchesPlayed}x
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          p.matchesPlayed === evenness.minMatches &&
                          evenness.maxMatches > evenness.minMatches
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.max(widthPct, p.matchesPlayed > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right: Who's Played With Whom */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Siapa Bermain Dengan Siapa
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Frekuensi bermain sebagai rekan satu tim maupun lawan tanding.
              </p>
            </div>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              aria-label="Filter pasangan berdasarkan pemain"
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 cursor-pointer"
            >
              <option value="ALL">Semua Pasangan</option>
              {club.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {pairRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Belum ada catatan pasangan atau lawan yang terekam.
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Pasangan Pemain</th>
                    <th className="py-2.5 px-4 text-right">Rekan Tim</th>
                    <th className="py-2.5 px-4 text-right">Lawan</th>
                    <th className="py-2.5 px-4 text-right">Total Bertemu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pairRows.map((row) => (
                    <tr
                      key={`${row.playerA.id}_${row.playerB.id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {row.playerA.name}{' '}
                        <span className="text-slate-400 font-normal">&amp;</span>{' '}
                        {row.playerB.name}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                        {row.partnerCount}x
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {row.opponentCount}x
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                        {row.totalInteractions}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Chronological Match Log */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Riwayat Pertandingan Terbaru
          </h2>
        </div>
        {recentMatches.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Belum ada pertandingan yang diselesaikan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Lapangan</th>
                  <th className="py-2.5 px-4">Tim A</th>
                  <th className="py-2.5 px-4">Tim B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentMatches.map((rec) => {
                  const a1 = playersById.get(rec.teamA[0])?.name ?? 'Pemain Dihapus';
                  const a2 = playersById.get(rec.teamA[1])?.name ?? 'Pemain Dihapus';
                  const b1 = playersById.get(rec.teamB[0])?.name ?? 'Pemain Dihapus';
                  const b2 = playersById.get(rec.teamB[1])?.name ?? 'Pemain Dihapus';
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                        {formatTime(rec.timestamp)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        {rec.courtName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-900">
                        {a1} / {a2}
                      </td>
                      <td className="py-2.5 px-4 text-slate-900">
                        {b1} / {b2}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
