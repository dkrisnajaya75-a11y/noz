import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Upload } from 'lucide-react';
import {
  Court,
  Gender,
  GenderStyle,
  Player,
  QueueMode,
} from '../types/badminton';
import {
  getGenderFullLabel,
  getGenderLabelClasses,
  getGenderShortLabel,
  LEVEL_DESCRIPTIONS,
  LEVEL_LABELS,
  LEVEL_OPTIONS,
} from '../utils/genderStyle';

interface RosterViewProps {
  players: Player[];
  courts: Court[];
  queueMode: QueueMode;
  genderStyle: GenderStyle;
  onAddPlayer: (name: string, gender: Gender, level: number) => void;
  onRemovePlayer: (playerId: string) => void;
  onUpdatePlayer: (
    playerId: string,
    updates: Partial<Pick<Player, 'name' | 'gender' | 'level' | 'isActive' | 'assignedCourtId'>>
  ) => void;
  onOpenBulkImport: () => void;
}

export function RosterView({
  players,
  courts,
  queueMode,
  genderStyle,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayer,
  onOpenBulkImport,
}: RosterViewProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [level, setLevel] = useState(2);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | Gender>('ALL');

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (genderFilter !== 'ALL' && p.gender !== genderFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [players, search, genderFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddPlayer(trimmed, gender, level);
    setName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftar Pemain Klub
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Kelola nama, gender, level kemampuan, dan status kesiapan pemain di klub ini.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenBulkImport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          <span>Tempel Daftar (Impor Massal)</span>
        </button>
      </div>

      {/* Add Single Player Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5"
      >
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Tambah Pemain Baru
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label
              htmlFor="roster-name-input"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Nama Pemain
            </label>
            <input
              id="roster-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Hendra Setiawan"
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="roster-gender-select"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Gender
            </label>
            <select
              id="roster-gender-select"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="M">L (Laki-laki)</option>
              <option value="F">P (Perempuan)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="roster-level-select"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Level Kemampuan
            </label>
            <select
              id="roster-level-select"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              {[1, 2, 3].map((lv) => (
                <option key={lv} value={lv}>
                  {lv} - {LEVEL_LABELS[lv]}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {LEVEL_OPTIONS.map((opt) => (
            <div
              key={opt.level}
              className="rounded-lg bg-slate-50 border border-slate-200/80 px-3 py-2 text-xs"
            >
              <div className="font-semibold text-slate-800">
                {opt.level} - {opt.label}
              </div>
              <div className="text-slate-600 mt-0.5">{opt.description}</div>
            </div>
          ))}
        </div>
      </form>

      {/* Search & Filter Toolbar */}
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
              aria-label="Cari nama pemain"
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'ALL', label: `Semua (${players.length})` },
              {
                id: 'M',
                label: `L (${players.filter((p) => p.gender === 'M').length})`,
              },
              {
                id: 'F',
                label: `P (${players.filter((p) => p.gender === 'F').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGenderFilter(tab.id as 'ALL' | Gender)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer tabular-nums ${
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

        {/* Roster Table */}
        {filteredPlayers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {players.length === 0
              ? 'Belum ada pemain di klub ini. Tambahkan pemain di atas atau tempel daftar.'
              : 'Tidak ada pemain yang cocok dengan pencarian Anda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Nama Pemain</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Level</th>
                  {queueMode === 'split' && (
                    <th className="py-3 px-4">Antrean Lapangan</th>
                  )}
                  <th className="py-3 px-4 text-right">Main</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlayers.map((player) => {
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
                      className={`hover:bg-slate-50/90 transition-colors ${rowTint}`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
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
                          <span className="text-xs font-mono font-normal text-slate-500 tabular-nums whitespace-nowrap">
                            · {player.matchesPlayed}x main
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={player.gender}
                          onChange={(e) =>
                            onUpdatePlayer(player.id, {
                              gender: e.target.value as Gender,
                            })
                          }
                          aria-label={`Ubah gender ${player.name}`}
                          className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 cursor-pointer"
                        >
                          <option value="M">Laki-laki</option>
                          <option value="F">Perempuan</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={player.level}
                          onChange={(e) =>
                            onUpdatePlayer(player.id, {
                              level: Number(e.target.value),
                            })
                          }
                          aria-label={`Ubah level ${player.name}`}
                          title={LEVEL_DESCRIPTIONS[player.level] ?? ''}
                          className="text-xs font-mono bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 cursor-pointer tabular-nums"
                        >
                          {[1, 2, 3].map((lv) => (
                            <option key={lv} value={lv}>
                              Lv.{lv} ({LEVEL_LABELS[lv]})
                            </option>
                          ))}
                        </select>
                      </td>
                      {queueMode === 'split' && (
                        <td className="py-2.5 px-4">
                          <select
                            value={player.assignedCourtId ?? ''}
                            onChange={(e) =>
                              onUpdatePlayer(player.id, {
                                assignedCourtId: e.target.value || null,
                              })
                            }
                            aria-label={`Pilih antrean lapangan untuk ${player.name}`}
                            className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 cursor-pointer"
                          >
                            <option value="">Belum dipilih</option>
                            {courts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {player.matchesPlayed}x
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePlayer(player.id, {
                              isActive: !player.isActive,
                            })
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                            player.isActive
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {player.isActive ? 'Siap Main' : 'Istirahat'}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onRemovePlayer(player.id)}
                          aria-label={`Hapus ${player.name}`}
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
